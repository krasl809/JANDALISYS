"""
Hierarchical Leave Management Router
API endpoints for leave management with multi-level approval
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import date, datetime, timedelta
from uuid import UUID
import uuid

from core.database import get_db
from core.auth import get_current_user, require_permission
from models import User, Employee
from models.leave_models import LeaveRequest, LeaveType, EmployeeLeaveBalance
from models.hierarchical_approval_models import (
    Facility, Department, EmployeeAttendanceGPS,
    LeaveRequestApproval, ApprovalStatus
)
from services.excel_import_service import ExcelImportService
from services.hierarchical_approval_engine import HierarchicalApprovalEngine
from services.attendance_gps_service import AttendanceGPSService
from services.notification_service import NotificationService

router = APIRouter(prefix="/hierarchical-leave", tags=["Hierarchical Leave Management"])


# ==================== EXCEL IMPORT ENDPOINTS ====================

@router.post("/import-employees")
async def import_employees_from_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import employee data from Excel file
    Requires HR or Admin permissions
    """
    # Check permissions
    if current_user.role not in ['admin', 'hr_manager']:
        raise HTTPException(
            status_code=403,
            detail="غير مصرح لك بالاستيراد. يجب أن تكون مدير موارد بشرية أو مسؤول نظام."
        )
    
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="نوع الملف غير مدعوم. يرجى استخدام ملف Excel (.xlsx أو .xls)"
        )
    
    # Save file temporarily
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Import data
        service = ExcelImportService(db)
        result = service.import_employees(tmp_file_path, current_user.id)
        
        return result
    
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@router.get("/import-template")
async def get_import_template(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get Excel import template structure"""
    service = ExcelImportService(db)
    return service.get_import_template()


# ==================== LEAVE REQUEST ENDPOINTS ====================

@router.post("/leave-requests")
async def create_leave_request(
    leave_type_id: UUID,
    start_date: date,
    end_date: date,
    reason: Optional[str] = None,
    is_half_day: bool = False,
    is_hourly: bool = False,
    hours_requested: float = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new leave request"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    # Validate dates
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="تاريخ النهاية يجب أن يكون بعد تاريخ البداية"
        )
    
    # Calculate total days
    total_days = (end_date - start_date).days + 1
    
    # Generate request number
    request_number = f"LR-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    # Create leave request
    leave_request = LeaveRequest(
        id=uuid.uuid4(),
        request_number=request_number,
        employee_id=employee.id,
        leave_type_id=leave_type_id,
        start_date=start_date,
        end_date=end_date,
        total_days=total_days,
        deduction_days=total_days if not is_half_day else total_days * 0.5,
        is_half_day=is_half_day,
        is_hourly=is_hourly,
        hours_requested=hours_requested,
        reason=reason,
        status='draft'
    )
    
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    
    return {
        'success': True,
        'message': 'تم إنشاء طلب الإجازة بنجاح',
        'request_id': str(leave_request.id),
        'request_number': leave_request.request_number
    }


@router.post("/leave-requests/{request_id}/submit")
async def submit_leave_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit leave request for approval"""
    
    engine = HierarchicalApprovalEngine(db)
    result = engine.submit_leave_request(request_id)
    
    return result


@router.post("/leave-requests/{request_id}/approve")
async def approve_leave_request(
    request_id: UUID,
    approved: bool,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or reject leave request"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    engine = HierarchicalApprovalEngine(db)
    result = engine.approve_leave_request(
        request_id,
        employee.id,
        approved,
        notes
    )
    
    return result


@router.get("/leave-requests/pending")
async def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending approvals for current user"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    engine = HierarchicalApprovalEngine(db)
    pending = engine.get_pending_approvals(employee.id)
    
    return {
        'pending_approvals': pending,
        'total': len(pending)
    }


@router.get("/leave-requests/{request_id}/history")
async def get_leave_request_history(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval history for a leave request"""
    
    engine = HierarchicalApprovalEngine(db)
    history = engine.get_approval_history(request_id)
    
    return {
        'leave_request_id': str(request_id),
        'history': history
    }


@router.get("/leave-requests/my-requests")
async def get_my_leave_requests(
    status: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave requests for current user"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    query = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee.id
    )
    
    if status:
        query = query.filter(LeaveRequest.status == status)
    
    if year:
        query = query.filter(
            func.extract('year', LeaveRequest.start_date) == year
        )
    
    requests = query.order_by(LeaveRequest.created_at.desc()).all()
    
    return {
        'employee_id': str(employee.id),
        'employee_name': employee.full_name,
        'requests': [
            {
                'id': str(req.id),
                'request_number': req.request_number,
                'leave_type': req.leave_type.name if req.leave_type else 'Unknown',
                'start_date': req.start_date.isoformat(),
                'end_date': req.end_date.isoformat(),
                'total_days': float(req.total_days),
                'status': req.status,
                'reason': req.reason,
                'created_at': req.created_at.isoformat()
            }
            for req in requests
        ],
        'total': len(requests)
    }


# ==================== EMPLOYEE PROFILE ENDPOINTS ====================

@router.get("/employee/profile")
async def get_employee_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get employee profile with leave balance and attendance"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    # Get leave balances
    current_year = datetime.now().year
    balances = db.query(EmployeeLeaveBalance).filter(
        and_(
            EmployeeLeaveBalance.employee_id == employee.id,
            EmployeeLeaveBalance.year == current_year
        )
    ).all()
    
    # Get today's attendance
    attendance_service = AttendanceGPSService(db)
    today_attendance = attendance_service.get_today_attendance(employee.id)
    
    # Get pending leave requests
    pending_requests = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.status.in_(['pending', 'approved_level_1', 'approved_level_2', 'approved_level_3'])
        )
    ).count()
    
    return {
        'employee': {
            'id': str(employee.id),
            'code': employee.code,
            'full_name': employee.full_name,
            'email': employee.work_email,
            'department': employee.department_name,
            'position': employee.position,
            'company': employee.company,
            'hire_date': employee.joining_date.isoformat() if employee.joining_date else None,
            'status': employee.status
        },
        'leave_balances': [
            {
                'leave_type': balance.leave_type.name if balance.leave_type else 'Unknown',
                'allocated': float(balance.allocated_days),
                'used': float(balance.used_days),
                'pending': float(balance.pending_days),
                'remaining': float(balance.remaining_days)
            }
            for balance in balances
        ],
        'today_attendance': today_attendance,
        'pending_requests': pending_requests
    }


# ==================== ATTENDANCE ENDPOINTS ====================

@router.post("/attendance/record")
async def record_attendance(
    attendance_type: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_accuracy: Optional[float] = None,
    photo_base64: Optional[str] = None,
    device_type: Optional[str] = None,
    device_id: Optional[str] = None,
    device_model: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record attendance with GPS and camera"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    # Validate attendance type
    if attendance_type not in ['check_in', 'check_out']:
        raise HTTPException(
            status_code=400,
            detail="نوع البصمة غير صحيح. يجب أن يكون check_in أو check_out"
        )
    
    service = AttendanceGPSService(db)
    result = service.record_attendance(
        employee_id=employee.id,
        attendance_type=attendance_type,
        latitude=latitude,
        longitude=longitude,
        location_accuracy=location_accuracy,
        photo_base64=photo_base64,
        device_type=device_type,
        device_id=device_id,
        device_model=device_model,
        ip_address=current_user.ip if hasattr(current_user, 'ip') else None
    )
    
    return result


@router.get("/attendance/today")
async def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get today's attendance for current user"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    service = AttendanceGPSService(db)
    today = service.get_today_attendance(employee.id)
    
    return today


@router.get("/attendance/history")
async def get_attendance_history(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance history for current user"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    service = AttendanceGPSService(db)
    history = service.get_employee_attendance(
        employee.id,
        start_date,
        end_date
    )
    
    return {
        'employee_id': str(employee.id),
        'employee_name': employee.full_name,
        'attendance': history
    }


@router.get("/attendance/summary")
async def get_attendance_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance summary for a month"""
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=400,
            detail="لم يتم العثور على ملف الموظف"
        )
    
    service = AttendanceGPSService(db)
    summary = service.get_attendance_summary(
        employee.id,
        month,
        year
    )
    
    return summary


# ==================== HR SETTINGS ENDPOINTS ====================

@router.get("/hr/settings")
async def get_hr_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get HR settings (HR Manager only)"""
    
    # Check permissions
    if current_user.role not in ['admin', 'hr_manager']:
        raise HTTPException(
            status_code=403,
            detail="غير مصرح لك بالوصول إلى إعدادات الموارد البشرية"
        )
    
    from models.hierarchical_approval_models import HRSettings
    
    settings = db.query(HRSettings).filter(
        HRSettings.is_active == True
    ).all()
    
    return {
        'settings': [
            {
                'key': setting.setting_key,
                'value': setting.setting_value,
                'type': setting.setting_type,
                'description': setting.description,
                'category': setting.category
            }
            for setting in settings
        ]
    }


@router.post("/hr/register-employee")
async def register_employee(
    employee_code: str,
    full_name: str,
    hire_date: date,
    annual_leave_balance_start: float = 0,
    annual_leave_balance_remaining: float = 0,
    facility_id: Optional[UUID] = None,
    job_title: Optional[str] = None,
    department_id: Optional[UUID] = None,
    direct_supervisor_id: Optional[UUID] = None,
    department_manager_id: Optional[UUID] = None,
    facility_manager_id: Optional[UUID] = None,
    hr_manager_id: Optional[UUID] = None,
    executive_manager_id: Optional[UUID] = None,
    profile_picture_base64: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register new employee with camera photo (HR Manager only)"""
    
    # Check permissions
    if current_user.role not in ['admin', 'hr_manager']:
        raise HTTPException(
            status_code=403,
            detail="غير مصرح لك بتسجيل الموظفين"
        )
    
    # Check if employee code already exists
    existing = db.query(Employee).filter(
        Employee.code == employee_code
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"الرقم الوظيفي {employee_code} موجود بالفعل"
        )
    
    # Save photo if provided
    profile_picture_url = None
    if profile_picture_base64:
        import base64
        import os
        
        upload_dir = "uploads/profile_pictures"
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = f"{employee_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(upload_dir, filename)
        
        photo_data = base64.b64decode(profile_picture_base64)
        with open(filepath, "wb") as f:
            f.write(photo_data)
        
        profile_picture_url = f"/uploads/profile_pictures/{filename}"
    
    # Create employee
    employee = Employee(
        id=uuid.uuid4(),
        code=employee_code,
        first_name=full_name.split()[0] if full_name else '',
        last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
        full_name=full_name,
        work_email=f"{employee_code}@company.com",
        position=job_title,
        joining_date=hire_date,
        status='active',
        employment_type='full_time'
    )
    
    db.add(employee)
    db.flush()
    
    # Create user account
    from core.auth import get_password_hash
    from models.core_models import User
    
    user = User(
        id=uuid.uuid4(),
        name=full_name,
        email=f"{employee_code}@company.com",
        password=get_password_hash("123456"),  # Default password
        role='employee',
        is_active=True
    )
    
    db.add(user)
    db.flush()
    
    # Link employee to user
    employee.user_id = user.id
    
    db.commit()
    
    return {
        'success': True,
        'message': 'تم تسجيل الموظف بنجاح',
        'employee_id': str(employee.id),
        'user_id': str(user.id),
        'employee_code': employee_code,
        'default_password': '123456'
    }
