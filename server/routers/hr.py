from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, or_
from core.database import get_db
from models import hr_models, core_models, employee_models
from core.auth import get_current_user_obj, require_permission
from services.zk_service import ZkTecoService
from services.import_service import EmployeeImportService
import datetime
import uuid

# Define permissions
PERM_HR_READ = "hr_read"
PERM_HR_WRITE = "hr_write"

router = APIRouter(prefix="/hr", tags=["HR Management"])

@router.get("/dashboard")
def get_hr_dashboard(db: Session = Depends(get_db), current_user = Depends(get_current_user_obj)):
    # Simple stats
    today = datetime.date.today()
    total_employees = db.query(employee_models.Employee).filter(employee_models.Employee.status == 'active').count()
    
    # Attendance today
    today_logs = db.query(hr_models.AttendanceLog).filter(
        func.date(hr_models.AttendanceLog.timestamp) == today
    ).all()
    
    present_count = len(set(log.employee_id for log in today_logs)) 
    
    return {
        "total_employees": total_employees,
        "present_today": present_count,
        "late_today": 0, # TODO: recalculate based on shift
        "absent_today": total_employees - present_count
    }

# --- EMPLOYEE MANAGEMENT ---

@router.get("/employees")
def get_employees(
    db: Session = Depends(get_db),
    search: str = Query(None),
    department: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1)
):
    """
    Get all employees with their basic details. Supports search and pagination.
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
        query = query.filter(employee_models.Employee.department_name == department)
    
    if status:
        query = query.filter(employee_models.Employee.status == status)
    
    # Order by employee code for consistent results
    query = query.order_by(employee_models.Employee.code.asc())
        
    total = query.count()
    offset = (page - 1) * limit
    employees = query.offset(offset).limit(limit).all()
    
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

@router.put("/employees/{emp_id}")
def update_employee(
    emp_id: str, 
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
    emp_id: str,
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

@router.get("/attendance")
def get_attendance(
    db: Session = Depends(get_db),
    employee_id: str = Query(None),
    department: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    raw: bool = Query(False)
):
    query = db.query(
        hr_models.AttendanceLog,
        employee_models.Employee
    ).outerjoin(
        employee_models.Employee, 
        or_(
            hr_models.AttendanceLog.employee_pk == employee_models.Employee.id,
            hr_models.AttendanceLog.employee_id == employee_models.Employee.code
        )
    )

    if start_date:
        query = query.filter(func.date(hr_models.AttendanceLog.timestamp) >= start_date)
    if end_date:
        query = query.filter(func.date(hr_models.AttendanceLog.timestamp) <= end_date)
    if employee_id:
        # Check both UUID and Code for flexibility
        query = query.filter(
            or_(
                employee_models.Employee.id == employee_id,
                employee_models.Employee.code == employee_id
            )
        )
    if department:
        query = query.filter(employee_models.Employee.department_name == department)

    logs = query.order_by(hr_models.AttendanceLog.timestamp.asc()).all()
    
    # Format Raw Logs
    raw_results = [{
        "id": log.AttendanceLog.id,
        "employee_id": log.Employee.code if log.Employee else log.AttendanceLog.employee_id,
        "employee_pk": str(log.Employee.id) if log.Employee else None,
        "employee_name": log.Employee.full_name if log.Employee else f"Unknown ({log.AttendanceLog.employee_id})",
        "timestamp": log.AttendanceLog.timestamp.isoformat(),
        "type": log.AttendanceLog.type,
        "status": log.AttendanceLog.status,
        "device": log.AttendanceLog.device.name if log.AttendanceLog.device else "Manual"
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
                processed_sessions.extend(process_employee_sessions(current_emp, emp_logs, db))
            current_emp = log["employee_id"]
            emp_logs = [log]
        else:
            emp_logs.append(log)
            
    if current_emp:
        processed_sessions.extend(process_employee_sessions(current_emp, emp_logs, db))

    return processed_sessions

def process_employee_sessions(emp_id, logs, db):
    sessions = []
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
                # New session started without check_out
                break
            session_logs.append(next_log)
            j += 1
        
        # Process the session
        sessions.append(calculate_session_metrics(emp_id, session_logs, db))
        i += 1
        
    return sessions

def calculate_session_metrics(emp_id, session_logs, db):
    first_in = session_logs[0]
    last_out = next((l for l in reversed(session_logs) if l["type"] == "check_out"), None)
    
    emp_pk = first_in["employee_pk"]
    emp_name = first_in["employee_name"]
    check_in_dt = datetime.datetime.fromisoformat(first_in["timestamp"])
    date_str = first_in["timestamp"][:10]
    
    # Fetch Shift Policy
    try:
        emp_pk = uuid.UUID(first_in["employee_pk"])
        assignment = db.query(hr_models.EmployeeShiftAssignment).filter(
            hr_models.EmployeeShiftAssignment.employee_id == emp_pk,
            hr_models.EmployeeShiftAssignment.start_date <= check_in_dt,
            or_(hr_models.EmployeeShiftAssignment.end_date == None, hr_models.EmployeeShiftAssignment.end_date >= check_in_dt)
        ).order_by(hr_models.EmployeeShiftAssignment.start_date.desc()).first()
    except (ValueError, TypeError):
        assignment = None
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
        
    capacity = shift.expected_hours if shift else 8.0
    actual_work = max(0, total_hours - break_duration)
    
    # Multiplier Logic
    day_name = check_in_dt.strftime('%A')
    is_holiday = shift and day_name in shift.holiday_days
    multiplier = (shift.multiplier_holiday if is_holiday else shift.multiplier_normal) if shift else 1.0
    
    overtime = 0
    ot_threshold = (shift.ot_threshold if shift else 30) / 60.0
    if actual_work > (capacity + ot_threshold):
        overtime = round((actual_work - capacity) * multiplier, 2)
        
    # Status calculation
    status = "present"
    if shift and shift.start_time: # Added 'shift and' check here
        shift_start_hour, shift_start_min = map(int, shift.start_time.split(':'))
        shift_in_dt = check_in_dt.replace(hour=shift_start_hour, minute=shift_start_min, second=0, microsecond=0)
        
        # Late check-in
        if check_in_dt > shift_in_dt + datetime.timedelta(minutes=shift.grace_period_in or 0):
            status = "late"
            
    if last_out and shift and shift.end_time:
        check_out_dt = datetime.datetime.fromisoformat(last_out["timestamp"])
        shift_out_hour, shift_out_min = map(int, shift.end_time.split(':'))
        
        # For cross-day shifts (e.g. 22:00 to 06:00)
        # shift_in_dt is on the day the employee checked in
        shift_out_dt = shift_in_dt.replace(hour=shift_out_hour, minute=shift_out_min, second=0, microsecond=0)
        if shift.end_time < shift.start_time:
            shift_out_dt += datetime.timedelta(days=1)
        
        # Early leave (if they left before shift end minus grace)
        if check_out_dt < shift_out_dt - datetime.timedelta(minutes=shift.grace_period_out or 0):
            if status == "present": 
                status = "early_leave"
            elif status == "late":
                status = "late & early_leave"
    elif not last_out:
        status = "ongoing"
            
    return {
        "employee_id": emp_id,
        "employee_pk": emp_pk,
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
        "is_holiday": is_holiday
    }

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
    
    start_date = datetime.datetime.fromisoformat(start_date_str) if start_date_str else datetime.datetime.utcnow()

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
