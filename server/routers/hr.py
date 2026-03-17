from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Query
from sqlalchemy.orm import Session, aliased, joinedload
from sqlalchemy import func, or_, and_
from core.database import get_db
from models import hr_models, core_models, employee_models
from core.auth import get_current_user, require_permission
from services.zk_service import ZkTecoService
from services.import_service import EmployeeImportService
import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

# Define permissions
PERM_HR_READ = "hr_read"
PERM_HR_WRITE = "hr_write"

router = APIRouter(prefix="/hr", tags=["HR Management"])

# Simple in-process cache for HR dashboard to reduce load on heavy queries
_dashboard_cache: dict = {"key": None, "timestamp": None, "data": None}

@router.get("/dashboard")
def get_hr_dashboard(
    db: Session = Depends(get_db), 
    department: str = Query(None),
    shift: str = Query(None),
    current_user = Depends(get_current_user)
):
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"📊 HR Dashboard request from user: {current_user.email}")
    
    # Handle Query object if called directly in tests
    if hasattr(department, 'default'): department = None
    if hasattr(shift, 'default'): shift = None

    # Cache key and lookup (per department/shift)
    cache_key = f"{department or ''}:{shift or ''}"
    now = datetime.datetime.utcnow()
    if (
        _dashboard_cache["key"] == cache_key
        and _dashboard_cache["timestamp"] is not None
        and (now - _dashboard_cache["timestamp"]).total_seconds() < 60
    ):
        return _dashboard_cache["data"]

    # Simple stats
    today = datetime.date.today()
    emp_query = db.query(employee_models.Employee).filter(employee_models.Employee.status == 'active')
    
    if department:
        emp_query = emp_query.filter(employee_models.Employee.department_id == department)
    
    if shift:
        # Join with EmployeeShiftAssignment and WorkShift to filter by shift
        emp_query = emp_query.join(
            hr_models.EmployeeShiftAssignment,
            employee_models.Employee.id == hr_models.EmployeeShiftAssignment.employee_id
        ).join(
            hr_models.WorkShift,
            hr_models.EmployeeShiftAssignment.shift_id == hr_models.WorkShift.id
        ).filter(
            hr_models.WorkShift.name.ilike(f"%{shift}%"),
            or_(
                hr_models.EmployeeShiftAssignment.end_date == None,
                hr_models.EmployeeShiftAssignment.end_date >= today
            )
        )
    
    active_employees = emp_query.all()
    total_employees = len(active_employees)
    
    # Attendance today (use index-friendly timestamp range)
    today_start = datetime.datetime.combine(today, datetime.time.min)
    today_end = today_start + datetime.timedelta(days=1)
    today_logs_query = db.query(hr_models.AttendanceLog).filter(
        hr_models.AttendanceLog.timestamp >= today_start,
        hr_models.AttendanceLog.timestamp < today_end
    )
    
    if department or shift:
        today_logs_query = today_logs_query.join(
            employee_models.Employee, 
            or_(
                hr_models.AttendanceLog.employee_pk == employee_models.Employee.id,
                hr_models.AttendanceLog.employee_id == employee_models.Employee.code
            )
        )
        
        if department:
            today_logs_query = today_logs_query.filter(employee_models.Employee.department_id == department)
            
        if shift:
            today_logs_query = today_logs_query.join(
                hr_models.EmployeeShiftAssignment,
                employee_models.Employee.id == hr_models.EmployeeShiftAssignment.employee_id
            ).join(
                hr_models.WorkShift,
                hr_models.EmployeeShiftAssignment.shift_id == hr_models.WorkShift.id
            ).filter(
                hr_models.WorkShift.name.ilike(f"%{shift}%"),
                or_(
                    hr_models.EmployeeShiftAssignment.end_date == None,
                    hr_models.EmployeeShiftAssignment.end_date >= today
                )
            )
        
    today_logs = today_logs_query.all()
    
    present_ids = set(log.employee_id for log in today_logs)
    present_count = len(present_ids)
    
    # Calculate late, early leave
    late_count = 0
    early_leave_count = 0
    
    for log in today_logs:
        if log.status == 'late':
            late_count += 1
        elif log.status == 'early_leave':
            early_leave_count += 1

    # Currently in
    currently_in_count = 0
    # Group logs by employee to find the last check-in without a corresponding check-out
    emp_logs = {}
    for log in today_logs:
        if log.employee_id not in emp_logs:
            emp_logs[log.employee_id] = []
        emp_logs[log.employee_id].append(log)
    
    for eid, logs in emp_logs.items():
        # Sort logs by timestamp
        sorted_logs = sorted(logs, key=lambda x: x.timestamp)
        if sorted_logs and sorted_logs[-1].type == 'check_in':
            currently_in_count += 1

    # Improved absent count - pre-fetch assignments
    day_name = today.strftime('%A')
    
    # Pre-fetch assignments for all active employees to avoid N+1 queries
    all_assignments = db.query(hr_models.EmployeeShiftAssignment).filter(
        hr_models.EmployeeShiftAssignment.start_date <= today,
        or_(hr_models.EmployeeShiftAssignment.end_date == None, hr_models.EmployeeShiftAssignment.end_date >= today)
    ).all()
    
    assignment_map = {a.employee_id: a for a in all_assignments}
    
    # Pre-fetch recent checkins for holiday pay calculation in one go
    seven_days_ago = today - datetime.timedelta(days=6)
    recent_checkins_all = db.query(
        hr_models.AttendanceLog.employee_id,
        func.count(func.distinct(func.date(hr_models.AttendanceLog.timestamp))).label('work_days')
    ).filter(
        hr_models.AttendanceLog.type == 'check_in',
        func.date(hr_models.AttendanceLog.timestamp) >= seven_days_ago,
        func.date(hr_models.AttendanceLog.timestamp) < today
    ).group_by(hr_models.AttendanceLog.employee_id).all()
    
    recent_work_days_map = {r.employee_id: r.work_days for r in recent_checkins_all}

    absent_count = 0
    for emp in active_employees:
        if emp.code in present_ids:
            continue
            
        # Check if today is a holiday
        assignment = assignment_map.get(emp.id)
        
        is_holiday = False
        if assignment and assignment.shift:
            shift_obj = assignment.shift
            if shift_obj.shift_type == "rotational" and shift_obj.rotation_pattern:
                try:
                    seq = shift_obj.rotation_pattern.get("sequence", [])
                    if seq:
                        assignment_start = assignment.start_date
                        days_since_start = (today - assignment_start.date()).days
                        step_index = days_since_start % len(seq)
                        current_step = seq[step_index]
                        if str(current_step).upper() == "OFF":
                            is_holiday = True
                except: pass
            
            if not is_holiday and day_name in (shift_obj.holiday_days or []):
                if shift_obj.is_holiday_paid:
                    recent_checkins = recent_work_days_map.get(emp.code, 0)
                    min_required = shift_obj.min_days_for_paid_holiday or 4
                    if recent_checkins >= min_required:
                        is_holiday = True
                else:
                    is_holiday = True
        
        if not is_holiday:
            absent_count += 1
    
    return {
        "total_employees": total_employees,
        "present_today": present_count,
        "late_today": late_count,
        "early_leave_today": early_leave_count,
        "absent_today": absent_count,
        "currently_in": currently_in_count
    }

