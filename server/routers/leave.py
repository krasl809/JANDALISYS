"""
Leave Management Router
Comprehensive API for leave management system with multi-level approval
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import date, datetime, timedelta
from uuid import UUID
import uuid
import math
import json

from core.database import get_db
from core.auth import get_current_user
from models import User, Employee
from models.leave_models import (
    LeaveType, LeavePolicy, EmployeeLeaveBalance, ApprovalChain, LeaveRequest,
    LeaveEntitlement, LeaveApprovalHistory, LeaveCalendar, PublicHoliday, LeaveReport,
    ApprovalWorkflow, ApprovalWorkflowStep, WorkflowEmployeeGroup, LeaveRequestApprovalStep
)
from schemas.leave_schemas import *

router = APIRouter(prefix="/leave", tags=["Leave Management"])


# ==================== UTILITY FUNCTIONS ====================

def generate_request_number():
    """Generate unique request number"""
    today = datetime.now()
    return f"LR-{today.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def calculate_leave_days(start_date: date, end_date: date, 
                        exclude_weekends: bool = True, 
                        exclude_holidays: bool = True,
                        db: Session = None) -> float:
    """Calculate number of leave days excluding weekends and holidays"""
    from dateutil import rrule
    
    total_days = (end_date - start_date).days + 1
    if total_days <= 0:
        return 0
    
    # Get public holidays
    holidays = []
    if exclude_holidays and db:
        holiday_list = db.query(PublicHoliday).filter(
            PublicHoliday.is_active == True
        ).all()
        for h in holiday_list:
            if h.is_recurring:
                # For recurring holidays, check all years in range
                for year in range(start_date.year, end_date.year + 1):
                    if h.end_date:
                        holidays.append(h.date.replace(year=year))
                        holidays.append(h.end_date.replace(year=year))
                    else:
                        holidays.append(h.date.replace(year=year))
            else:
                holidays.append(h.date)
                if h.end_date:
                    holidays.append(h.end_date)
    
    # Count working days
    working_days = 0
    current = start_date
    while current <= end_date:
        is_weekend = current.weekday() in [5, 6]  # Saturday, Sunday
        is_holiday = current in holidays
        
        if exclude_weekends and is_weekend:
            pass  # Skip weekend
        elif exclude_holidays and is_holiday:
            pass  # Skip holiday
        else:
            working_days += 1
        
        current += timedelta(days=1)
    
    return float(working_days)


def get_user_approver_level(user_id: UUID, employee_id: UUID, db: Session) -> int:
    """Determine if user is an approver for the employee"""
    # Get employee's department
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return 0
    
    # Check if user is the employee's manager (level 1)
    # This is a simplified check - in real system, would check reporting structure
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return 0
    
    # For now, HR managers can approve all
    if user.role and user.role.name in ['admin', 'hr_manager']:
        return 3  # Can approve all levels
    
    return 0


def update_leave_balance(employee_id: UUID, leave_type_id: UUID, year: int, 
                         days_delta: float, is_pending: bool = False, db: Session = None):
    """Update employee leave balance"""
    balance = db.query(EmployeeLeaveBalance).filter(
        and_(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.leave_type_id == leave_type_id,
            EmployeeLeaveBalance.year == year
        )
    ).first()
    
    if not balance:
        # Create new balance
        balance = EmployeeLeaveBalance(
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            year=year,
            allocated_days=0,
            used_days=0,
            pending_days=0,
            remaining_days=0
        )
        db.add(balance)
    
    if is_pending:
        balance.pending_days = float(balance.pending_days or 0) + days_delta
    else:
        balance.used_days = float(balance.used_days or 0) + days_delta
    
    balance.remaining_days = float(balance.allocated_days or 0) - float(balance.used_days or 0) - float(balance.pending_days or 0)
    balance.last_updated = datetime.now()
    
    return balance


def add_approval_history(leave_request_id: UUID, actor_id: UUID, action: str,
                          level: Optional[int], previous_status: Optional[str],
                          new_status: str, notes: Optional[str], db: Session):
    """Add approval history entry"""
    history = LeaveApprovalHistory(
        leave_request_id=leave_request_id,
        actor_id=actor_id,
        action=action,
        level=level,
        previous_status=previous_status,
        new_status=new_status,
        notes=notes
    )
    db.add(history)


# ==================== LEAVE TYPE ENDPOINTS ====================

@router.get("/types", response_model=List[LeaveTypeResponse])
def get_leave_types(
    is_active: Optional[bool] = None,
    is_visible: Optional[bool] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all leave types"""
    query = db.query(LeaveType)
    
    if is_active is not None:
        query = query.filter(LeaveType.is_active == is_active)
    if is_visible is not None:
        query = query.filter(LeaveType.is_visible_to_employees == is_visible)
    if category:
        query = query.filter(LeaveType.category == category)
    
    return query.order_by(LeaveType.name).all()


