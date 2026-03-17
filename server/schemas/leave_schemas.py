"""
Leave Management API Schemas
Comprehensive Pydantic models for leave system
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Any
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal


# ==================== ENUM SCHEMAS ====================

class LeaveTypeCategoryEnum(str):
    ANNUAL = "annual"
    SICK = "sick"
    PERSONAL = "personal"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    BEREAVEMENT = "bereavement"
    MARRIAGE = "marriage"
    UNPAID = "unpaid"
    EMERGENCY = "emergency"
    BUSINESS = "business"
    STUDY = "study"
    SPORTS = "sports"
    OTHER = "other"


class LeaveRequestStatusEnum(str):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED_LEVEL_1 = "approved_level_1"
    APPROVED_LEVEL_2 = "approved_level_2"
    APPROVED_LEVEL_3 = "approved_level_3"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ApprovalLevelEnum(str):
    MANAGER = "manager"
    DEPARTMENT_HEAD = "dept_head"
    HR_MANAGER = "hr_manager"
    DIRECTOR = "director"
    CUSTOM = "custom"


class LeaveDeductionTypeEnum(str):
    FULL_DAY = "full_day"
    HALF_DAY = "half_day"
    HOUR = "hour"
    NO_DEDUCTION = "no_deduction"


# ==================== LEAVE TYPE SCHEMAS ====================

class LeaveTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    name_ar: Optional[str] = None
    code: str = Field(..., min_length=1, max_length=20)
    category: str
    description: Optional[str] = None
    
    max_days_per_year: float = 0
    max_consecutive_days: float = 0
    min_advance_days: int = 0
    max_advance_days: int = 0
    
    requires_probation_completion: bool = False
    probation_months: int = 0
    gender_specific: Optional[str] = None
    
    is_accumulative: bool = False
    max_accumulation_days: float = 0
    accumulation_reset_month: int = 1
    
    deduction_type: str = "full_day"
    is_paid: bool = True
    payment_percentage: float = 100.0
    
    requires_documents: bool = False
    document_types: List[str] = []
    
    is_active: bool = True
    is_visible_to_employees: bool = True
    color: str = "#3B82F6"
    
    requires_approval: bool = True
    approval_levels_required: int = 1
    
    allow_carry_over: bool = False
    carry_over_expiry_months: int = 12


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    
    max_days_per_year: Optional[float] = None
    max_consecutive_days: Optional[float] = None
    min_advance_days: Optional[int] = None
    max_advance_days: Optional[int] = None
    
    requires_probation_completion: Optional[bool] = None
    probation_months: Optional[int] = None
    gender_specific: Optional[str] = None
    
    is_accumulative: Optional[bool] = None
    max_accumulation_days: Optional[float] = None
    accumulation_reset_month: Optional[int] = None
    
    deduction_type: Optional[str] = None
    is_paid: Optional[bool] = None
    payment_percentage: Optional[float] = None
    
    requires_documents: Optional[bool] = None
    document_types: Optional[List[str]] = None
    
    is_active: Optional[bool] = None
    is_visible_to_employees: Optional[bool] = None
    color: Optional[str] = None
    
    requires_approval: Optional[bool] = None
    approval_levels_required: Optional[int] = None
    
    allow_carry_over: Optional[bool] = None
    carry_over_expiry_months: Optional[int] = None


class LeaveTypeResponse(LeaveTypeBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== LEAVE POLICY SCHEMAS ====================

class LeavePolicyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    name_ar: Optional[str] = None
    description: Optional[str] = None
    
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool = True
    
    default_annual_leave_days: float = 0
    max_leave_balance_warning_days: float = 5
    
    work_year_start_month: int = 1
    work_year_start_day: int = 1
    
    exclude_weekends_from_leave: bool = True
    exclude_holidays_from_leave: bool = True
    
    round_leave_days: bool = False
    round_method: str = "ceil"
    
    allow_leave_encashment: bool = False
    max_encashment_days: float = 0
    encashment_multiplier: float = 1.0
    
    auto_approve_after_days: int = 0
    allow_employee_cancel: bool = True
    cancellation_deadline_days: int = 0
    
    reset_balance_on_calendar_year: bool = True
    reset_balance_on_work_year: bool = False
    
    notes: Optional[str] = None


class LeavePolicyCreate(LeavePolicyBase):
    pass


class LeavePolicyUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None
    
    default_annual_leave_days: Optional[float] = None
    max_leave_balance_warning_days: Optional[float] = None
    
    work_year_start_month: Optional[int] = None
    work_year_start_day: Optional[int] = None
    
    exclude_weekends_from_leave: Optional[bool] = None
    exclude_holidays_from_leave: Optional[bool] = None
    
    round_leave_days: Optional[bool] = None
    round_method: Optional[str] = None
    
    allow_leave_encashment: Optional[bool] = None
    max_encashment_days: Optional[float] = None
    encashment_multiplier: Optional[float] = None
    
    auto_approve_after_days: Optional[int] = None
    allow_employee_cancel: Optional[bool] = None
    cancellation_deadline_days: Optional[int] = None
    
    reset_balance_on_calendar_year: Optional[bool] = None
    reset_balance_on_work_year: Optional[bool] = None
    
    notes: Optional[str] = None


class LeavePolicyResponse(LeavePolicyBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== EMPLOYEE LEAVE BALANCE SCHEMAS ====================

class EmployeeLeaveBalanceBase(BaseModel):
    employee_id: UUID
    leave_type_id: UUID
    
    allocated_days: float = 0
    used_days: float = 0
    pending_days: float = 0
    remaining_days: float = 0
    
    carried_over_days: float = 0
    encashed_days: float = 0
    
    year: int


class EmployeeLeaveBalanceCreate(EmployeeLeaveBalanceBase):
    pass


class EmployeeLeaveBalanceUpdate(BaseModel):
    allocated_days: Optional[float] = None
    used_days: Optional[float] = None
    pending_days: Optional[float] = None
    remaining_days: Optional[float] = None
    
    carried_over_days: Optional[float] = None
    encashed_days: Optional[float] = None


class EmployeeLeaveBalanceResponse(EmployeeLeaveBalanceBase):
    id: UUID
    last_updated: Optional[datetime] = None
    
    # Related info
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    leave_type_color: Optional[str] = None
    
    class Config:
        from_attributes = True


class EmployeeLeaveBalanceSummary(BaseModel):
    """Summary of all leave balances for an employee"""
    employee_id: UUID
    year: int
    balances: List[EmployeeLeaveBalanceResponse]
    total_allocated: float = 0
    total_used: float = 0
    total_pending: float = 0
    total_remaining: float = 0


# ==================== APPROVAL CHAIN SCHEMAS ====================

class ApprovalChainBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    name_ar: Optional[str] = None
    description: Optional[str] = None
    
    trigger_conditions: dict = {}
    
    level_1_approver_type: str = "manager"
    level_1_approver_id: Optional[UUID] = None
    
    level_2_approver_type: Optional[str] = None
    level_2_approver_id: Optional[UUID] = None
    
    level_3_approver_type: Optional[str] = None
    level_3_approver_id: Optional[UUID] = None
    
    is_active: bool = True
    priority: int = 0


class ApprovalChainCreate(ApprovalChainBase):
    pass


class ApprovalChainUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    
    trigger_conditions: Optional[dict] = None
    
    level_1_approver_type: Optional[str] = None
    level_1_approver_id: Optional[UUID] = None
    
    level_2_approver_type: Optional[str] = None
    level_2_approver_id: Optional[UUID] = None
    
    level_3_approver_type: Optional[str] = None
    level_3_approver_id: Optional[UUID] = None
    
    is_active: Optional[bool] = None
    priority: Optional[int] = None


class ApprovalChainResponse(ApprovalChainBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== LEAVE REQUEST SCHEMAS ====================

class LeaveRequestBase(BaseModel):
    leave_type_id: UUID
    
    start_date: date
    end_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    
    reason: Optional[str] = None
    destination: Optional[str] = None
    contact_number: Optional[str] = None
    
    documents: List[str] = []
    document_descriptions: List[str] = []
    
    is_half_day: bool = False
    is_hourly: bool = False
    hours_requested: float = 0
    
    handover_to_employee_id: Optional[UUID] = None
    handover_notes: Optional[str] = None
    
    replacement_employee_id: Optional[UUID] = None


class LeaveRequestCreate(LeaveRequestBase):
    employee_id: Optional[UUID] = None  # If not provided, uses current user
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class LeaveRequestUpdate(BaseModel):
    leave_type_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    
    reason: Optional[str] = None
    destination: Optional[str] = None
    contact_number: Optional[str] = None
    
    documents: Optional[List[str]] = None
    document_descriptions: Optional[List[str]] = None
    
    is_half_day: Optional[bool] = None
    is_hourly: Optional[bool] = None
    hours_requested: Optional[float] = None
    
    handover_to_employee_id: Optional[UUID] = None
    handover_notes: Optional[str] = None
    
    replacement_employee_id: Optional[UUID] = None


class LeaveApprovalAction(BaseModel):
    """Action for approving/rejecting leave"""
    level: int = Field(..., ge=1, le=3)  # 1, 2, or 3
    approved: bool
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class LeaveCancellation(BaseModel):
    reason: str


class LeaveRequestResponse(LeaveRequestBase):
    id: UUID
    request_number: str
    employee_id: UUID
    
    total_days: float
    deduction_days: float
    
    status: str
    
    # Approval info
    level_1_approver_id: Optional[UUID] = None
    level_1_approved_at: Optional[datetime] = None
    level_1_approved: bool = False
    level_1_notes: Optional[str] = None
    level_1_rejected_reason: Optional[str] = None
    
    level_2_approver_id: Optional[UUID] = None
    level_2_approved_at: Optional[datetime] = None
    level_2_approved: bool = False
    level_2_notes: Optional[str] = None
    level_2_rejected_reason: Optional[str] = None
    
    level_3_approver_id: Optional[UUID] = None
    level_3_approved_at: Optional[datetime] = None
    level_3_approved: bool = False
    level_3_notes: Optional[str] = None
    level_3_rejected_reason: Optional[str] = None
    
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    handover_completed: bool = False
    
    cancelled_by: Optional[UUID] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    
    expires_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    
    # Related info
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    leave_type_color: Optional[str] = None
    
    # Current approver info
    current_approval_level: Optional[int] = None
    can_approve: bool = False
    
    class Config:
        from_attributes = True


class LeaveRequestListResponse(BaseModel):
    """Simplified response for lists"""
    id: UUID
    request_number: str
    employee_id: UUID
    employee_name: Optional[str] = None
    leave_type_name: Optional[str] = None
    leave_type_color: Optional[str] = None
    start_date: date
    end_date: date
    total_days: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== LEAVE ENTITLEMENT SCHEMAS ====================

class LeaveEntitlementBase(BaseModel):
    employee_id: UUID
    leave_type_id: UUID
    year: int
    allocated_days: float
    description: Optional[str] = None
    
    is_carry_over: bool = False
    is_adjustment: bool = False
    adjustment_reason: Optional[str] = None


class LeaveEntitlementCreate(LeaveEntitlementBase):
    created_by: Optional[UUID] = None


class LeaveEntitlementResponse(LeaveEntitlementBase):
    id: UUID
    created_at: datetime
    
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    
    creator_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== LEAVE APPROVAL HISTORY SCHEMAS ====================

class LeaveApprovalHistoryResponse(BaseModel):
    id: UUID
    leave_request_id: UUID
    actor_id: UUID
    action: str
    level: Optional[int] = None
    previous_status: Optional[str] = None
    new_status: str
    notes: Optional[str] = None
    
    created_at: datetime
    
    actor_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== PUBLIC HOLIDAY SCHEMAS ====================

class PublicHolidayBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    name_ar: Optional[str] = None
    date: date
    end_date: Optional[date] = None
    
    is_recurring: bool = True
    country: str = "General"
    region: Optional[str] = None
    
    is_paid: bool = True
    is_active: bool = True
    color: str = "#EF4444"


class PublicHolidayCreate(PublicHolidayBase):
    pass


class PublicHolidayUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    date: Optional[date] = None
    end_date: Optional[date] = None
    
    is_recurring: Optional[bool] = None
    country: Optional[str] = None
    region: Optional[str] = None
    
    is_paid: Optional[bool] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None


class PublicHolidayResponse(PublicHolidayBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== LEAVE CALENDAR SCHEMAS ====================

class LeaveCalendarEntry(BaseModel):
    date: date
    is_holiday: bool = False
    is_weekend: bool = False


class LeaveCalendarResponse(BaseModel):
    date: date
    is_holiday: bool
    is_weekend: bool
    
    leave_requests: List[LeaveRequestListResponse] = []
    
    class Config:
        from_attributes = True


# ==================== LEAVE DASHBOARD SCHEMAS ====================

class LeaveDashboardStats(BaseModel):
    """Dashboard statistics for leave management"""
    total_employees: int = 0
    on_leave_today: int = 0
    pending_requests: int = 0
    approved_this_month: int = 0
    rejected_this_month: int = 0
    
    # Balance stats
    total_annual_allocated: float = 0
    total_annual_used: float = 0
    total_annual_remaining: float = 0


class LeaveRequestStatsByStatus(BaseModel):
    status: str
    count: int
    total_days: float


class LeaveTypeUsageStats(BaseModel):
    leave_type_id: UUID
    leave_type_name: str
    leave_type_code: str
    color: str
    
    requests_count: int
    total_days: float
    approved_count: int
    rejected_count: int
    pending_count: int


# ==================== LEAVE BALANCE ADJUSTMENT SCHEMAS ====================

class LeaveBalanceAdjustment(BaseModel):
    """For adjusting leave balance"""
    employee_id: UUID
    leave_type_id: UUID
    year: int
    
    adjustment_amount: float  # Positive to add, negative to subtract
    reason: str


class BulkLeaveEntitlement(BaseModel):
    """Bulk create leave entitlements"""
    leave_type_id: UUID
    year: int
    allocated_days: float
    description: Optional[str] = None
    
    employee_ids: List[UUID]  # List of employees to assign
    
    is_carry_over: bool = False
    is_adjustment: bool = False
    adjustment_reason: Optional[str] = None


# ==================== PAGINATION SCHEMAS ====================

class LeaveRequestPaginatedResponse(BaseModel):
    items: List[LeaveRequestResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ==================== LEAVE REPORT FILTERS ====================

class LeaveReportFilters(BaseModel):
    from_date: date
    to_date: date
    
    department_ids: List[UUID] = []
    employee_ids: List[UUID] = []
    leave_type_ids: List[UUID] = []
    statuses: List[str] = []


class LeaveRequestWithBalance(LeaveRequestResponse):
    """Leave request with balance info"""
    remaining_balance: float = 0
    balance_after: float = 0


# ==================== APPROVAL WORKFLOW SCHEMAS ====================

class ApprovalWorkflowStepBase(BaseModel):
    """Base schema for approval workflow step"""
    step_order: int
    name: str
    approver_type: str = "manager"  # manager, dept_head, hr_manager, director, custom, employee
    approver_id: Optional[UUID] = None
    approver_employee_id: Optional[UUID] = None
    auto_assign: bool = True
    allow_delegation: bool = False
    is_active: bool = True


class ApprovalWorkflowStepCreate(ApprovalWorkflowStepBase):
    pass


class ApprovalWorkflowStepUpdate(BaseModel):
    name: Optional[str] = None
    approver_type: Optional[str] = None
    approver_id: Optional[UUID] = None
    approver_employee_id: Optional[UUID] = None
    auto_assign: Optional[bool] = None
    allow_delegation: Optional[bool] = None
    is_active: Optional[bool] = None


class ApprovalWorkflowStepResponse(ApprovalWorkflowStepBase):
    id: UUID
    workflow_id: UUID
    
    class Config:
        from_attributes = True


class WorkflowEmployeeGroupBase(BaseModel):
    """Base schema for workflow employee group"""
    employee_ids: List[UUID] = []
    department_ids: List[UUID] = []
    employee_levels: List[str] = []
    is_active: bool = True


class WorkflowEmployeeGroupCreate(WorkflowEmployeeGroupBase):
    workflow_id: UUID


class WorkflowEmployeeGroupUpdate(BaseModel):
    employee_ids: Optional[List[UUID]] = None
    department_ids: Optional[List[UUID]] = None
    employee_levels: Optional[List[str]] = None
    is_active: Optional[bool] = None


class WorkflowEmployeeGroupResponse(WorkflowEmployeeGroupBase):
    id: UUID
    workflow_id: UUID
    created_at: datetime
    created_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class ApprovalWorkflowBase(BaseModel):
    """Base schema for approval workflow"""
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    trigger_conditions: dict = {}
    is_active: bool = True
    priority: int = 0
    is_default: bool = False


class ApprovalWorkflowCreate(ApprovalWorkflowBase):
    """Schema for creating approval workflow with steps"""
    steps: List[ApprovalWorkflowStepCreate] = []
    employee_groups: List[WorkflowEmployeeGroupBase] = []


class ApprovalWorkflowUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    trigger_conditions: Optional[dict] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    is_default: Optional[bool] = None


class ApprovalWorkflowResponse(ApprovalWorkflowBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    steps: List[ApprovalWorkflowStepResponse] = []
    employee_groups: List[WorkflowEmployeeGroupResponse] = []
    
    class Config:
        from_attributes = True


class ApprovalWorkflowListResponse(BaseModel):
    """Simplified response for workflow lists"""
    id: UUID
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    priority: int
    is_default: bool
    steps_count: int = 0
    employees_count: int = 0


class LeaveRequestApprovalStepBase(BaseModel):
    """Base schema for leave request approval step tracking"""
    current_step: int = 1
    total_steps: int = 1
    workflow_id: Optional[UUID] = None
    current_approver_id: Optional[UUID] = None
    approval_status: str = "pending"


class LeaveRequestApprovalStepResponse(LeaveRequestApprovalStepBase):
    id: UUID
    leave_request_id: UUID
    step_history: List[dict] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LeaveApprovalActionV2(BaseModel):
    """Action for approving/rejecting leave with new workflow system"""
    action: str = Field(..., pattern="^(approve|reject)$")
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class LeaveRequestWithApprovalInfo(LeaveRequestResponse):
    """Leave request with approval workflow info"""
    approval_info: Optional[LeaveRequestApprovalStepResponse] = None
    current_approver_name: Optional[str] = None