@router.get("/absent-employees")
def get_absent_employees(
    db: Session = Depends(get_db), 
    department: str = Query(None),
    shift: str = Query(None),
    current_user = Depends(get_current_user)
):
    today = datetime.date.today()
    day_name = today.strftime('%A')
    
    # Handle Query object
    if hasattr(department, 'default'): department = None
    if hasattr(shift, 'default'): shift = None

    # 1. Get present IDs today
    today_logs_query = db.query(hr_models.AttendanceLog.employee_id).filter(
        func.date(hr_models.AttendanceLog.timestamp) == today
    )
    if department or shift:
        today_logs_query = today_logs_query.join(
            employee_models.Employee, 
            or_(
                hr_models.AttendanceLog.employee_pk == employee_models.Employee.id,
                hr_models.AttendanceLog.employee_id == employee_models.Employee.code
            )
        )
        if department:
            today_logs_query = today_logs_query.filter(employee_models.Employee.department_id == department)
        if shift:
            today_logs_query = today_logs_query.join(
                hr_models.EmployeeShiftAssignment,
                employee_models.Employee.id == hr_models.EmployeeShiftAssignment.employee_id
            ).join(
                hr_models.WorkShift,
                hr_models.EmployeeShiftAssignment.shift_id == hr_models.WorkShift.id
            ).filter(
                hr_models.WorkShift.name.ilike(f"%{shift}%"),
                or_(
                    hr_models.EmployeeShiftAssignment.end_date == None,
                    hr_models.EmployeeShiftAssignment.end_date >= today
                )
            )
            
    present_ids = set(row[0] for row in today_logs_query.all())
    
    # 2. Get all active employees
    emp_query = db.query(employee_models.Employee).filter(employee_models.Employee.status == 'active')
    if department:
        emp_query = emp_query.filter(employee_models.Employee.department_id == department)
    if shift:
        emp_query = emp_query.join(
            hr_models.EmployeeShiftAssignment,
            employee_models.Employee.id == hr_models.EmployeeShiftAssignment.employee_id
        ).join(
            hr_models.WorkShift,
            hr_models.EmployeeShiftAssignment.shift_id == hr_models.WorkShift.id
        ).filter(
            hr_models.WorkShift.name.ilike(f"%{shift}%"),
            or_(
                hr_models.EmployeeShiftAssignment.end_date == None,
                hr_models.EmployeeShiftAssignment.end_date >= today
            )
        )
    active_employees = emp_query.all()
    
    # 3. Pre-fetch assignments
    all_assignments = db.query(hr_models.EmployeeShiftAssignment).filter(
        hr_models.EmployeeShiftAssignment.start_date <= today,
        or_(hr_models.EmployeeShiftAssignment.end_date == None, hr_models.EmployeeShiftAssignment.end_date >= today)
    ).all()
    assignment_map = {a.employee_id: a for a in all_assignments}

    absent_list = []
    for emp in active_employees:
        if emp.code in present_ids:
            continue
            
        # Check if today is a holiday
        assignment = assignment_map.get(emp.id)
        
        is_holiday = False
        if assignment and assignment.shift:
            shift_obj = assignment.shift
            if shift_obj.shift_type == "rotational" and shift_obj.rotation_pattern:
                try:
                    seq = shift_obj.rotation_pattern.get("sequence", [])
                    if seq:
                        assignment_start = assignment.start_date
                        days_since_start = (today - assignment_start.date()).days
                        step_index = days_since_start % len(seq)
                        current_step = seq[step_index]
                        if str(current_step).upper() == "OFF":
                            is_holiday = True
                except: pass
            
            if not is_holiday and day_name in (shift_obj.holiday_days or []):
                is_holiday = True
        
        if not is_holiday:
            absent_list.append({
                "id": str(emp.id),
                "employee_id": emp.code,
                "employee_name": emp.full_name,
                "department": emp.department_name,
                "status": "absent"
            })
            
    return absent_list