@router.get("/types/{leave_type_id}", response_model=LeaveTypeResponse)
def get_leave_type(
    leave_type_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single leave type"""
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    return leave_type


@router.post("/types", response_model=LeaveTypeResponse)
def create_leave_type(
    leave_type: LeaveTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new leave type (Admin only)"""
    # Check if code already exists
    existing = db.query(LeaveType).filter(LeaveType.code == leave_type.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Leave type code already exists")
    
    db_leave_type = LeaveType(**leave_type.dict())
    db.add(db_leave_type)
    db.commit()
    db.refresh(db_leave_type)
    return db_leave_type


@router.put("/types/{leave_type_id}", response_model=LeaveTypeResponse)
def update_leave_type(
    leave_type_id: UUID,
    leave_type: LeaveTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update leave type (Admin only)"""
    db_leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not db_leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    update_data = leave_type.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_leave_type, key, value)
    
    db.commit()
    db.refresh(db_leave_type)
    return db_leave_type


@router.delete("/types/{leave_type_id}")
def delete_leave_type(
    leave_type_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete leave type (Admin only)"""
    db_leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not db_leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    # Check if there are any requests using this type
    requests_count = db.query(LeaveRequest).filter(
        LeaveRequest.leave_type_id == leave_type_id
    ).count()
    
    if requests_count > 0:
        # Instead of deleting, just deactivate
        db_leave_type.is_active = False
        db.commit()
        return {"message": "Leave type deactivated (has existing requests)"}
    
    db.delete(db_leave_type)
    db.commit()
    return {"message": "Leave type deleted"}


# ==================== LEAVE POLICY ENDPOINTS ====================

@router.get("/policies", response_model=List[LeavePolicyResponse])
def get_leave_policies(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all leave policies"""
    query = db.query(LeavePolicy)
    if is_active is not None:
        query = query.filter(LeavePolicy.is_active == is_active)
    return query.order_by(LeavePolicy.effective_from.desc()).all()


@router.get("/policies/{policy_id}", response_model=LeavePolicyResponse)
def get_leave_policy(
    policy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single leave policy"""
    policy = db.query(LeavePolicy).filter(LeavePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    return policy


@router.post("/policies", response_model=LeavePolicyResponse)
def create_leave_policy(
    policy: LeavePolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new leave policy (Admin only)"""
    db_policy = LeavePolicy(**policy.dict())
    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy


@router.put("/policies/{policy_id}", response_model=LeavePolicyResponse)
def update_leave_policy(
    policy_id: UUID,
    policy: LeavePolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update leave policy (Admin only)"""
    db_policy = db.query(LeavePolicy).filter(LeavePolicy.id == policy_id).first()
    if not db_policy:
        raise HTTPException(status_code=404, detail="Leave policy not found")
    
    update_data = policy.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_policy, key, value)
    
    db.commit()
    db.refresh(db_policy)
    return db_policy


# ==================== EMPLOYEE LEAVE BALANCE ENDPOINTS ====================

@router.get("/balances/me", response_model=EmployeeLeaveBalanceSummary)
def get_my_leave_balances(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's leave balances"""
    # Get employee ID from user
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=400, detail="Employee profile not found for current user")
    
    employee_id = employee.id
    
    if year is None:
        year = datetime.now().year
    
    balances = db.query(EmployeeLeaveBalance).filter(
        and_(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.year == year
        )
    ).all()
    
    # Get leave type info for each balance
    result_balances = []
    total_allocated = 0
    total_used = 0
    total_pending = 0
    total_remaining = 0
    
    for balance in balances:
        leave_type = db.query(LeaveType).filter(LeaveType.id == balance.leave_type_id).first()
        
        balance_dict = {
            "id": balance.id,
            "employee_id": balance.employee_id,
            "leave_type_id": balance.leave_type_id,
            "allocated_days": float(balance.allocated_days or 0),
            "used_days": float(balance.used_days or 0),
            "pending_days": float(balance.pending_days or 0),
            "remaining_days": float(balance.remaining_days or 0),
            "carried_over_days": float(balance.carried_over_days or 0),
            "encashed_days": float(balance.encashed_days or 0),
            "year": balance.year,
            "last_updated": balance.last_updated,
            "leave_type_name": leave_type.name if leave_type else None,
            "leave_type_code": leave_type.code if leave_type else None,
            "leave_type_color": leave_type.color if leave_type else None
        }
        
        result_balances.append(EmployeeLeaveBalanceResponse(**balance_dict))
        
        total_allocated += float(balance.allocated_days or 0)
        total_used += float(balance.used_days or 0)
        total_pending += float(balance.pending_days or 0)
        total_remaining += float(balance.remaining_days or 0)
    
    return EmployeeLeaveBalanceSummary(
        employee_id=employee_id,
        year=year,
        balances=result_balances,
        total_allocated=total_allocated,
        total_used=total_used,
        total_pending=total_pending,
        total_remaining=total_remaining
    )

@router.get("/balances/{employee_id}", response_model=EmployeeLeaveBalanceSummary)
def get_employee_leave_balances(
    employee_id: UUID,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all leave balances for an employee"""
    if year is None:
        year = datetime.now().year
    
    balances = db.query(EmployeeLeaveBalance).filter(
        and_(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.year == year
        )
    ).all()
    
    # Get leave type info for each balance
    result_balances = []
    total_allocated = 0
    total_used = 0
    total_pending = 0
    total_remaining = 0
    
    for balance in balances:
        leave_type = db.query(LeaveType).filter(LeaveType.id == balance.leave_type_id).first()
        
        balance_dict = {
            "id": balance.id,
            "employee_id": balance.employee_id,
            "leave_type_id": balance.leave_type_id,
            "allocated_days": float(balance.allocated_days or 0),
            "used_days": float(balance.used_days or 0),
            "pending_days": float(balance.pending_days or 0),
            "remaining_days": float(balance.remaining_days or 0),
            "carried_over_days": float(balance.carried_over_days or 0),
            "encashed_days": float(balance.encashed_days or 0),
            "year": balance.year,
            "last_updated": balance.last_updated,
            "leave_type_name": leave_type.name if leave_type else None,
            "leave_type_code": leave_type.code if leave_type else None,
            "leave_type_color": leave_type.color if leave_type else None
        }
        
        result_balances.append(EmployeeLeaveBalanceResponse(**balance_dict))
        
        total_allocated += float(balance.allocated_days or 0)
        total_used += float(balance.used_days or 0)
        total_pending += float(balance.pending_days or 0)
        total_remaining += float(balance.remaining_days or 0)
    
    return EmployeeLeaveBalanceSummary(
        employee_id=employee_id,
        year=year,
        balances=result_balances,
        total_allocated=total_allocated,
        total_used=total_used,
        total_pending=total_pending,
        total_remaining=total_remaining
    )


@router.get("/balances/{employee_id}/{leave_type_id}", response_model=EmployeeLeaveBalanceResponse)
def get_employee_specific_balance(
    employee_id: UUID,
    leave_type_id: UUID,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific leave balance for an employee"""
    if year is None:
        year = datetime.now().year
    
    balance = db.query(EmployeeLeaveBalance).filter(
        and_(
            EmployeeLeaveBalance.employee_id == employee_id,
            EmployeeLeaveBalance.leave_type_id == leave_type_id,
            EmployeeLeaveBalance.year == year
        )
    ).first()
    
    if not balance:
        # Return empty balance
        leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
        return EmployeeLeaveBalanceResponse(
            id=uuid.uuid4(),
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            allocated_days=0,
            used_days=0,
            pending_days=0,
            remaining_days=0,
            carried_over_days=0,
            encashed_days=0,
            year=year,
            leave_type_name=leave_type.name if leave_type else None,
            leave_type_code=leave_type.code if leave_type else None,
            leave_type_color=leave_type.color if leave_type else None
        )
    
    leave_type = db.query(LeaveType).filter(LeaveType.id == balance.leave_type_id).first()
    
    return EmployeeLeaveBalanceResponse(
        id=balance.id,
        employee_id=balance.employee_id,
        leave_type_id=balance.leave_type_id,
        allocated_days=float(balance.allocated_days or 0),
        used_days=float(balance.used_days or 0),
        pending_days=float(balance.pending_days or 0),
        remaining_days=float(balance.remaining_days or 0),
        carried_over_days=float(balance.carried_over_days or 0),
        encashed_days=float(balance.encashed_days or 0),
        year=balance.year,
        last_updated=balance.last_updated,
        leave_type_name=leave_type.name if leave_type else None,
        leave_type_code=leave_type.code if leave_type else None,
        leave_type_color=leave_type.color if leave_type else None
    )


@router.post("/balances/adjust")
def adjust_leave_balance(
    adjustment: LeaveBalanceAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adjust employee leave balance (Admin/HR only)"""
    balance = db.query(EmployeeLeaveBalance).filter(
        and_(
            EmployeeLeaveBalance.employee_id == adjustment.employee_id,
            EmployeeLeaveBalance.leave_type_id == adjustment.leave_type_id,
            EmployeeLeaveBalance.year == adjustment.year
        )
    ).first()
    
    if not balance:
        # Create new balance
        balance = EmployeeLeaveBalance(
            employee_id=adjustment.employee_id,
            leave_type_id=adjustment.leave_type_id,
            year=adjustment.year,
            allocated_days=0,
            used_days=0,
            pending_days=0,
            remaining_days=0
        )
        db.add(balance)
    
    balance.allocated_days = float(balance.allocated_days or 0) + adjustment.adjustment_amount
    balance.remaining_days = float(balance.allocated_days or 0) - float(balance.used_days or 0) - float(balance.pending_days or 0)
    balance.last_updated = datetime.now()
    
    # Create entitlement record
    entitlement = LeaveEntitlement(
        employee_id=adjustment.employee_id,
        leave_type_id=adjustment.leave_type_id,
        year=adjustment.year,
        allocated_days=adjustment.adjustment_amount,
        description=f"Adjustment: {adjustment.reason}",
        is_adjustment=True,
        adjustment_reason=adjustment.reason,
        created_by=current_user.id
    )
    db.add(entitlement)
    
    db.commit()
    db.refresh(balance)
    
    return {"message": "Balance adjusted successfully", "balance": balance}


@router.post("/balances/bulk-entitlement")
def create_bulk_entitlements(
    entitlement_data: BulkLeaveEntitlement,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create bulk leave entitlements for multiple employees"""
    created_count = 0
    
    for employee_id in entitlement_data.employee_ids:
        # Check if entitlement already exists
        existing = db.query(LeaveEntitlement).filter(
            and_(
                LeaveEntitlement.employee_id == employee_id,
                LeaveEntitlement.leave_type_id == entitlement_data.leave_type_id,
                LeaveEntitlement.year == entitlement_data.year
            )
        ).first()
        
        if existing:
            # Update existing
            existing.allocated_days = entitlement_data.allocated_days
            existing.description = entitlement_data.description
        else:
            # Create new
            entitlement = LeaveEntitlement(
                employee_id=employee_id,
                leave_type_id=entitlement_data.leave_type_id,
                year=entitlement_data.year,
                allocated_days=entitlement_data.allocated_days,
                description=entitlement_data.description,
                is_carry_over=entitlement_data.is_carry_over,
                is_adjustment=entitlement_data.is_adjustment,
                adjustment_reason=entitlement_data.adjustment_reason,
                created_by=current_user.id
            )
            db.add(entitlement)
            created_count += 1
        
        # Also update/create balance
        balance = db.query(EmployeeLeaveBalance).filter(
            and_(
                EmployeeLeaveBalance.employee_id == employee_id,
                EmployeeLeaveBalance.leave_type_id == entitlement_data.leave_type_id,
                EmployeeLeaveBalance.year == entitlement_data.year
            )
        ).first()
        
        if not balance:
            balance = EmployeeLeaveBalance(
                employee_id=employee_id,
                leave_type_id=entitlement_data.leave_type_id,
                year=entitlement_data.year,
                allocated_days=0,
                used_days=0,
                pending_days=0,
                remaining_days=0
            )
            db.add(balance)
        
        balance.allocated_days = float(balance.allocated_days or 0) + entitlement_data.allocated_days
        balance.remaining_days = float(balance.allocated_days or 0) - float(balance.used_days or 0) - float(balance.pending_days or 0)
        balance.last_updated = datetime.now()
    
    db.commit()
    
    return {"message": f"Created {created_count} entitlements"}


# ==================== LEAVE REQUEST ENDPOINTS ====================

@router.post("/requests", response_model=LeaveRequestResponse)
def create_leave_request(
    request_data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new leave request"""
    # Get employee ID from user if not provided
    employee_id = request_data.employee_id
    if not employee_id:
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not employee:
            raise HTTPException(status_code=400, detail="Employee profile not found")
        employee_id = employee.id
    
    # Get leave type
    leave_type = db.query(LeaveType).filter(LeaveType.id == request_data.leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=400, detail="Leave type not found")
    
    # Calculate days
    total_days = calculate_leave_days(
        request_data.start_date, 
        request_data.end_date,
        exclude_weekends=True,
        exclude_holidays=True,
        db=db
    )
    
    if request_data.is_half_day:
        total_days = 0.5
    
    # Check balance for paid leave types
    if leave_type.is_paid:
        current_year = datetime.now().year
        balance = db.query(EmployeeLeaveBalance).filter(
            and_(
                EmployeeLeaveBalance.employee_id == employee_id,
                EmployeeLeaveBalance.leave_type_id == request_data.leave_type_id,
                EmployeeLeaveBalance.year == current_year
            )
        ).first()
        
        if balance:
            available = float(balance.remaining_days or 0)
            if available < total_days:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient leave balance. Available: {available} days, Requested: {total_days} days"
                )
    
    # Create request
    leave_request = LeaveRequest(
        request_number=generate_request_number(),
        employee_id=employee_id,
        leave_type_id=request_data.leave_type_id,
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        start_time=request_data.start_time,
        end_time=request_data.end_time,
        total_days=total_days,
        deduction_days=total_days,
        reason=request_data.reason,
        destination=request_data.destination,
        contact_number=request_data.contact_number,
        documents=request_data.documents,
        document_descriptions=request_data.document_descriptions,
        is_half_day=request_data.is_half_day,
        is_hourly=request_data.is_hourly,
        hours_requested=request_data.hours_requested,
        handover_to_employee_id=request_data.handover_to_employee_id,
        handover_notes=request_data.handover_notes,
        replacement_employee_id=request_data.replacement_employee_id,
        status="draft"
    )
    
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    
    return _build_leave_request_response(leave_request, db)


def _build_leave_request_response(leave_request: LeaveRequest, db: Session) -> LeaveRequestResponse:
    """Build leave request response with related info"""
    employee = db.query(Employee).filter(Employee.id == leave_request.employee_id).first()
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_request.leave_type_id).first()
    
    response_data = {
        "id": leave_request.id,
        "request_number": leave_request.request_number,
        "employee_id": leave_request.employee_id,
        "leave_type_id": leave_request.leave_type_id,
        "start_date": leave_request.start_date,
        "end_date": leave_request.end_date,
        "start_time": leave_request.start_time,
        "end_time": leave_request.end_time,
        "total_days": float(leave_request.total_days or 0),
        "deduction_days": float(leave_request.deduction_days or 0),
        "reason": leave_request.reason,
        "destination": leave_request.destination,
        "contact_number": leave_request.contact_number,
        "documents": leave_request.documents or [],
        "document_descriptions": leave_request.document_descriptions or [],
        "is_half_day": leave_request.is_half_day,
        "is_hourly": leave_request.is_hourly,
        "hours_requested": float(leave_request.hours_requested or 0),
        "status": leave_request.status,
        
        # Level 1
        "level_1_approver_id": leave_request.level_1_approver_id,
        "level_1_approved_at": leave_request.level_1_approved_at,
        "level_1_approved": leave_request.level_1_approved,
        "level_1_notes": leave_request.level_1_notes,
        "level_1_rejected_reason": leave_request.level_1_rejected_reason,
        
        # Level 2
        "level_2_approver_id": leave_request.level_2_approver_id,
        "level_2_approved_at": leave_request.level_2_approved_at,
        "level_2_approved": leave_request.level_2_approved,
        "level_2_notes": leave_request.level_2_notes,
        "level_2_rejected_reason": leave_request.level_2_rejected_reason,
        
        # Level 3
        "level_3_approver_id": leave_request.level_3_approver_id,
        "level_3_approved_at": leave_request.level_3_approved_at,
        "level_3_approved": leave_request.level_3_approved,
        "level_3_notes": leave_request.level_3_notes,
        "level_3_rejected_reason": leave_request.level_3_rejected_reason,
        
        # Final
        "approved_by": leave_request.approved_by,
        "approved_at": leave_request.approved_at,
        "approval_notes": leave_request.approval_notes,
        "rejection_reason": leave_request.rejection_reason,
        
        "handover_completed": leave_request.handover_completed,
        
        "cancelled_by": leave_request.cancelled_by,
        "cancelled_at": leave_request.cancelled_at,
        "cancellation_reason": leave_request.cancellation_reason,
        
        "expires_at": leave_request.expires_at,
        
        "created_at": leave_request.created_at,
        "updated_at": leave_request.updated_at,
        "submitted_at": leave_request.submitted_at,
        
        # Related info
        "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
        "employee_code": employee.code if employee else None,
        "leave_type_name": leave_type.name if leave_type else None,
        "leave_type_code": leave_type.code if leave_type else None,
        "leave_type_color": leave_type.color if leave_type else None,
        
        "can_approve": False
    }
    
    return LeaveRequestResponse(**response_data)


@router.get("/requests", response_model=LeaveRequestPaginatedResponse)
def get_leave_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    employee_id: Optional[UUID] = None,
    leave_type_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave requests with filtering"""
    query = db.query(LeaveRequest)
    
    # Filter by employee (users can only see their own unless admin/HR)
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    elif not (current_user.role and (isinstance(current_user.role, str) and current_user.role in ['admin', 'hr_manager']) or (hasattr(current_user.role, 'name') and current_user.role.name in ['admin', 'hr_manager'])):
        # Regular users see only their requests
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if employee:
            query = query.filter(LeaveRequest.employee_id == employee.id)
    
    if leave_type_id:
        query = query.filter(LeaveRequest.leave_type_id == leave_type_id)
    
    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)
    
    if from_date:
        query = query.filter(LeaveRequest.start_date >= from_date)
    
    if to_date:
        query = query.filter(LeaveRequest.end_date <= to_date)
    
    # Get total count
    total = query.count()
    pages = math.ceil(total / page_size)
    
    # Get paginated results
    requests = query.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Build responses
    items = [_build_leave_request_response(req, db) for req in requests]
    
    return LeaveRequestPaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/requests/my", response_model=List[LeaveRequestResponse])
def get_my_leave_requests(
    status_filter: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's leave requests"""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        return []
    
    query = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee.id)
    
    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)
    
    if from_date:
        query = query.filter(LeaveRequest.start_date >= from_date)
    
    if to_date:
        query = query.filter(LeaveRequest.end_date <= to_date)
    
    requests = query.order_by(LeaveRequest.created_at.desc()).all()
    return [_build_leave_request_response(req, db) for req in requests]


@router.get("/requests/pending-approval", response_model=List[LeaveRequestResponse])
def get_pending_approval_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave requests pending approval for current user"""
    # Get requests where current user is the approver at some level
    # This is simplified - in real system would check reporting structure
    
    query = db.query(LeaveRequest).filter(
        LeaveRequest.status.in_(['pending', 'approved_level_1', 'approved_level_2'])
    )
    
    requests = query.order_by(LeaveRequest.created_at.desc()).all()
    
    # Filter for HR/admin
    if not (current_user.role and ((isinstance(current_user.role, str) and current_user.role in ['admin', 'hr_manager']) or (hasattr(current_user.role, 'name') and current_user.role.name in ['admin', 'hr_manager']))):
        return []
    
    return [_build_leave_request_response(req, db) for req in requests]


@router.get("/requests/{request_id}", response_model=LeaveRequestResponse)
def get_leave_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single leave request"""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    return _build_leave_request_response(leave_request, db)


@router.put("/requests/{request_id}/submit")
def submit_leave_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a draft leave request for approval"""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft requests can be submitted")
    
    previous_status = leave_request.status
    leave_request.status = "pending"
    leave_request.submitted_at = datetime.now()
    
    # Update balance (add to pending)
    year = leave_request.start_date.year
    update_leave_balance(
        leave_request.employee_id,
        leave_request.leave_type_id,
        year,
        float(leave_request.deduction_days or 0),
        is_pending=True,
        db=db
    )
    
    # Try to find and assign a workflow for this employee
    workflow = get_workflow_for_employee(
        leave_request.employee_id,
        leave_request.leave_type_id,
        db
    )
    
    approval_info = None
    if workflow:
        # Create approval tracking with workflow
        try:
            approval_info = create_approval_tracking(leave_request.id, workflow.id, db)
        except Exception as e:
            print(f"Error creating approval tracking: {e}")
    
    # Add history
    add_approval_history(
        leave_request.id, current_user.id, "submit", None,
        previous_status, "pending", "Leave request submitted", db
    )
    
    db.commit()
    db.refresh(leave_request)
    
    result = {
        "message": "Leave request submitted for approval",
        "request": _build_leave_request_response(leave_request, db)
    }
    
    if approval_info:
        result["approval_info"] = approval_info
        result["workflow_name"] = workflow.name
    
    return result


@router.put("/requests/{request_id}/approve")
def approve_leave_request(
    request_id: UUID,
    approval: LeaveApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve leave request at a specific level"""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.status in ["approved", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status: {leave_request.status}")
    
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_request.leave_type_id).first()
    levels_required = leave_type.approval_levels_required if leave_type else 1
    
    previous_status = leave_request.status
    
    if approval.approved:
        # Approve at the specified level
        if approval.level == 1:
            leave_request.level_1_approver_id = current_user.id
            leave_request.level_1_approved_at = datetime.now()
            leave_request.level_1_approved = True
            leave_request.level_1_notes = approval.notes
            leave_request.status = "approved_level_1" if levels_required > 1 else "approved"
            
            # Remove from pending balance
            year = leave_request.start_date.year
            update_leave_balance(
                leave_request.employee_id,
                leave_request.leave_type_id,
                year,
                -float(leave_request.deduction_days or 0),
                is_pending=True,
                db=db
            )
            # Add to used
            update_leave_balance(
                leave_request.employee_id,
                leave_request.leave_type_id,
                year,
                float(leave_request.deduction_days or 0),
                is_pending=False,
                db=db
            )
            
        elif approval.level == 2:
            leave_request.level_2_approver_id = current_user.id
            leave_request.level_2_approved_at = datetime.now()
            leave_request.level_2_approved = True
            leave_request.level_2_notes = approval.notes
            leave_request.status = "approved_level_2" if levels_required > 2 else "approved"
            
        elif approval.level == 3:
            leave_request.level_3_approver_id = current_user.id
            leave_request.level_3_approved_at = datetime.now()
            leave_request.level_3_approved = True
            leave_request.level_3_notes = approval.notes
            leave_request.status = "approved"
        
        # For backward compatibility
        leave_request.approved_by = current_user.id
        leave_request.approved_at = datetime.now()
        leave_request.approval_notes = approval.notes
        
    else:
        # Reject at the specified level
        if approval.level == 1:
            leave_request.level_1_approver_id = current_user.id
            leave_request.level_1_approved_at = datetime.now()
            leave_request.level_1_approved = False
            leave_request.level_1_rejected_reason = approval.rejection_reason
        elif approval.level == 2:
            leave_request.level_2_approver_id = current_user.id
            leave_request.level_2_approved_at = datetime.now()
            leave_request.level_2_approved = False
            leave_request.level_2_rejected_reason = approval.rejection_reason
        elif approval.level == 3:
            leave_request.level_3_approver_id = current_user.id
            leave_request.level_3_approved_at = datetime.now()
            leave_request.level_3_approved = False
            leave_request.level_3_rejected_reason = approval.rejection_reason
        
        leave_request.status = "rejected"
        leave_request.rejection_reason = approval.rejection_reason
        
        # Return balance from pending
        year = leave_request.start_date.year
        update_leave_balance(
            leave_request.employee_id,
            leave_request.leave_type_id,
            year,
            -float(leave_request.deduction_days or 0),
            is_pending=True,
            db=db
        )
    
    # Add history
    action = "approve" if approval.approved else "reject"
    add_approval_history(
        leave_request.id, current_user.id, action, approval.level,
        previous_status, leave_request.status, approval.notes or approval.rejection_reason, db
    )
    
    db.commit()
    db.refresh(leave_request)
    
    return {"message": f"Leave request {action}ed", "request": _build_leave_request_response(leave_request, db)}


@router.put("/requests/{request_id}/cancel")
def cancel_leave_request(
    request_id: UUID,
    cancellation: LeaveCancellation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a leave request"""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.status in ["approved"]:
        raise HTTPException(status_code=400, detail="Cannot cancel an approved request")
    
    if leave_request.status == "cancelled":
        raise HTTPException(status_code=400, detail="Request already cancelled")
    
    previous_status = leave_request.status
    leave_request.status = "cancelled"
    leave_request.cancelled_by = current_user.id
    leave_request.cancelled_at = datetime.now()
    leave_request.cancellation_reason = cancellation.reason
    
    # Return balance if was pending
    if leave_request.status not in ["approved"]:
        year = leave_request.start_date.year
        update_leave_balance(
            leave_request.employee_id,
            leave_request.leave_type_id,
            year,
            -float(leave_request.deduction_days or 0),
            is_pending=True,
            db=db
        )
    
    # Add history
    add_approval_history(
        leave_request.id, current_user.id, "cancel", None,
        previous_status, "cancelled", cancellation.reason, db
    )
    
    db.commit()
    db.refresh(leave_request)
    
    return {"message": "Leave request cancelled", "request": _build_leave_request_response(leave_request, db)}


# ==================== PUBLIC HOLIDAY ENDPOINTS ====================

@router.get("/holidays", response_model=List[PublicHolidayResponse])
def get_public_holidays(
    year: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get public holidays"""
    query = db.query(PublicHoliday)
    
    if is_active is not None:
        query = query.filter(PublicHoliday.is_active == is_active)
    
    holidays = query.order_by(PublicHoliday.date).all()
    
    # Filter by year for recurring holidays
    if year:
        result = []
        for h in holidays:
            if h.is_recurring:
                if h.date.replace(year=year) or (h.end_date and h.end_date.replace(year=year)):
                    result.append(h)
            else:
                if h.date.year == year:
                    result.append(h)
        return result
    
    return holidays


@router.post("/holidays", response_model=PublicHolidayResponse)
def create_public_holiday(
    holiday: PublicHolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create public holiday (Admin only)"""
    db_holiday = PublicHoliday(**holiday.dict())
    db.add(db_holiday)
    db.commit()
    db.refresh(db_holiday)
    return db_holiday


@router.put("/holidays/{holiday_id}", response_model=PublicHolidayResponse)
def update_public_holiday(
    holiday_id: UUID,
    holiday: PublicHolidayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update public holiday"""
    db_holiday = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not db_holiday:
        raise HTTPException(status_code=404, detail="Public holiday not found")
    
    update_data = holiday.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_holiday, key, value)
    
    db.commit()
    db.refresh(db_holiday)
    return db_holiday


@router.delete("/holidays/{holiday_id}")
def delete_public_holiday(
    holiday_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete public holiday"""
    db_holiday = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not db_holiday:
        raise HTTPException(status_code=404, detail="Public holiday not found")
    
    db.delete(db_holiday)
    db.commit()
    return {"message": "Public holiday deleted"}


# ==================== LEAVE CALENDAR ENDPOINTS ====================

@router.get("/calendar")
def get_leave_calendar(
    from_date: date,
    to_date: date,
    department_id: Optional[UUID] = None,
    leave_type_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave calendar for date range"""
    # Get all approved leaves in date range
    query = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.start_date <= to_date,
            LeaveRequest.end_date >= from_date,
            LeaveRequest.status == "approved"
        )
    )
    
    if department_id:
        # Filter by department
        query = query.join(Employee).filter(Employee.department_id == department_id)
    
    if leave_type_id:
        query = query.filter(LeaveRequest.leave_type_id == leave_type_id)
    
    requests = query.all()
    
    # Get public holidays
    holidays = db.query(PublicHoliday).filter(
        PublicHoliday.is_active == True
    ).all()
    
    # Build calendar data
    calendar_data = {}
    current = from_date
    while current <= to_date:
        day_info = {
            "date": current.isoformat(),
            "is_weekend": current.weekday() in [5, 6],
            "is_holiday": False,
            "leaves": []
        }
        
        # Check for holiday
        for h in holidays:
            if h.is_recurring:
                if h.date.replace(year=current.year) == current:
                    day_info["is_holiday"] = True
                    day_info["holiday_name"] = h.name
                    day_info["holiday_color"] = h.color
                    break
            else:
                if h.date == current:
                    day_info["is_holiday"] = True
                    day_info["holiday_name"] = h.name
                    day_info["holiday_color"] = h.color
                    break
        
        # Get leaves for this day
        for req in requests:
            if req.start_date <= current <= req.end_date:
                leave_type = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
                employee = db.query(Employee).filter(Employee.id == req.employee_id).first()
                
                day_info["leaves"].append({
                    "request_id": str(req.id),
                    "request_number": req.request_number,
                    "employee_id": str(req.employee_id),
                    "employee_name": f"{employee.first_name} {employee.last_name}" if employee else None,
                    "employee_code": employee.code if employee else None,
                    "leave_type_name": leave_type.name if leave_type else None,
                    "leave_type_color": leave_type.color if leave_type else None,
                    "total_days": float(req.total_days or 0)
                })
        
        calendar_data[current.isoformat()] = day_info
        current += timedelta(days=1)
    
    return calendar_data


# ==================== LEAVE DASHBOARD ENDPOINTS ====================

@router.get("/dashboard/stats", response_model=LeaveDashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave dashboard statistics"""
    today = date.today()
    current_year = datetime.now().year
    
    # Total employees
    total_employees = db.query(Employee).filter(Employee.status == "active").count()
    
    # On leave today
    on_leave_today = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.status == "approved"
        )
    ).count()
    
    # Pending requests
    pending_requests = db.query(LeaveRequest).filter(
        LeaveRequest.status.in_(["pending", "approved_level_1", "approved_level_2"])
    ).count()
    
    # Approved this month
    start_of_month = today.replace(day=1)
    approved_this_month = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.approved_at >= start_of_month,
            LeaveRequest.status == "approved"
        )
    ).count()
    
    # Rejected this month
    rejected_this_month = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.updated_at >= start_of_month,
            LeaveRequest.status == "rejected"
        )
    ).count()
    
    # Get annual leave balance totals
    annual_leave_type = db.query(LeaveType).filter(LeaveType.code == "ANNUAL").first()
    
    total_annual_allocated = 0
    total_annual_used = 0
    total_annual_remaining = 0
    
    if annual_leave_type:
        balances = db.query(EmployeeLeaveBalance).filter(
            EmployeeLeaveBalance.year == current_year,
            EmployeeLeaveBalance.leave_type_id == annual_leave_type.id
        ).all()
        
        for b in balances:
            total_annual_allocated += float(b.allocated_days or 0)
            total_annual_used += float(b.used_days or 0)
            total_annual_remaining += float(b.remaining_days or 0)
    
    return LeaveDashboardStats(
        total_employees=total_employees,
        on_leave_today=on_leave_today,
        pending_requests=pending_requests,
        approved_this_month=approved_this_month,
        rejected_this_month=rejected_this_month,
        total_annual_allocated=total_annual_allocated,
        total_annual_used=total_annual_used,
        total_annual_remaining=total_annual_remaining
    )


# ==================== APPROVAL CHAIN ENDPOINTS ====================

@router.get("/approval-chains", response_model=List[ApprovalChainResponse])
def get_approval_chains(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval chains"""
    query = db.query(ApprovalChain)
    if is_active is not None:
        query = query.filter(ApprovalChain.is_active == is_active)
    return query.order_by(ApprovalChain.priority.desc()).all()


@router.post("/approval-chains", response_model=ApprovalChainResponse)
def create_approval_chain(
    chain: ApprovalChainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create approval chain"""
    db_chain = ApprovalChain(**chain.dict())
    db.add(db_chain)
    db.commit()
    db.refresh(db_chain)
    return db_chain


# ==================== LEAVE ENTITLEMENTS ENDPOINTS ====================

@router.get("/entitlements", response_model=List[LeaveEntitlementResponse])
def get_leave_entitlements(
    employee_id: Optional[UUID] = None,
    leave_type_id: Optional[UUID] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave entitlements"""
    query = db.query(LeaveEntitlement)
    
    if employee_id:
        query = query.filter(LeaveEntitlement.employee_id == employee_id)
    if leave_type_id:
        query = query.filter(LeaveEntitlement.leave_type_id == leave_type_id)
    if year:
        query = query.filter(LeaveEntitlement.year == year)
    
    entitlements = query.order_by(LeaveEntitlement.year.desc(), LeaveEntitlement.created_at.desc()).all()
    
    # Add leave type info
    result = []
    for ent in entitlements:
        leave_type = db.query(LeaveType).filter(LeaveType.id == ent.leave_type_id).first()
        creator = db.query(User).filter(User.id == ent.created_by).first() if ent.created_by else None
        
        ent_dict = {
            "id": ent.id,
            "employee_id": ent.employee_id,
            "leave_type_id": ent.leave_type_id,
            "year": ent.year,
            "allocated_days": float(ent.allocated_days or 0),
            "description": ent.description,
            "is_carry_over": ent.is_carry_over,
            "is_adjustment": ent.is_adjustment,
            "adjustment_reason": ent.adjustment_reason,
            "created_at": ent.created_at,
            "leave_type_name": leave_type.name if leave_type else None,
            "leave_type_code": leave_type.code if leave_type else None,
            "creator_name": f"{creator.first_name} {creator.last_name}" if creator else None
        }
        result.append(LeaveEntitlementResponse(**ent_dict))
    
    return result


# ==================== SEED DEFAULT DATA ====================

@router.post("/seed-defaults")
def seed_default_leave_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed default leave types (Admin only)"""
    default_types = [
        {
            "name": "Annual Leave",
            "name_ar": "إجازة سنوية",
            "code": "ANNUAL",
            "category": "annual",
            "max_days_per_year": 21,
            "max_consecutive_days": 21,
            "min_advance_days": 7,
            "is_accumulative": True,
            "max_accumulation_days": 30,
            "is_paid": True,
            "color": "#3B82F6"
        },
        {
            "name": "Sick Leave",
            "name_ar": "إجازة مرضية",
            "code": "SICK",
            "category": "sick",
            "max_days_per_year": 30,
            "max_consecutive_days": 30,
            "requires_documents": True,
            "is_paid": True,
            "color": "#EF4444"
        },
        {
            "name": "Personal Leave",
            "name_ar": "إجازة شخصية",
            "code": "PERSONAL",
            "category": "personal",
            "max_days_per_year": 5,
            "max_consecutive_days": 3,
            "min_advance_days": 3,
            "is_paid": True,
            "color": "#8B5CF6"
        },
        {
            "name": "Maternity Leave",
            "name_ar": "إجازة وضع",
            "code": "MATERNITY",
            "category": "maternity",
            "max_days_per_year": 90,
            "max_consecutive_days": 90,
            "requires_probation_completion": False,
            "gender_specific": "female",
            "is_paid": True,
            "payment_percentage": 100,
            "color": "#EC4899"
        },
        {
            "name": "Paternity Leave",
            "name_ar": "إجازة أبوة",
            "code": "PATERNITY",
            "category": "paternity",
            "max_days_per_year": 7,
            "max_consecutive_days": 7,
            "gender_specific": "male",
            "is_paid": True,
            "color": "#06B6D4"
        },
        {
            "name": "Bereavement Leave",
            "name_ar": "إجازة حداد",
            "code": "BEREAVEMENT",
            "category": "bereavement",
            "max_days_per_year": 5,
            "max_consecutive_days": 5,
            "is_paid": True,
            "color": "#6B7280"
        },
        {
            "name": "Marriage Leave",
            "name_ar": "إجازة زواج",
            "code": "MARRIAGE",
            "category": "marriage",
            "max_days_per_year": 7,
            "max_consecutive_days": 7,
            "is_paid": True,
            "color": "#F59E0B"
        },
        {
            "name": "Unpaid Leave",
            "name_ar": "إجازة بدون أجر",
            "code": "UNPAID",
            "category": "unpaid",
            "max_days_per_year": 30,
            "max_consecutive_days": 30,
            "is_paid": False,
            "requires_approval": True,
            "approval_levels_required": 2,
            "color": "#9CA3AF"
        },
        {
            "name": "Emergency Leave",
            "name_ar": "إجازة طوارئ",
            "code": "EMERGENCY",
            "category": "emergency",
            "max_days_per_year": 5,
            "max_consecutive_days": 3,
            "min_advance_days": 0,
            "is_paid": True,
            "color": "#DC2626"
        },
        {
            "name": "Business Leave",
            "name_ar": "إجازة عمل",
            "code": "BUSINESS",
            "category": "business",
            "max_days_per_year": 10,
            "is_paid": True,
            "color": "#059669"
        }
    ]
    
    created_count = 0
    for type_data in default_types:
        existing = db.query(LeaveType).filter(LeaveType.code == type_data["code"]).first()
        if not existing:
            leave_type = LeaveType(**type_data)
            db.add(leave_type)
            created_count += 1
    
    # Create default policy
    existing_policy = db.query(LeavePolicy).first()
    if not existing_policy:
        policy = LeavePolicy(
            name="Default Leave Policy",
            name_ar="سياسة الإجازات الافتراضية",
            effective_from=date.today(),
            is_active=True,
            default_annual_leave_days=21,
            exclude_weekends_from_leave=True,
            exclude_holidays_from_leave=True,
            round_leave_days=False,
            round_method="ceil",
            allow_employee_cancel=True,
            cancellation_deadline_days=3,
            reset_balance_on_calendar_year=True
        )
        db.add(policy)
    
    db.commit()
    
    return {"message": f"Created {created_count} leave types and default policy"}


# ==================== APPROVAL HISTORY ====================

@router.get("/requests/{request_id}/history", response_model=List[LeaveApprovalHistoryResponse])
def get_leave_request_history(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval history for a leave request"""
    history = db.query(LeaveApprovalHistory).filter(
        LeaveApprovalHistory.leave_request_id == request_id
    ).order_by(LeaveApprovalHistory.created_at.desc()).all()
    
    result = []
    for h in history:
        actor = db.query(User).filter(User.id == h.actor_id).first()
        
        result.append(LeaveApprovalHistoryResponse(
            id=h.id,
            leave_request_id=h.leave_request_id,
            actor_id=h.actor_id,
            action=h.action,
            level=h.level,
            previous_status=h.previous_status,
            new_status=h.new_status,
            notes=h.notes,
            created_at=h.created_at,
            actor_name=f"{actor.first_name} {actor.last_name}" if actor else None
        ))
    
    return result


# ==================== ENHANCED APPROVAL WORKFLOW APIs ====================

def find_approver_by_type(approver_type: str, employee_id: UUID, db: Session) -> Optional[UUID]:
    """
    Find approver ID based on approver type
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return None
    
    if approver_type == "manager" or approver_type == "dept_head":
        # Direct manager
        return employee.direct_manager_id
    elif approver_type == "hr_manager":
        # Find HR manager
        hr_user = db.query(User).join(User.employee).filter(
            User.is_active == True,
            Employee.department_id == employee.department_id
        ).first()
        if hr_user:
            return hr_user.id
    elif approver_type == "director":
        # Company director/CEO - find user with director role
        from models.rbac_models import Role
        director_role = db.query(Role).filter(Role.name == "director").first()
        if director_role:
            from models.rbac_models import user_roles
            director_user = db.query(User).join(user_roles).filter(
                user_roles.c.role_id == director_role.id
            ).first()
            if director_user:
                return director_user.id
    
    return None


def get_workflow_for_employee(employee_id: UUID, leave_type_id: UUID, db: Session) -> Optional[ApprovalWorkflow]:
    """
    Find the appropriate workflow for an employee based on their group membership
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return None
    
    # Get all active workflows ordered by priority
    workflows = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.is_active == True
    ).order_by(ApprovalWorkflow.priority.desc()).all()
    
    for workflow in workflows:
        # Check if this workflow applies to this employee
        for group in workflow.employee_groups:
            if not group.is_active:
                continue
            
            # Check employee IDs
            if employee_id in (group.employee_ids or []):
                return workflow
            
            # Check department IDs
            if employee.department_id and employee.department_id in (group.department_ids or []):
                return workflow
            
            # Check employee levels
            if employee.employee_level and employee.employee_level in (group.employee_levels or []):
                return workflow
    
    # Return default workflow if exists
    default_workflow = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.is_active == True,
        ApprovalWorkflow.is_default == True
    ).first()
    
    return default_workflow


def create_approval_tracking(leave_request_id: UUID, workflow_id: UUID, db: Session) -> LeaveRequestApprovalStep:
    """
    Create initial approval tracking for a leave request
    """
    workflow = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    steps = db.query(ApprovalWorkflowStep).filter(
        ApprovalWorkflowStep.workflow_id == workflow_id,
        ApprovalWorkflowStep.is_active == True
    ).order_by(ApprovalWorkflowStep.step_order).all()
    
    if not steps:
        # No steps defined, auto-approve
        return None
    
    # Get first step's approver
    first_step = steps[0]
    approver_id = first_step.approver_id
    
    if first_step.auto_assign and not approver_id:
        # Auto-find approver
        leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == leave_request_id).first()
        approver_id = find_approver_by_type(first_step.approver_type, leave_request.employee_id, db)
    
    # Create tracking record
    tracking = LeaveRequestApprovalStep(
        leave_request_id=leave_request_id,
        workflow_id=workflow_id,
        current_step=1,
        total_steps=len(steps),
        current_approver_id=approver_id,
        approval_status="pending",
        step_history=[]
    )
    
    db.add(tracking)
    return tracking


@router.get("/workflows", response_model=List[ApprovalWorkflowListResponse])
def get_approval_workflows(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all approval workflows"""
    query = db.query(ApprovalWorkflow)
    
    if is_active is not None:
        query = query.filter(ApprovalWorkflow.is_active == is_active)
    
    workflows = query.order_by(ApprovalWorkflow.priority.desc()).all()
    
    result = []
    for w in workflows:
        steps_count = db.query(ApprovalWorkflowStep).filter(
            ApprovalWorkflowStep.workflow_id == w.id,
            ApprovalWorkflowStep.is_active == True
        ).count()
        
        employees_count = 0
        for group in w.employee_groups:
            if group.is_active:
                employees_count += len(group.employee_ids or [])
        
        result.append(ApprovalWorkflowListResponse(
            id=w.id,
            name=w.name,
            name_ar=w.name_ar,
            description=w.description,
            is_active=w.is_active,
            priority=w.priority,
            is_default=w.is_default,
            steps_count=steps_count,
            employees_count=employees_count
        ))
    
    return result


@router.post("/workflows", response_model=ApprovalWorkflowResponse)
def create_approval_workflow(
    workflow_data: ApprovalWorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new approval workflow"""
    # If this is set as default, unset other defaults
    if workflow_data.is_default:
        db.query(ApprovalWorkflow).update({ApprovalWorkflow.is_default: False})
    
    # Create workflow
    workflow = ApprovalWorkflow(
        name=workflow_data.name,
        name_ar=workflow_data.name_ar,
        description=workflow_data.description,
        trigger_conditions=workflow_data.trigger_conditions,
        is_active=workflow_data.is_active,
        priority=workflow_data.priority,
        is_default=workflow_data.is_default,
        created_by=current_user.id
    )
    db.add(workflow)
    db.flush()
    
    # Add steps
    for step_data in workflow_data.steps:
        step = ApprovalWorkflowStep(
            workflow_id=workflow.id,
            step_order=step_data.step_order,
            name=step_data.name,
            approver_type=step_data.approver_type,
            approver_id=step_data.approver_id,
            approver_employee_id=step_data.approver_employee_id,
            auto_assign=step_data.auto_assign,
            allow_delegation=step_data.allow_delegation,
            is_active=step_data.is_active
        )
        db.add(step)
    
    # Add employee groups
    for group_data in workflow_data.employee_groups:
        group = WorkflowEmployeeGroup(
            workflow_id=workflow.id,
            employee_ids=group_data.employee_ids,
            department_ids=group_data.department_ids,
            employee_levels=group_data.employee_levels,
            is_active=group_data.is_active,
            created_by=current_user.id
        )
        db.add(group)
    
    db.commit()
    db.refresh(workflow)
    
    return workflow


@router.get("/workflows/{workflow_id}", response_model=ApprovalWorkflowResponse)
def get_approval_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single approval workflow with steps and groups"""
    workflow = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow


@router.put("/workflows/{workflow_id}", response_model=ApprovalWorkflowResponse)
def update_approval_workflow(
    workflow_id: UUID,
    workflow_data: ApprovalWorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an approval workflow"""
    workflow = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # If setting as default, unset others
    if workflow_data.is_default and not workflow.is_default:
        db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.id != workflow_id
        ).update({ApprovalWorkflow.is_default: False})
    
    update_data = workflow_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workflow, key, value)
    
    db.commit()
    db.refresh(workflow)
    
    return workflow


@router.delete("/workflows/{workflow_id}")
def delete_approval_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an approval workflow"""
    workflow = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Delete steps and groups
    db.query(ApprovalWorkflowStep).filter(ApprovalWorkflowStep.workflow_id == workflow_id).delete()
    db.query(WorkflowEmployeeGroup).filter(WorkflowEmployeeGroup.workflow_id == workflow_id).delete()
    
    db.delete(workflow)
    db.commit()
    
    return {"message": "Workflow deleted"}


@router.post("/workflows/{workflow_id}/steps", response_model=ApprovalWorkflowStepResponse)
def add_workflow_step(
    workflow_id: UUID,
    step_data: ApprovalWorkflowStepCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a step to a workflow"""
    workflow = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    step = ApprovalWorkflowStep(
        workflow_id=workflow_id,
        step_order=step_data.step_order,
        name=step_data.name,
        approver_type=step_data.approver_type,
        approver_id=step_data.approver_id,
        approver_employee_id=step_data.approver_employee_id,
        auto_assign=step_data.auto_assign,
        allow_delegation=step_data.allow_delegation,
        is_active=step_data.is_active
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    
    return step


@router.put("/workflows/{workflow_id}/steps/{step_id}", response_model=ApprovalWorkflowStepResponse)
def update_workflow_step(
    workflow_id: UUID,
    step_id: UUID,
    step_data: ApprovalWorkflowStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a workflow step"""
    step = db.query(ApprovalWorkflowStep).filter(
        ApprovalWorkflowStep.id == step_id,
        ApprovalWorkflowStep.workflow_id == workflow_id
    ).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    update_data = step_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(step, key, value)
    
    db.commit()
    db.refresh(step)
    
    return step


@router.delete("/workflows/{workflow_id}/steps/{step_id}")
def delete_workflow_step(
    workflow_id: UUID,
    step_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a workflow step"""
    step = db.query(ApprovalWorkflowStep).filter(
        ApprovalWorkflowStep.id == step_id,
        ApprovalWorkflowStep.workflow_id == workflow_id
    ).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    db.delete(step)
    db.commit()
    
    return {"message": "Step deleted"}


@router.post("/workflows/{workflow_id}/groups", response_model=WorkflowEmployeeGroupResponse)
def add_employee_group(
    workflow_id: UUID,
    group_data: WorkflowEmployeeGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an employee group to a workflow"""
    workflow = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    group = WorkflowEmployeeGroup(
        workflow_id=workflow_id,
        employee_ids=group_data.employee_ids,
        department_ids=group_data.department_ids,
        employee_levels=group_data.employee_levels,
        is_active=group_data.is_active,
        created_by=current_user.id
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return group


@router.put("/workflows/{workflow_id}/groups/{group_id}", response_model=WorkflowEmployeeGroupResponse)
def update_employee_group(
    workflow_id: UUID,
    group_id: UUID,
    group_data: WorkflowEmployeeGroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an employee group"""
    group = db.query(WorkflowEmployeeGroup).filter(
        WorkflowEmployeeGroup.id == group_id,
        WorkflowEmployeeGroup.workflow_id == workflow_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    update_data = group_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(group, key, value)
    
    db.commit()
    db.refresh(group)
    
    return group


@router.delete("/workflows/{workflow_id}/groups/{group_id}")
def delete_employee_group(
    workflow_id: UUID,
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an employee group"""
    group = db.query(WorkflowEmployeeGroup).filter(
        WorkflowEmployeeGroup.id == group_id,
        WorkflowEmployeeGroup.workflow_id == workflow_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    db.delete(group)
    db.commit()
    
    return {"message": "Group deleted"}


@router.get("/requests/pending-approval-v2", response_model=List[LeaveRequestWithApprovalInfo])
def get_pending_approval_requests_v2(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave requests pending approval for current user (new workflow system)"""
    # Find all requests where current user is the current approver
    tracking_records = db.query(LeaveRequestApprovalStep).filter(
        LeaveRequestApprovalStep.current_approver_id == current_user.id,
        LeaveRequestApprovalStep.approval_status == "pending"
    ).all()
    
    result = []
    for tracking in tracking_records:
        leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == tracking.leave_request_id).first()
        if leave_request and leave_request.status not in ["approved", "rejected", "cancelled"]:
            response = _build_leave_request_response(leave_request, db)
            response.approval_info = tracking
            result.append(response)
    
    return result


@router.put("/requests/{request_id}/approve-v2")
def approve_leave_request_v2(
    request_id: UUID,
    approval: LeaveApprovalActionV2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or reject leave request using new workflow system"""
    leave_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_request.status in ["approved", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot process request with status: {leave_request.status}")
    
    # Get approval tracking
    tracking = db.query(LeaveRequestApprovalStep).filter(
        LeaveRequestApprovalStep.leave_request_id == request_id
    ).first()
    
    if not tracking:
        # Fall back to old approval system
        return approve_leave_request(request_id, LeaveApprovalAction(level=1, notes=approval.notes), db, current_user)
    
    # Verify current user is the approver
    if tracking.current_approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this request")
    
    previous_status = leave_request.status
    
    if approval.action == "reject":
        # Reject the request
        leave_request.status = "rejected"
        leave_request.rejection_reason = approval.rejection_reason
        tracking.approval_status = "rejected"
        
        # Update step history
        history = tracking.step_history or []
        history.append({
            "step": tracking.current_step,
            "approver_id": str(current_user.id),
            "status": "rejected",
            "timestamp": datetime.now().isoformat(),
            "notes": approval.rejection_reason
        })
        tracking.step_history = history
        
    else:
        # Approve the step
        # Update step history
        history = tracking.step_history or []
        history.append({
            "step": tracking.current_step,
            "approver_id": str(current_user.id),
            "status": "approved",
            "timestamp": datetime.now().isoformat(),
            "notes": approval.notes
        })
        tracking.step_history = history
        
        # Check if there are more steps
        if tracking.current_step >= tracking.total_steps:
            # All steps approved - fully approved
            leave_request.status = "approved"
            tracking.approval_status = "approved"
            
            # Update leave balance
            year = leave_request.start_date.year
            update_leave_balance(
                leave_request.employee_id,
                leave_request.leave_type_id,
                year,
                -float(leave_request.deduction_days or 0),
                is_pending=True,
                db=db
            )
            update_leave_balance(
                leave_request.employee_id,
                leave_request.leave_type_id,
                year,
                float(leave_request.deduction_days or 0),
                is_pending=False,
                db=db
            )
            
            leave_request.approved_by = current_user.id
            leave_request.approved_at = datetime.now()
            leave_request.approval_notes = approval.notes
        else:
            # Move to next step
            tracking.current_step += 1
            leave_request.status = f"approved_level_{tracking.current_step - 1}"
            
            # Find next approver
            next_step = db.query(ApprovalWorkflowStep).filter(
                ApprovalWorkflowStep.workflow_id == tracking.workflow_id,
                ApprovalWorkflowStep.step_order == tracking.current_step,
                ApprovalWorkflowStep.is_active == True
            ).first()
            
            if next_step:
                approver_id = next_step.approver_id
                if next_step.auto_assign and not approver_id:
                    approver_id = find_approver_by_type(next_step.approver_type, leave_request.employee_id, db)
                
                tracking.current_approver_id = approver_id
    
    # Add approval history
    add_approval_history(
        leave_request.id, current_user.id, approval.action,
        tracking.current_step, previous_status, leave_request.status,
        approval.notes or approval.rejection_reason, db
    )
    
    db.commit()
    
    return {
        "message": f"Leave request {approval.action}ed",
        "request": _build_leave_request_response(leave_request, db),
        "approval_info": tracking
    }


@router.get("/workflows/employee/{employee_id}")
def get_workflow_for_employee_endpoint(
    employee_id: UUID,
    leave_type_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the workflow assigned to a specific employee"""
    workflow = get_workflow_for_employee(employee_id, leave_type_id, db)
    
    if not workflow:
        return {"workflow": None, "message": "No workflow found for this employee"}
    
    return {"workflow": workflow}