@router.get("/recent-activity")
def get_recent_activity(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Only last 24h for index-friendly range + eager load device to avoid N+1
    since = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    logs_query = db.query(
        hr_models.AttendanceLog,
        employee_models.Employee.full_name
    ).outerjoin(
        employee_models.Employee,
        or_(
            hr_models.AttendanceLog.employee_pk == employee_models.Employee.id,
            hr_models.AttendanceLog.employee_id == employee_models.Employee.code
        )
    ).options(joinedload(hr_models.AttendanceLog.device)).filter(
        hr_models.AttendanceLog.timestamp >= since
    ).order_by(
        hr_models.AttendanceLog.timestamp.desc()
    ).limit(15)

    results = logs_query.all()

    return [{
        "id": log.id,
        "employee_id": log.employee_id,
        "employee_name": full_name or f"ID: {log.employee_id}",
        "timestamp": log.timestamp.isoformat(),
        "type": log.type,
        "device": log.device.name if log.device else "Manual"
    } for log, full_name in results]

# --- EMPLOYEE MANAGEMENT ---

@router.get("/employees")
def get_employees(
    db: Session = Depends(get_db),
    search: str = Query(None),
    department: str = Query(None),
    shift: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=0)
):
    """
    Get all employees with their basic details. Supports search, department, shift, and pagination.
    """
    query = db.query(employee_models.Employee)
    
    if search:
        search_filter = or_(
            employee_models.Employee.full_name.ilike(f"%{search}%"),
            employee_models.Employee.code.ilike(f"%{search}%"),
            employee_models.Employee.work_email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if department:
        query = query.filter(employee_models.Employee.department_id == department)
    
    if status:
        query = query.filter(employee_models.Employee.status == status)
        
    if shift:
        # Join with shift assignments to filter by shift name
        query = query.join(
            hr_models.EmployeeShiftAssignment,
            employee_models.Employee.id == hr_models.EmployeeShiftAssignment.employee_id
        ).join(
            hr_models.WorkShift,
            hr_models.EmployeeShiftAssignment.shift_id == hr_models.WorkShift.id
        ).filter(
            hr_models.WorkShift.name.ilike(f"%{shift}%"),
            or_(
                hr_models.EmployeeShiftAssignment.end_date == None,
                hr_models.EmployeeShiftAssignment.end_date >= datetime.date.today()
            )
        )
    
    # Order by employee code for consistent results
    query = query.order_by(employee_models.Employee.code.asc())
        
    total = query.count()
    
    if limit > 0:
        offset = (page - 1) * limit
        employees = query.offset(offset).limit(limit).all()
    else:
        employees = query.all()
    
    # Pre-fetch all shift assignments for these employees in one query to avoid N+1
    employee_ids = [emp.id for emp in employees]
    all_assignments = db.query(hr_models.EmployeeShiftAssignment).filter(
        hr_models.EmployeeShiftAssignment.employee_id.in_(employee_ids)
    ).order_by(hr_models.EmployeeShiftAssignment.start_date.desc()).all()
    
    # Group assignments by employee_id
    assignments_map = {}
    for assignment in all_assignments:
        if assignment.employee_id not in assignments_map:
            assignments_map[assignment.employee_id] = []
        assignments_map[assignment.employee_id].append(assignment)

    result = []
    for emp in employees:
        # Get assignments from map
        emp_assignments = assignments_map.get(emp.id, [])
        
        # Format assignments with shift data
        assignment_list = []
        for assignment in emp_assignments:
            assignment_list.append({
                "id": assignment.id,
                "shift_id": assignment.shift_id,
                "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
                "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
                "shift": {
                    "id": assignment.shift.id,
                    "name": assignment.shift.name,
                    "shift_type": assignment.shift.shift_type,
                    "start_time": assignment.shift.start_time,
                    "end_time": assignment.shift.end_time
                } if assignment.shift else None
            })
        
        result.append({
            "id": str(emp.id),
            "employee_id": emp.code,
            "name": emp.full_name,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.work_email,
            "department": emp.department_name,
            "department_id": str(emp.department_id) if emp.department_id else None,
            "company": emp.company,
            "position": emp.position,
            "status": emp.status,
            "hire_date": emp.joining_date.isoformat() if emp.joining_date else None,
            "is_active": emp.status == "active",
            "user_id": str(emp.user_id) if emp.user_id else None,
            "has_system_access": emp.user_id is not None,
            "shift_assignments": assignment_list
        })
    
    active_total = db.query(employee_models.Employee).filter(employee_models.Employee.status == "active").count()
    
    return {
        "employees": result,
        "total": total,
        "active_total": active_total,
        "page": page,
        "limit": limit
    }

@router.post("/employees")
def create_employee(
    data: dict, 
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    """
    Create a new employee. 
    Can optionally grant system access immediately.
    """
    try:
        # 1. Create Employee
        new_emp = employee_models.Employee(
            code=data.get("code"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            full_name=f"{data.get('first_name')} {data.get('last_name')}",
            work_email=data.get("work_email"),
            position=data.get("position"),
            department_name=data.get("department"),
            status="active"
        )
        db.add(new_emp)
        db.flush()
        
        # 2. Grant Access?
        if data.get("grant_access") and data.get("work_email"):
            from core.auth import get_password_hash
            new_user = core_models.User(
                name=new_emp.full_name,
                email=new_emp.work_email,
                password=get_password_hash(data.get("password", "123456")),
                role="user",
                is_active=True
            )
            db.add(new_user)
            db.flush()
            new_emp.user_id = new_user.id
            
        db.commit()
        return {"status": "success", "id": str(new_emp.id)}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/employees/{emp_id}")
def get_employee(
    emp_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_READ))
):
    """
    Get a single employee's detailed information.
    """
    emp = db.query(employee_models.Employee).filter(employee_models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Get shift assignments
    assignments = db.query(hr_models.EmployeeShiftAssignment).filter(
        hr_models.EmployeeShiftAssignment.employee_id == emp.id
    ).order_by(hr_models.EmployeeShiftAssignment.start_date.desc()).all()
    
    assignment_list = []
    for assignment in assignments:
        assignment_list.append({
            "id": assignment.id,
            "shift_id": assignment.shift_id,
            "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
            "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
            "shift": {
                "id": assignment.shift.id,
                "name": assignment.shift.name,
                "shift_type": assignment.shift.shift_type,
                "start_time": assignment.shift.start_time,
                "end_time": assignment.shift.end_time
            } if assignment.shift else None
        })

    # Get personal info
    personal_info = emp.personal_info
    
    # Get emergency contacts
    emergency_contact = emp.emergency_contact
    emergency_contacts_list = []
    if emergency_contact:
        emergency_contacts_list.append({
            "id": str(emergency_contact.id),
            "name": emergency_contact.full_name,
            "relationship": emergency_contact.relationship_type,
            "phone": emergency_contact.phone_primary,
            "email": emergency_contact.email,
            "is_primary": emergency_contact.primary_contact
        })

    # Get documents
    documents_list = []
    for doc in emp.documents:
        documents_list.append({
            "id": str(doc.id),
            "type": doc.document_type,
            "name": doc.document_name,
            "number": doc.document_number,
            "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
            "file_path": doc.file_path
        })

    return {
        "id": str(emp.id),
        "employee_id": emp.code,
        "name": emp.full_name,
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "email": emp.work_email,
        "department": emp.department_name,
        "department_id": str(emp.department_id) if emp.department_id else None,
        "company": emp.company,
        "position": emp.position,
        "status": emp.status,
        "hire_date": emp.joining_date.isoformat() if emp.joining_date else None,
        "is_active": emp.status == "active",
        "user_id": str(emp.user_id) if emp.user_id else None,
        "has_system_access": emp.user_id is not None,
        "shift_assignments": assignment_list,
        # Additional fields from Employee and PersonalInfo
        "phone": emp.phone or (personal_info.personal_phone if personal_info else None),
        "national_id": personal_info.national_id if personal_info else None,
        "gender": personal_info.gender if personal_info else None,
        "date_of_birth": personal_info.date_of_birth.isoformat() if personal_info and personal_info.date_of_birth else None,
        "emergency_contacts": emergency_contacts_list,
        "documents": documents_list,
        "work_history": [] # TODO: Implement if needed
    }

@router.put("/employees/{emp_id}")
def update_employee(
    emp_id: uuid.UUID, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    emp = db.query(employee_models.Employee).filter(employee_models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    for key, val in data.items():
        if hasattr(emp, key):
            setattr(emp, key, val)
            
    db.commit()
    return {"status": "success"}

@router.delete("/employees/{emp_id}")
def delete_employee(
    emp_id: uuid.UUID, 
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    emp = db.query(employee_models.Employee).filter(employee_models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Soft delete - set status to inactive
    emp.status = "inactive"
    db.commit()
    return {"status": "success"}

# --- EXCEL IMPORT ---

@router.post("/employees/import/analyze")
async def analyze_import(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    service = EmployeeImportService(db)
    return await service.analyze_file(file)

@router.post("/employees/import/execute")
def execute_import(
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    service = EmployeeImportService(db)
    return service.execute_import(payload.get("data", []), payload.get("options", {}), current_user.id)

# --- ZKTECO DEVICES ---

@router.get("/devices")
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(hr_models.ZkDevice).all()
    return [{
        "id": d.id,
        "name": d.name,
        "ip_address": d.ip_address,
        "port": d.port,
        "status": d.status,
        "last_sync": d.last_sync.isoformat() if d.last_sync else None
    } for d in devices]

@router.post("/devices/sync-multiple")
def sync_multiple_devices(
    payload: dict,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    """Sync multiple devices at once"""
    device_ids = payload.get("device_ids", [])
    if not device_ids:
        # If no IDs provided, sync all online/active devices
        devices = db.query(hr_models.ZkDevice).all()
        device_ids = [d.id for d in devices]
    
    service = ZkTecoService(db)
    results = []
    total_new_logs = 0
    
    for d_id in device_ids:
        try:
            res = service.sync_device(d_id)
            results.append({
                "device_id": d_id,
                "status": res.get("status"),
                "message": res.get("message"),
                "logs_count": res.get("logs_count", 0)
            })
            total_new_logs += res.get("logs_count", 0)
        except Exception as e:
            results.append({
                "device_id": d_id,
                "status": "error",
                "message": str(e)
            })
            
    return {
        "status": "success",
        "total_new_logs": total_new_logs,
        "details": results
    }

@router.post("/devices/{device_id}/sync")
def sync_device(
    device_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    service = ZkTecoService(db)
    return service.sync_device(device_id)

# --- ATTENDANCE (Updated for new schema) ---

@router.delete("/attendance/clear")
def clear_attendance_logs(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission(PERM_HR_WRITE))
):
    try:
        db.query(hr_models.AttendanceLog).delete()
        db.commit()
        return {"status": "success", "message": "All attendance logs cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/attendance")
def get_attendance(
    db: Session = Depends(get_db),
    employee_id: str = Query(None),
    department: str = Query(None),
    status: str = Query(None),
    shift: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    search: str = Query(None),
    raw: bool = Query(False),
    limit: int = Query(20000, ge=1, le=100000),
    offset: int = Query(0, ge=0)
):
    # Handle Query objects if called directly in tests
    if hasattr(employee_id, 'default'): employee_id = None
    if hasattr(department, 'default'): department = None
    if hasattr(status, 'default'): status = None
    if hasattr(shift, 'default'): shift = None
    if hasattr(start_date, 'default'): start_date = None
    if hasattr(end_date, 'default'): end_date = None
    if hasattr(search, 'default'): search = None
    if hasattr(raw, 'default'): raw = False
    if hasattr(limit, 'default'): limit = 20000
    if hasattr(offset, 'default'): offset = 0

    query = db.query(
        hr_models.AttendanceLog,
        employee_models.Employee
    ).outerjoin(
        employee_models.Employee,
        or_(
            hr_models.AttendanceLog.employee_pk == employee_models.Employee.id,
            hr_models.AttendanceLog.employee_id == employee_models.Employee.code
        )
    ).options(joinedload(hr_models.AttendanceLog.device))

    # Use timestamp range (index-friendly) instead of func.date()
    if start_date:
        try:
            start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(hr_models.AttendanceLog.timestamp >= start_dt)
        except ValueError:
            query = query.filter(func.date(hr_models.AttendanceLog.timestamp) >= start_date)
    if end_date:
        try:
            end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(hr_models.AttendanceLog.timestamp < end_dt)
        except ValueError:
            query = query.filter(func.date(hr_models.AttendanceLog.timestamp) <= end_date)
    
    if search:
        search_conditions = [
            employee_models.Employee.full_name.ilike(f"%{search}%"),
            employee_models.Employee.code.ilike(f"%{search}%"),
            hr_models.AttendanceLog.employee_id.ilike(f"%{search}%")
        ]
        
        # If search looks like a UUID, add check for Employee.id
        try:
            uuid_obj = uuid.UUID(search)
            search_conditions.append(employee_models.Employee.id == uuid_obj)
        except ValueError:
            pass

        query = query.filter(or_(*search_conditions))
    elif employee_id:
        # Check both UUID and Code for flexibility
        try:
            emp_uuid = uuid.UUID(employee_id)
            query = query.filter(
                or_(
                    employee_models.Employee.id == emp_uuid,
                    employee_models.Employee.code == employee_id
                )
            )
        except (ValueError, TypeError):
            query = query.filter(employee_models.Employee.code == employee_id)
    
    if department:
        # Convert department to UUID if it's a valid UUID string
        try:
            dept_uuid = uuid.UUID(department)
            query = query.filter(employee_models.Employee.department_id == dept_uuid)
        except (ValueError, TypeError):
            # If not a valid UUID, try matching by department name
            query = query.filter(employee_models.Employee.department_name.ilike(f"%{department}%"))

    if shift:
        # Join with EmployeeShiftAssignment and WorkShift to filter by shift name
        query = query.join(
            hr_models.EmployeeShiftAssignment,
            employee_models.Employee.id == hr_models.EmployeeShiftAssignment.employee_id
        ).join(
            hr_models.WorkShift,
            hr_models.EmployeeShiftAssignment.shift_id == hr_models.WorkShift.id
        ).filter(
            hr_models.WorkShift.name.ilike(f"%{shift}%"),
            or_(
                hr_models.EmployeeShiftAssignment.end_date == None,
                hr_models.EmployeeShiftAssignment.end_date >= func.date(hr_models.AttendanceLog.timestamp)
            )
        )

    if raw and status:
        query = query.filter(hr_models.AttendanceLog.status == status)

    logs_query = query.order_by(hr_models.AttendanceLog.timestamp.asc())
    if raw:
        logs = logs_query.limit(limit).offset(offset).all()
    else:
        logs = logs_query.limit(limit).all()
    
    # Pre-fetch data for optimization
    emp_pks = {log.AttendanceLog.employee_pk for log in logs if log.AttendanceLog.employee_pk}
    emp_ids = {log.AttendanceLog.employee_id for log in logs if log.AttendanceLog.employee_id}
    
    # 1. Pre-fetch Shift Assignments
    assignment_map = {}
    if emp_pks:
        all_assignments = db.query(hr_models.EmployeeShiftAssignment).options(
            joinedload(hr_models.EmployeeShiftAssignment.shift)
        ).filter(
            hr_models.EmployeeShiftAssignment.employee_id.in_(emp_pks)
        ).all()
        for a in all_assignments:
            if a.employee_id not in assignment_map:
                assignment_map[a.employee_id] = []
            assignment_map[a.employee_id].append(a)
    
    # 2. Pre-fetch work days for 4/7 rule
    # We need to look back 7 days from the earliest log
    work_days_map = {}
    if logs and emp_ids:
        min_ts = logs[0].AttendanceLog.timestamp
        start_history = (min_ts - datetime.timedelta(days=7)).date()
        max_ts = logs[-1].AttendanceLog.timestamp
        end_history = max_ts.date()
        
        history_logs = db.query(
            hr_models.AttendanceLog.employee_id,
            func.date(hr_models.AttendanceLog.timestamp).label('work_date')
        ).filter(
            hr_models.AttendanceLog.employee_id.in_(emp_ids),
            func.date(hr_models.AttendanceLog.timestamp) >= start_history,
            func.date(hr_models.AttendanceLog.timestamp) <= end_history
        ).distinct().all()
        
        for h in history_logs:
            if h.employee_id not in work_days_map:
                work_days_map[h.employee_id] = set()
            work_days_map[h.employee_id].add(h.work_date)

    # Format Raw Logs
    raw_results = [{
        "id": log.AttendanceLog.id,
        "employee_id": log.Employee.code if log.Employee else log.AttendanceLog.employee_id,
        "employee_pk": str(log.Employee.id) if log.Employee else None,
        "employee_name": log.Employee.full_name if log.Employee else f"Unknown ({log.AttendanceLog.employee_id})",
        "timestamp": log.AttendanceLog.timestamp.isoformat(),
        "type": log.AttendanceLog.type,
        "status": log.AttendanceLog.status,
        "device": log.AttendanceLog.device.name if log.AttendanceLog.device else "Manual",
        # Manual edit tracking fields
        "is_manually_edited": log.AttendanceLog.is_manually_edited or False,
        "raw_status": log.AttendanceLog.raw_status,
        "edited_by": str(log.AttendanceLog.edited_by) if log.AttendanceLog.edited_by else None,
        "edited_at": log.AttendanceLog.edited_at.isoformat() if log.AttendanceLog.edited_at else None,
        "edit_reason": log.AttendanceLog.edit_reason,
        "original_timestamp": log.AttendanceLog.original_timestamp.isoformat() if log.AttendanceLog.original_timestamp else None
    } for log in logs]

    if raw:
        return raw_results

    # Sort logs by employee and then timestamp
    raw_results.sort(key=lambda x: (x["employee_id"], x["timestamp"]))
    
    processed_sessions = []
    
    # Process each employee's logs
    current_emp = None
    emp_logs = []
    
    for log in raw_results:
        if current_emp != log["employee_id"]:
            if current_emp:
                processed_sessions.extend(process_employee_sessions(current_emp, emp_logs, db, assignment_map, work_days_map))
            current_emp = log["employee_id"]
            emp_logs = [log]
        else:
            emp_logs.append(log)
            
    if current_emp:
        processed_sessions.extend(process_employee_sessions(current_emp, emp_logs, db, assignment_map, work_days_map))

    # Apply additional filters for processed sessions
    if status:
        if status == "late":
            processed_sessions = [s for s in processed_sessions if "late" in (s.get("status") or "")]
        elif status == "early_leave":
            processed_sessions = [s for s in processed_sessions if "early_leave" in (s.get("status") or "")]
        else:
            processed_sessions = [s for s in processed_sessions if s.get("status") == status]
    
    if shift:
        processed_sessions = [s for s in processed_sessions if s.get("shift_name") == shift]

    return processed_sessions

def process_employee_sessions(emp_id, logs, db, assignment_map=None, work_days_map=None):
    sessions = []
    
    # Filter out duplicate movements:
    # 1. Same type within 30 minutes - keep only the first
    # 2. Different types within 30 minutes - keep only the first (cancel second)
    if logs and len(logs) > 0:
        filtered_logs = [logs[0]]
        for i in range(1, len(logs)):
            current = logs[i]
            previous = filtered_logs[-1]
            
            # Parse timestamps
            try:
                current_ts = current.get("timestamp")
                previous_ts = previous.get("timestamp")
                
                if current_ts and previous_ts:
                    # Handle both string and datetime objects
                    if isinstance(current_ts, str):
                        current_time = datetime.datetime.fromisoformat(current_ts.replace('Z', '+00:00'))
                    else:
                        current_time = current_ts
                        
                    if isinstance(previous_ts, str):
                        previous_time = datetime.datetime.fromisoformat(previous_ts.replace('Z', '+00:00'))
                    else:
                        previous_time = previous_ts
                    
                    # Calculate time difference in minutes
                    diff_minutes = (current_time - previous_time).total_seconds() / 60
                    
                    # If same type and less than 30 minutes, skip this log
                    if current.get("type") == previous.get("type") and abs(diff_minutes) < 30:
                        continue
                    
                    # If different types and less than 30 minutes, skip this log (cancel second movement)
                    if current.get("type") != previous.get("type") and abs(diff_minutes) < 30:
                        continue
            except Exception as e:
                # If there's any error, just keep the log
                pass
            
            filtered_logs.append(current)
        logs = filtered_logs
    
    i = 0
    while i < len(logs):
        log = logs[i]
        if log["type"] != "check_in":
            i += 1
            continue
            
        # Start a new session
        start_log = log
        end_log = None
        session_logs = [log]
        
        # Look for the matching check_out or the next check_in
        j = i + 1
        while j < len(logs):
            next_log = logs[j]
            if next_log["type"] == "check_out":
                end_log = next_log
                session_logs.append(next_log)
                i = j # Move pointer to this check_out
                break
            if next_log["type"] == "check_in":
                # Check if this check_in is actually a mislabeled check_out (e.g. from mixed device)
                t1 = datetime.datetime.fromisoformat(log["timestamp"])
                t2 = datetime.datetime.fromisoformat(next_log["timestamp"])
                # If diff > 1 hour and same day, treat as check_out
                if t1.date() == t2.date() and (t2 - t1).total_seconds() > 3600:
                    # Treat next_log as end of session
                    # Clone it to avoid modifying original reference if used elsewhere
                    fake_out = next_log.copy()
                    fake_out["type"] = "check_out" 
                    end_log = fake_out
                    session_logs.append(fake_out)
                    i = j
                    break
                
                # New session started without check_out
                break
            session_logs.append(next_log)
            j += 1
        
        # Process the session
        # Only segment if the session spans multiple days (crosses midnight)
        first_log = session_logs[0]
        last_log = session_logs[-1] if session_logs else None
        if first_log and last_log:
            first_ts = datetime.datetime.fromisoformat(first_log["timestamp"])
            last_ts = datetime.datetime.fromisoformat(last_log["timestamp"])
            # Only segment if spans multiple days
            if first_ts.date() != last_ts.date():
                sessions.extend(segment_session_by_day(emp_id, session_logs, db, assignment_map, work_days_map))
            else:
                # Single day session - just calculate metrics directly
                metrics = calculate_session_metrics(emp_id, session_logs, db, assignment_map, work_days_map)
                metrics["segment"] = "single"
                metrics["is_real_check_in"] = True
                metrics["is_real_check_out"] = bool(last_log.get("type") == "check_out")
                sessions.append(metrics)
        i += 1
        
    return sessions

def calculate_session_metrics(emp_id, session_logs, db, assignment_map=None, work_days_map=None):
    try:
        first_in = session_logs[0]
        last_out = next((l for l in reversed(session_logs) if l["type"] == "check_out"), None)
        
        emp_pk_str = first_in.get("employee_pk")
        emp_name = first_in.get("employee_name")
        check_in_dt = datetime.datetime.fromisoformat(first_in["timestamp"])
        date_str = first_in["timestamp"][:10]
        
        # Check if this is a segmented session (multi-day shift)
        # Use original_check_in for rotational step calculation if available
        original_check_in_str = first_in.get("original_check_in")
        rotation_check_in_dt = check_in_dt
        if original_check_in_str:
            try:
                rotation_check_in_dt = datetime.datetime.fromisoformat(original_check_in_str)
            except:
                pass
        
        # Fetch Shift Policy
        assignment = None
        if emp_pk_str and assignment_map:
            try:
                emp_uuid = uuid.UUID(str(emp_pk_str))
                # Filter assignments locally
                emp_assignments = assignment_map.get(emp_uuid, [])
                for a in emp_assignments:
                    if a.start_date <= check_in_dt and (a.end_date is None or a.end_date >= check_in_dt):
                        # Find the most recent assignment that fits
                        if not assignment or a.start_date > assignment.start_date:
                            assignment = a
            except (ValueError, TypeError):
                pass
        
        # Fallback if no map (legacy support)
        if not assignment and not assignment_map and emp_pk_str:
            try:
                emp_uuid = uuid.UUID(str(emp_pk_str))
                assignment = db.query(hr_models.EmployeeShiftAssignment).filter(
                    hr_models.EmployeeShiftAssignment.employee_id == emp_uuid,
                    hr_models.EmployeeShiftAssignment.start_date <= check_in_dt,
                    or_(hr_models.EmployeeShiftAssignment.end_date == None, hr_models.EmployeeShiftAssignment.end_date >= check_in_dt)
                ).order_by(hr_models.EmployeeShiftAssignment.start_date.desc()).first()
            except: pass
            
        shift = assignment.shift if assignment else None
        
        # Break Calculation
        break_duration = 0
        for k in range(len(session_logs) - 1):
            if session_logs[k]["type"] in ["check_out", "break_out"] and session_logs[k+1]["type"] in ["check_in", "break_in"]:
                t1 = datetime.datetime.fromisoformat(session_logs[k]["timestamp"])
                t2 = datetime.datetime.fromisoformat(session_logs[k+1]["timestamp"])
                diff = (t2 - t1).total_seconds() / 3600
                if diff < 4: # Assume breaks are less than 4h, otherwise might be separate shifts
                    break_duration += diff
                    
        total_hours = 0
        if last_out:
            check_out_dt = datetime.datetime.fromisoformat(last_out["timestamp"])
            total_hours = round((check_out_dt - check_in_dt).total_seconds() / 3600, 2)
            
        capacity = (shift.expected_hours if shift and shift.expected_hours is not None else 8.0)
        
        # Handle Rotational Capacity (Advanced)
        # Use original_check_in_dt for correct rotation step calculation across days
        if shift and shift.shift_type == "rotational" and shift.rotation_pattern and assignment:
            try:
                seq = shift.rotation_pattern.get("sequence", [])
                if seq and len(seq) > 0:
                    # Find which step this is based on ORIGINAL check-in date (not segmented midnight time)
                    assignment_start = assignment.start_date
                    days_since_start = (rotation_check_in_dt.date() - assignment_start.date()).days
                    step_index = days_since_start % len(seq)
                    current_step = seq[step_index]
                    
                    if isinstance(current_step, dict):
                        capacity = current_step.get("hours", capacity)
                    elif str(current_step).upper() == "OFF":
                        capacity = 0 # It's an OFF day, but if they worked, all is OT
            except Exception as e:
                logger.error(f"Error calculating rotational capacity: {e}")

        actual_work = max(0, total_hours - break_duration)
        
        # Multiplier Logic
        day_name = check_in_dt.strftime('%A')
        
        # Check if holiday is paid based on 4/7 rule
        is_holiday = False
        distribute_bonus = getattr(shift, 'distribute_holiday_bonus', False) if shift else False

        if shift and not distribute_bonus and shift.holiday_days and day_name in shift.holiday_days:
            if shift.is_holiday_paid:
                # Look back 7 days
                seven_days_ago = check_in_dt.date() - datetime.timedelta(days=6)
                
                work_days_count = 0
                if work_days_map and emp_id in work_days_map:
                    # Count distinct dates in map within the range
                    emp_work_dates = work_days_map[emp_id]
                    work_days_count = sum(1 for d in emp_work_dates if seven_days_ago <= d < check_in_dt.date())
                else:
                    # Fallback if no map
                    recent_logs = db.query(hr_models.AttendanceLog).filter(
                        hr_models.AttendanceLog.employee_id == emp_id,
                        func.date(hr_models.AttendanceLog.timestamp) >= seven_days_ago,
                        func.date(hr_models.AttendanceLog.timestamp) < check_in_dt.date()
                    ).all()
                    work_days_count = len(set(log.timestamp.date() for log in recent_logs))
                
                if work_days_count >= (shift.min_days_for_paid_holiday or 4):
                    is_holiday = True
            else:
                is_holiday = True

        multiplier = (shift.multiplier_holiday if is_holiday else shift.multiplier_normal) if shift else 1.0
        
        # Distributed Holiday Credit
        holiday_credit = 0
        if distribute_bonus and shift and shift.shift_type == "rotational" and shift.rotation_pattern and actual_work > 0:
            try:
                seq = shift.rotation_pattern.get("sequence", [])
                total_work_hours = sum(s.get("hours", 0) for s in seq if isinstance(s, dict))
                if total_work_hours > 0:
                    # 1 holiday day = 8 hours credit
                    holiday_factor = 8.0 / total_work_hours
                    holiday_credit = round(actual_work * holiday_factor, 2)
            except: pass

        overtime = 0
        ot_threshold = (shift.ot_threshold if shift and shift.ot_threshold is not None else 30) / 60.0
        if actual_work > (capacity + ot_threshold):
            overtime = round((actual_work - capacity) * multiplier, 2)
            
        # Final pay hours (work + overtime + holiday_credit)
        if holiday_credit > 0:
            overtime = round(overtime + holiday_credit, 2)
            
        # Status calculation
        status = "present"
        
        # Custom Logic for Rotational Step Timing
        target_start_time = shift.start_time if shift else "08:00"
        target_end_time = shift.end_time if shift else "17:00"
        target_offset = getattr(shift, 'end_day_offset', 0) if shift else 0
        
        if shift and shift.shift_type == "rotational" and shift.rotation_pattern and assignment:
            try:
                seq = shift.rotation_pattern.get("sequence", [])
                if seq and len(seq) > 0:
                    assignment_start = assignment.start_date
                    days_since_start = (check_in_dt.date() - assignment_start.date()).days
                    step_index = days_since_start % len(seq)
                    current_step = seq[step_index]
                    
                    if isinstance(current_step, dict):
                        # Check for slot-based times
                        slots = shift.rotation_pattern.get("slots", {})
                        step_slots = current_step.get("slots", [])
                        if step_slots and slots:
                            # Use first slot for start, last for end
                            first_slot = slots.get(step_slots[0], {})
                            last_slot = slots.get(step_slots[-1], {})
                            if "start" in first_slot: target_start_time = first_slot["start"]
                            if "end" in last_slot: target_end_time = last_slot["end"]
                        else:
                            # Legacy/Direct dict fields
                            if "start" in current_step: target_start_time = current_step["start"]
                            if "end" in current_step: target_end_time = current_step["end"]
                            
                        if "offset" in current_step: target_offset = current_step["offset"]
                    elif str(current_step).upper() == "OFF":
                        status = "overtime" # Working on OFF day
            except: pass

        try:
            if target_start_time:
                shift_start_hour, shift_start_min = map(int, target_start_time.split(':'))
                shift_in_dt = check_in_dt.replace(hour=shift_start_hour, minute=shift_start_min, second=0, microsecond=0)
                
                # Late check-in
                if status != "overtime" and shift and check_in_dt > shift_in_dt + datetime.timedelta(minutes=shift.grace_period_in or 0):
                    status = "late"
                    
            if last_out and target_end_time:
                check_out_dt = datetime.datetime.fromisoformat(last_out["timestamp"])
                shift_out_hour, shift_out_min = map(int, target_end_time.split(':'))
                
                shift_out_dt = shift_in_dt.replace(hour=shift_out_hour, minute=shift_out_min, second=0, microsecond=0)
                
                if target_offset > 0:
                    shift_out_dt += datetime.timedelta(days=target_offset)
                elif target_end_time < target_start_time:
                    shift_out_dt += datetime.timedelta(days=1)
                
                # Early leave
                if status != "overtime" and shift and check_out_dt < shift_out_dt - datetime.timedelta(minutes=shift.grace_period_out or 0):
                    if status == "present": 
                        status = "early_leave"
                    elif status == "late":
                        status = "late & early_leave"
            elif not last_out:
                status = "ongoing"
        except:
            pass
                
        # Check if any log in session was manually edited or is manual type
        has_manual_adjustment = False
        for log in session_logs:
            if log.get('is_manually_edited') or log.get('raw_status') == 'MANUAL':
                has_manual_adjustment = True
                break
        
        return {
            "employee_id": str(emp_id),
            "employee_pk": str(emp_pk_str) if emp_pk_str else None,
            "employee_name": emp_name,
            "check_in": first_in["timestamp"],
            "check_out": last_out["timestamp"] if last_out else None,
            "check_in_date": date_str,
            "total_hours": total_hours,
            "break_hours": round(break_duration, 2),
            "actual_work": round(actual_work, 2),
            "capacity": capacity,
            "overtime": overtime,
            "status": status,
            "shift_name": shift.name if shift else "Standard",
            "is_holiday": is_holiday,
            "has_manual_adjustment": has_manual_adjustment
        }
    except Exception as e:
        print(f"CRITICAL ERROR in calculate_session_metrics: {e}")
        return {
            "employee_id": str(emp_id),
            "status": "error",
            "error": str(e)
        }

def segment_session_by_day(emp_id, session_logs, db, assignment_map=None, work_days_map=None):
    results = []
    try:
        first_in = session_logs[0]
        last_out = next((l for l in reversed(session_logs) if l["type"] == "check_out"), None)
        emp_pk_str = first_in.get("employee_pk")
        emp_name = first_in.get("employee_name")
        start_dt = datetime.datetime.fromisoformat(first_in["timestamp"])
        if last_out:
            end_dt = datetime.datetime.fromisoformat(last_out["timestamp"])
        else:
            end_dt = datetime.datetime.now()
        
        # Store original check-in for rotational step calculation
        original_check_in = start_dt.isoformat()
        cur_start = start_dt
        while cur_start <= end_dt:
            day_end = datetime.datetime.combine(cur_start.date(), datetime.time(23, 59, 59))
            seg_end = end_dt if end_dt <= day_end else day_end
            seg_break = 0.0
            for k in range(len(session_logs) - 1):
                a = session_logs[k]
                b = session_logs[k + 1]
                if a["type"] in ["check_out", "break_out"] and b["type"] in ["check_in", "break_in"]:
                    t1 = datetime.datetime.fromisoformat(a["timestamp"])
                    t2 = datetime.datetime.fromisoformat(b["timestamp"])
                    diff_h = (t2 - t1).total_seconds() / 3600
                    if diff_h < 4:
                        s1 = max(cur_start, t1)
                        s2 = min(seg_end, t2)
                        if s2 > s1:
                            seg_break += (s2 - s1).total_seconds() / 3600
            seg_logs = [{
                "employee_id": str(emp_id),
                "employee_pk": emp_pk_str,
                "employee_name": emp_name,
                "timestamp": cur_start.isoformat(),
                "type": "check_in"
            }]
            if seg_end:
                seg_logs.append({
                    "employee_id": str(emp_id),
                    "employee_pk": emp_pk_str,
                    "employee_name": emp_name,
                    "timestamp": seg_end.isoformat(),
                    "type": "check_out"
                })
            metrics = calculate_session_metrics(emp_id, seg_logs, db, assignment_map, work_days_map)
            metrics["break_hours"] = round(seg_break, 2)
            metrics["check_in"] = cur_start.isoformat()
            metrics["check_out"] = seg_end.isoformat() if seg_end else None
            metrics["segment"] = "daily"
            metrics["is_real_check_in"] = cur_start == start_dt
            metrics["is_real_check_out"] = bool(last_out) and seg_end == end_dt
            # Pass original check-in for proper rotational step calculation
            metrics["original_check_in"] = original_check_in
            results.append(metrics)
            if seg_end.date() == end_dt.date():
                break
            cur_start = (day_end + datetime.timedelta(seconds=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return results
    except Exception as e:
        return []

# --- SHIFT MANAGEMENT ---

@router.get("/shifts")
def get_shifts(db: Session = Depends(get_db)):
    return db.query(hr_models.WorkShift).all()

@router.post("/shifts")
def create_shift(shift: dict, db: Session = Depends(get_db)):
    db_shift = hr_models.WorkShift(**shift)
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@router.put("/shifts/{shift_id}")
def update_shift(shift_id: int, shift_data: dict, db: Session = Depends(get_db)):
    db.query(hr_models.WorkShift).filter(hr_models.WorkShift.id == shift_id).update(shift_data)
    db.commit()
    return {"status": "success"}

@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    # Check if used in assignments (maybe prevent or cascade?)
    # For now, just delete
    db.query(hr_models.WorkShift).filter(hr_models.WorkShift.id == shift_id).delete()
    db.commit()
    return {"status": "success"}

@router.post("/employees/assign-shift")
def assign_shift(assignment: dict, db: Session = Depends(get_db)):
    emp_id = assignment.get("employee_id")
    shift_id = assignment.get("shift_id")
    start_date_str = assignment.get("start_date")
    
    # Convert string UUID to UUID object if needed
    if isinstance(emp_id, str):
        try:
            emp_id = uuid.UUID(emp_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee ID format")
    
    start_date = datetime.datetime.fromisoformat(start_date_str) if start_date_str else datetime.datetime.now(datetime.timezone.utc)

    # Deactivate current assignments
    active_assignments = db.query(hr_models.EmployeeShiftAssignment).filter(
        hr_models.EmployeeShiftAssignment.employee_id == emp_id,
        hr_models.EmployeeShiftAssignment.end_date == None
    ).all()
    
    # Update each assignment individually
    for assignment in active_assignments:
        assignment.end_date = start_date
    
    new_assignment = hr_models.EmployeeShiftAssignment(
        employee_id=emp_id,
        shift_id=shift_id,
        start_date=start_date
    )
    db.add(new_assignment)
    db.commit()
    return {"status": "success"}

@router.post("/devices")
def create_device(device: dict, db: Session = Depends(get_db), current_user = Depends(require_permission(PERM_HR_WRITE))):
    db_device = hr_models.ZkDevice(**device)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return {"id": db_device.id, "name": db_device.name, "ip_address": db_device.ip_address, "port": db_device.port, "location": db_device.location, "status": "offline", "last_sync": None}

@router.put("/devices/{device_id}")
def update_device(device_id: int, device_data: dict, db: Session = Depends(get_db), current_user = Depends(require_permission(PERM_HR_WRITE))):
    db.query(hr_models.ZkDevice).filter(hr_models.ZkDevice.id == device_id).update(device_data)
    db.commit()
    return {"status": "success"}

@router.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), current_user = Depends(require_permission(PERM_HR_WRITE))):
    db.query(hr_models.ZkDevice).filter(hr_models.ZkDevice.id == device_id).delete()
    db.commit()
    return {"status": "success"}

@router.post("/devices/{device_id}/ping")
def ping_device(device_id: int, db: Session = Depends(get_db), current_user = Depends(require_permission(PERM_HR_WRITE))):
    zk_service = ZkTecoService(db)
    result = zk_service.ping_device(device_id)
    return {"status": "success", "online": result["status"] == "online"}

# ============================================
# Processed Attendance & Manual Edits APIs
# ============================================

@router.post("/attendance/recalculate")
def recalculate_attendance(
    start_date: str = Query(...),
    end_date: str = Query(...),
    employee_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Recalculate attendance for a date range and store in processed_attendance table.
    This is an async operation that processes and stores results.
    Now properly handles multi-day shifts by segmenting sessions across days.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🔄 Recalculating attendance from {start_date} to {end_date}")
    
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        # Parse dates
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        # Get employees
        if employee_id:
            employees = db.query(employee_models.Employee).filter(
                employee_models.Employee.code == employee_id
            ).all()
        else:
            employees = db.query(employee_models.Employee).filter(
                employee_models.Employee.status == 'active'
            ).all()
        
        processed_count = 0
        
        for emp in employees:
            # Get attendance logs for this employee in date range
            logs = db.query(hr_models.AttendanceLog).filter(
                hr_models.AttendanceLog.employee_pk == emp.id,
                func.date(hr_models.AttendanceLog.timestamp) >= start.date(),
                func.date(hr_models.AttendanceLog.timestamp) <= end.date()
            ).order_by(hr_models.AttendanceLog.timestamp).all()
            
            # Convert to dict format for processing
            raw_logs = [{
                "id": log.id,
                "employee_pk": str(emp.id),
                "employee_id": emp.code,
                "employee_name": emp.full_name,
                "timestamp": log.timestamp.isoformat(),
                "type": log.type,
            } for log in logs]
            
            # Sort by timestamp
            raw_logs.sort(key=lambda x: x["timestamp"])
            
            # Filter out duplicate movements:
            # 1. Same type within 30 minutes - keep only the first
            # 2. Different types within 30 minutes - keep only the first (cancel second)
            filtered_logs = []
            for i, log in enumerate(raw_logs):
                if i == 0:
                    filtered_logs.append(log)
                else:
                    prev_log = filtered_logs[-1]
                    t1 = datetime.fromisoformat(prev_log["timestamp"])
                    t2 = datetime.fromisoformat(log["timestamp"])
                    diff_minutes = (t2 - t1).total_seconds() / 60
                    # If same type and less than 30 minutes, skip this log
                    if log["type"] == prev_log["type"] and abs(diff_minutes) < 30:
                        continue
                    # If different types and less than 30 minutes, skip this log (cancel second movement)
                    if log["type"] != prev_log["type"] and abs(diff_minutes) < 30:
                        continue
                    filtered_logs.append(log)
            
            # Process sessions
            i = 0
            while i < len(filtered_logs):
                log = filtered_logs[i]
                if log["type"] != "check_in":
                    i += 1
                    continue
                
                # Start a new session
                start_log = log
                end_log = None
                session_logs = [log]
                
                # Look for the matching check_out
                j = i + 1
                while j < len(filtered_logs):
                    next_log = filtered_logs[j]
                    if next_log["type"] == "check_out":
                        end_log = next_log
                        session_logs.append(next_log)
                        i = j
                        break
                    if next_log["type"] == "check_in":
                        # Check if this check_in is actually a mislabeled check_out
                        t1 = datetime.fromisoformat(log["timestamp"])
                        t2 = datetime.fromisoformat(next_log["timestamp"])
                        # If diff > 1 hour and same day, treat as check_out
                        if t1.date() == t2.date() and (t2 - t1).total_seconds() > 3600:
                            fake_out = next_log.copy()
                            fake_out["type"] = "check_out"
                            end_log = fake_out
                            session_logs.append(fake_out)
                            i = j
                            break
                        # New session started without check_out
                        break
                    session_logs.append(next_log)
                    j += 1
                
                # Process the session - segment by day if multi-day
                first_log = session_logs[0]
                last_log = session_logs[-1] if session_logs else None
                
                if first_log and last_log:
                    first_ts = datetime.fromisoformat(first_log["timestamp"])
                    last_ts = datetime.fromisoformat(last_log["timestamp"])
                    
                    # Only segment if spans multiple days
                    if first_ts.date() != last_ts.date():
                        # Multi-day session - segment by day
                        cur_start = first_ts
                        original_check_in = first_ts.isoformat()
                        
                        while cur_start <= last_ts:
                            day_end = datetime.combine(cur_start.date(), datetime.time(23, 59, 59))
                            seg_end = last_ts if last_ts <= day_end else day_end
                            
                            # Calculate break for this segment
                            seg_break = 0.0
                            for k in range(len(session_logs) - 1):
                                a = session_logs[k]
                                b = session_logs[k + 1]
                                if a["type"] in ["check_out", "break_out"] and b["type"] in ["check_in", "break_in"]:
                                    t1 = datetime.fromisoformat(a["timestamp"])
                                    t2 = datetime.fromisoformat(b["timestamp"])
                                    diff_h = (t2 - t1).total_seconds() / 3600
                                    if diff_h < 4:
                                        s1 = max(cur_start, t1)
                                        s2 = min(seg_end, t2)
                                        if s2 > s1:
                                            seg_break += (s2 - s1).total_seconds() / 3600
                            
                            # Calculate work hours for this segment
                            seg_check_in = cur_start
                            seg_check_out = seg_end
                            seg_work_hours = 0.0
                            if seg_check_in and seg_check_out:
                                seg_work_hours = round((seg_check_out - seg_check_in).total_seconds() / 3600, 2)
                                seg_work_hours = max(0, seg_work_hours - seg_break)
                            
                            # Store in processed_attendance
                            date_key = cur_start.date()
                            
                            # Get shift assignment for this date
                            shift = None
                            expected_hours = 8.0
                            try:
                                assignments = db.query(hr_models.EmployeeShiftAssignment).options(
                                    joinedload(hr_models.EmployeeShiftAssignment.shift)
                                ).filter(
                                    hr_models.EmployeeShiftAssignment.employee_id == emp.id,
                                    hr_models.EmployeeShiftAssignment.start_date <= datetime.combine(date_key, datetime.min.time()),
                                    or_(hr_models.EmployeeShiftAssignment.end_date == None, hr_models.EmployeeShiftAssignment.end_date >= datetime.combine(date_key, datetime.min.time()))
                                ).all()
                                
                                for a in assignments:
                                    if a.shift:
                                        shift = a.shift
                                        expected_hours = shift.expected_hours if shift.expected_hours else 8.0
                                        break
                            except:
                                pass
                            
                            # Get or create processed record
                            existing = db.query(hr_models.ProcessedAttendance).filter(
                                hr_models.ProcessedAttendance.employee_pk == emp.id,
                                func.date(hr_models.ProcessedAttendance.work_date) == date_key
                            ).first()
                            
                            if existing:
                                existing.check_in = seg_check_in if cur_start == first_ts else datetime.combine(date_key, datetime.min.time())
                                existing.check_out = seg_check_out
                                existing.work_hours = seg_work_hours
                                existing.expected_hours = expected_hours
                                existing.shift_id = shift.id if shift else None
                                existing.is_calculated = True
                                existing.calculated_at = datetime.utcnow()
                                if not existing.has_manual_adjustment:
                                    existing.adjusted_work_hours = None
                                    existing.adjustment_reason = None
                            else:
                                new_record = hr_models.ProcessedAttendance(
                                    employee_pk=emp.id,
                                    work_date=datetime.combine(date_key, datetime.min.time()),
                                    check_in=seg_check_in if cur_start == first_ts else datetime.combine(date_key, datetime.min.time()),
                                    check_out=seg_check_out,
                                    work_hours=seg_work_hours,
                                    expected_hours=expected_hours,
                                    shift_id=shift.id if shift else None,
                                    is_calculated=True,
                                    calculated_at=datetime.utcnow()
                                )
                                db.add(new_record)
                            
                            processed_count += 1
                            
                            if seg_end.date() == last_ts.date():
                                break
                            # Move to next day at midnight
                            next_day = cur_start.date() + timedelta(days=1)
                            cur_start = datetime.combine(next_day, datetime.min.time())
                    else:
                        # Single day session - calculate directly
                        check_in = None
                        check_out = None
                        for sl in session_logs:
                            if sl["type"] == "check_in" and not check_in:
                                check_in = datetime.fromisoformat(sl["timestamp"])
                            if sl["type"] == "check_out":
                                check_out = datetime.fromisoformat(sl["timestamp"])
                        
                        # Calculate break
                        break_duration = 0.0
                        for k in range(len(session_logs) - 1):
                            if session_logs[k]["type"] in ["check_out", "break_out"] and session_logs[k+1]["type"] in ["check_in", "break_in"]:
                                t1 = datetime.fromisoformat(session_logs[k]["timestamp"])
                                t2 = datetime.fromisoformat(session_logs[k+1]["timestamp"])
                                diff = (t2 - t1).total_seconds() / 3600
                                if diff < 4:
                                    break_duration += diff
                        
                        work_hours = 0.0
                        if check_in and check_out:
                            work_hours = round((check_out - check_in).total_seconds() / 3600, 2)
                            work_hours = max(0, work_hours - break_duration)
                        
                        date_key = check_in.date() if check_in else start.date()
                        
                        # Get shift assignment for this date
                        shift = None
                        expected_hours = 8.0
                        try:
                            assignments = db.query(hr_models.EmployeeShiftAssignment).options(
                                joinedload(hr_models.EmployeeShiftAssignment.shift)
                            ).filter(
                                hr_models.EmployeeShiftAssignment.employee_id == emp.id,
                                hr_models.EmployeeShiftAssignment.start_date <= datetime.combine(date_key, datetime.min.time()),
                                or_(hr_models.EmployeeShiftAssignment.end_date == None, hr_models.EmployeeShiftAssignment.end_date >= datetime.combine(date_key, datetime.min.time()))
                            ).all()
                            
                            for a in assignments:
                                if a.shift:
                                    shift = a.shift
                                    expected_hours = shift.expected_hours if shift.expected_hours else 8.0
                                    break
                        except:
                            pass
                        
                        # Get or create processed record
                        existing = db.query(hr_models.ProcessedAttendance).filter(
                            hr_models.ProcessedAttendance.employee_pk == emp.id,
                            func.date(hr_models.ProcessedAttendance.work_date) == date_key
                        ).first()
                        
                        if existing:
                            existing.check_in = check_in
                            existing.check_out = check_out
                            existing.work_hours = work_hours
                            existing.expected_hours = expected_hours
                            existing.shift_id = shift.id if shift else None
                            existing.is_calculated = True
                            existing.calculated_at = datetime.utcnow()
                            if not existing.has_manual_adjustment:
                                existing.adjusted_work_hours = None
                                existing.adjustment_reason = None
                        else:
                            new_record = hr_models.ProcessedAttendance(
                                employee_pk=emp.id,
                                work_date=datetime.combine(date_key, datetime.min.time()),
                                check_in=check_in,
                                check_out=check_out,
                                work_hours=work_hours,
                                expected_hours=expected_hours,
                                shift_id=shift.id if shift else None,
                                is_calculated=True,
                                calculated_at=datetime.utcnow()
                            )
                            db.add(new_record)
                        
                        processed_count += 1
                
                i += 1
        
        db.commit()
        logger.info(f"✅ Processed {processed_count} attendance records")
        
        return {
            "status": "success",
            "message": f"تم إعادة احتساب {processed_count} سجل",
            "processed_count": processed_count
        }
    
    except Exception as e:
        logger.error(f"❌ Error recalculating attendance: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/attendance/{log_id}/edit")
def edit_attendance_log(
    log_id: int,
    edit_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually edit an attendance log record.
    edit_data should contain: new_timestamp, edit_reason (optional)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Get the log
    log = db.query(hr_models.AttendanceLog).filter(
        hr_models.AttendanceLog.id == log_id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="سجل الحضور غير موجود")
    
    # Store original timestamp
    original_timestamp = log.timestamp
    
    # Update the log
    if "new_timestamp" in edit_data:
        from datetime import datetime
        try:
            new_timestamp = datetime.fromisoformat(edit_data["new_timestamp"].replace("Z", "+00:00"))
            log.timestamp = new_timestamp
        except:
            raise HTTPException(status_code=400, detail="تنسيق التاريخ غير صحيح")
    
    # Mark as manually edited
    log.is_manually_edited = True
    log.edited_by = current_user.id
    log.edited_at = datetime.utcnow()
    log.original_timestamp = original_timestamp
    
    if "edit_reason" in edit_data:
        log.edit_reason = edit_data["edit_reason"]
    
    db.commit()
    
    logger.info(f"✏️ Log {log_id} edited by {current_user.email}")
    
    return {
        "status": "success",
        "message": "تم تعديل السجل بنجاح",
        "log": {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "is_manually_edited": log.is_manually_edited,
            "edited_by": log.edited_by,
            "edited_at": log.edited_at.isoformat() if log.edited_at else None
        }
    }

@router.get("/attendance/processed")
def get_processed_attendance(
    start_date: str = Query(...),
    end_date: str = Query(...),
    employee_id: str = Query(None),
    department: str = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get stored processed attendance records.
    Returns data from processed_attendance table if available.
    """
    from datetime import datetime
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except:
        raise HTTPException(status_code=400, detail="تنسيق التاريخ غير صحيح")
    
    query = db.query(hr_models.ProcessedAttendance).filter(
        hr_models.ProcessedAttendance.work_date >= start,
        hr_models.ProcessedAttendance.work_date <= end
    )
    
    if department:
        query = query.join(employee_models.Employee, hr_models.ProcessedAttendance.employee_pk == employee_models.Employee.id)
        try:
            dept_uuid = uuid.UUID(department)
            query = query.filter(employee_models.Employee.department_id == dept_uuid)
        except (ValueError, TypeError):
            query = query.filter(employee_models.Employee.department_name.ilike(f"%{department}%"))
    
    if employee_id:
        # Find employee by code
        emp = db.query(employee_models.Employee).filter(
            employee_models.Employee.code == employee_id
        ).first()
        if emp:
            query = query.filter(hr_models.ProcessedAttendance.employee_pk == emp.id)
    
    records = query.order_by(hr_models.ProcessedAttendance.work_date.desc()).all()
    
    # Batch load employees to avoid N+1
    employee_pks = list({rec.employee_pk for rec in records if rec.employee_pk})
    employee_map = {}
    if employee_pks:
        employees = db.query(employee_models.Employee).filter(
            employee_models.Employee.id.in_(employee_pks)
        ).all()
        employee_map = {e.id: e for e in employees}
    
    results = []
    for rec in records:
        emp = employee_map.get(rec.employee_pk) if rec.employee_pk else None
        results.append({
            "id": rec.id,
            "employee_id": emp.code if emp else "Unknown",
            "employee_name": emp.full_name if emp else "Unknown",
            "work_date": rec.work_date.isoformat() if rec.work_date else None,
            "check_in": rec.check_in.isoformat() if rec.check_in else None,
            "check_out": rec.check_out.isoformat() if rec.check_out else None,
            "work_hours": rec.work_hours,
            "overtime_hours": rec.overtime_hours,
            "late_minutes": rec.late_minutes,
            "early_leave_minutes": rec.early_leave_minutes,
            "status": rec.status,
            "has_manual_adjustment": rec.has_manual_adjustment,
            "adjusted_work_hours": rec.adjusted_work_hours,
            "adjustment_reason": rec.adjustment_reason,
            "calculated_at": rec.calculated_at.isoformat() if rec.calculated_at else None
        })
    
    return results

@router.put("/attendance/processed/{record_id}/adjust")
def adjust_processed_attendance(
    record_id: int,
    adjustment_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually adjust the calculated work hours for a processed attendance record.
    This is different from editing the raw log - it adjusts the final calculated hours.
    """
    import logging
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    # Get the record
    record = db.query(hr_models.ProcessedAttendance).filter(
        hr_models.ProcessedAttendance.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="السجل المعالج غير موجود")
    
    # Apply adjustment
    if "adjusted_work_hours" in adjustment_data:
        record.adjusted_work_hours = adjustment_data["adjusted_work_hours"]
        record.has_manual_adjustment = True
    
    if "adjustment_reason" in adjustment_data:
        record.adjustment_reason = adjustment_data["adjustment_reason"]
    
    record.adjusted_by = current_user.id
    record.adjusted_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"⚖️ Processed attendance {record_id} adjusted by {current_user.email}")
    
    return {
        "status": "success",
        "message": "تم تعديل السجل المعالج بنجاح",
        "record": {
            "id": record.id,
            "work_hours": record.work_hours,
            "adjusted_work_hours": record.adjusted_work_hours,
            "has_manual_adjustment": record.has_manual_adjustment
        }
    }


@router.post("/attendance/manual")
def add_manual_attendance_log(
    log_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually add a new attendance log.
    log_data should contain: employee_code, timestamp, type (check_in/check_out), reason (optional)
    """
    import logging
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    # Validate required fields
    if "employee_id" not in log_data and "employee_code" not in log_data:
        raise HTTPException(status_code=400, detail="معرف الموظف مطلوب")
    if "timestamp" not in log_data:
        raise HTTPException(status_code=400, detail="الوقت مطلوب")
    if "type" not in log_data:
        raise HTTPException(status_code=400, detail="نوع الحركة مطلوب")
    
    # Get employee code - support both formats
    employee_code = log_data.get("employee_code") or log_data.get("employee_id")
    
    # Find employee by code
    from models.employee_models import Employee
    employee = db.query(Employee).filter(
        Employee.code == employee_code
    ).first()
    
    if not employee:
        # Try to find by employee_id in attendance_logs
        existing_log = db.query(hr_models.AttendanceLog).filter(
            hr_models.AttendanceLog.employee_id == employee_code
        ).first()
        
        if existing_log:
            # Use the existing employee_id
            employee_code = existing_log.employee_id
        else:
            raise HTTPException(status_code=404, detail=f"الموظف غير موجود: {employee_code}")
    else:
        employee_code = employee.code
    
    # Parse timestamp
    try:
        timestamp = datetime.fromisoformat(log_data["timestamp"].replace("Z", "+00:00"))
    except:
        raise HTTPException(status_code=400, detail="تنسيق التاريخ غير صحيح")
    
    # Create the log
    new_log = hr_models.AttendanceLog(
        employee_pk=employee.id if employee else None,
        employee_id=employee_code,
        timestamp=timestamp,
        type=log_data["type"],
        # Mark as manually created
        is_manually_edited=True,
        edited_by=current_user.id,
        edited_at=datetime.utcnow(),
        edit_reason=log_data.get("reason", "إضافة يدوية"),
        # Mark as protected from sync
        raw_status="MANUAL"
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    logger.info(f"➕ Manual attendance log added by {current_user.email}: {employee_code} - {log_data['type']}")
    
    return {
        "status": "success",
        "message": "تمت إضافة الحركة يدوياً بنجاح",
        "log": {
            "id": new_log.id,
            "employee_id": new_log.employee_id,
            "timestamp": new_log.timestamp.isoformat(),
            "type": new_log.type,
            "is_manually_edited": new_log.is_manually_edited
        }
    }


@router.delete("/attendance/{log_id}")
def delete_attendance_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete an attendance log (soft delete by marking as manually deleted).
    """
    import logging
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    # Get the log
    log = db.query(hr_models.AttendanceLog).filter(
        hr_models.AttendanceLog.id == log_id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="سجل الحضور غير موجود")
    
    # Mark as deleted instead of actually deleting (for audit trail)
    log.is_manually_edited = True
    log.edited_by = current_user.id
    log.edited_at = datetime.utcnow()
    log.edit_reason = "تم الحذف يدوياً"
    log.raw_status = "DELETED"
    log.type = "deleted"
    
    db.commit()
    
    logger.info(f"🗑️ Attendance log {log_id} deleted by {current_user.email}")
    
    return {
        "status": "success",
        "message": "تم حذف السجل بنجاح (تم الحفاظ على سجل المحاولة)"
    }


@router.put("/attendance/{log_id}/protect")
def protect_attendance_log(
    log_id: int,
    protect_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Protect an attendance log from being overwritten by device sync.
    """
    import logging
    from datetime import datetime
    logger = logging.getLogger(__name__)
    
    log = db.query(hr_models.AttendanceLog).filter(
        hr_models.AttendanceLog.id == log_id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="سجل الحضور غير موجود")
    
    protect = protect_data.get("protected", True)
    
    # Add protection status field if not exists (will be added to DB separately)
    log.is_manually_edited = True
    log.edit_reason = f"محمي من المزامنة: {protect_data.get('reason', '')}" if protect else "غير محمي"
    
    db.commit()
    
    logger.info(f"🛡️ Attendance log {log_id} protection set to {protect} by {current_user.email}")
    
    return {
        "status": "success",
        "message": f"تم {'حماية' if protect else 'إلغاء حماية'} السجل بنجاح",
        "log_id": log_id,
        "protected": protect
    }
