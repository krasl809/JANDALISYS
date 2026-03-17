"""
Comprehensive Leave Management System Models
Advanced HR Leave Management with Multi-Level Approval Workflow
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, DECIMAL, Enum as SqlEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from core.database import Base


# ==================== ENUMS ====================

class LeaveTypeCategory(str, enum.Enum):
    """Leave Type Categories"""
    ANNUAL = "annual"           # Paid Annual Leave
    SICK = "sick"               # Sick Leave
    PERSONAL = "personal"       # Personal Leave
    MATERNITY = "maternity"     # Maternity Leave
    PATERNITY = "paternity"     # Paternity Leave
    BEREAVEMENT = "bereavement" # Bereavement/Funeral Leave
    MARRIAGE = "marriage"       # Marriage Leave
    UNPAID = "unpaid"           # Unpaid Leave
    EMERGENCY = "emergency"     # Emergency Leave
    BUSINESS = "business"       # Business/Trip Leave
    STUDY = "study"             # Study/Educational Leave
    SPORTS = "sports"          # Sports Leave
    OTHER = "other"             # Other


class LeaveRequestStatus(str, enum.Enum):
    """Leave Request Status"""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED_LEVEL_1 = "approved_level_1"    # First level approval
    APPROVED_LEVEL_2 = "approved_level_2"    # Second level approval
    APPROVED_LEVEL_3 = "approved_level_3"   # Third level approval
    APPROVED = "approved"                   # Fully approved
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ApprovalLevel(str, enum.Enum):
    """Approval Level Types"""
    MANAGER = "manager"             # Direct Manager
    DEPARTMENT_HEAD = "dept_head"   # Department Head
    HR_MANAGER = "hr_manager"       # HR Manager
    DIRECTOR = "director"           # Company Director/CEO
    CUSTOM = "custom"               # Custom approver


class LeaveDeductionType(str, enum.Enum):
    """How leave days are deducted"""
    FULL_DAY = "full_day"
    HALF_DAY = "half_day"
    HOUR = "hour"
    NO_DEDUCTION = "no_deduction"


# ==================== LEAVE TYPE CONFIGURATION ====================

class LeaveType(Base):
    """
    Master Leave Type Configuration
    Defines all leave types available in the system
    """
    __tablename__ = "leave_types"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(100), nullable=False, unique=True)
    name_ar = Column(String(100), nullable=True)  # Arabic name
    code = Column(String(20), nullable=False, unique=True)  # e.g., ANNUAL, SICK
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    
    # Leave Rules
    max_days_per_year = Column(DECIMAL(5, 1), default=0)  # Max days allowed per year
    max_consecutive_days = Column(DECIMAL(5, 1), default=0)  # Max consecutive days
    min_advance_days = Column(Integer, default=0)  # Minimum days in advance to request
    max_advance_days = Column(Integer, default=0)  # Maximum days in advance to request
    
    # Eligibility
    requires_probation_completion = Column(Boolean, default=False)
    probation_months = Column(Integer, default=0)  # Months of probation required
    
    # Gender specific
    gender_specific = Column(String(20), nullable=True)  # male, female, or null for all
    
    # Accumulation
    is_accumulative = Column(Boolean, default=False)  # Can accumulate unused days
    max_accumulation_days = Column(DECIMAL(5, 1), default=0)  # Max days can carry over
    accumulation_reset_month = Column(Integer, default=1)  # Month when accumulation resets
    
    # Deduction Type
    deduction_type = Column(String(20), default=LeaveDeductionType.FULL_DAY)
    
    # Paid/Unpaid
    is_paid = Column(Boolean, default=True)
    payment_percentage = Column(DECIMAL(5, 2), default=100.00)  # % of salary paid
    
    # Documents Required
    requires_documents = Column(Boolean, default=False)
    document_types = Column(JSON, default=list)  # ["medical_report", "air_ticket"]
    
    # Active Status
    is_active = Column(Boolean, default=True)
    is_visible_to_employees = Column(Boolean, default=True)
    
    # Color for Calendar (hex)
    color = Column(String(7), default="#3B82F6")
    
    # Approval Requirements
    requires_approval = Column(Boolean, default=True)
    approval_levels_required = Column(Integer, default=1)  # 1, 2, or 3
    
    # Carry Over
    allow_carry_over = Column(Boolean, default=False)
    carry_over_expiry_months = Column(Integer, default=12)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== LEAVE POLICY ====================

class LeavePolicy(Base):
    """
    Company Leave Policy Configuration
    """
    __tablename__ = "leave_policies"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Policy Name
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Effective Period
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # General Rules
    default_annual_leave_days = Column(DECIMAL(5, 1), default=0)
    max_leave_balance_warning_days = Column(DECIMAL(5, 1), default=5)  # Warn when balance < this
    
    # Work Year
    work_year_start_month = Column(Integer, default=1)
    work_year_start_day = Column(Integer, default=1)
    
    # Weekend/Public Holiday Handling
    exclude_weekends_from_leave = Column(Boolean, default=True)
    exclude_holidays_from_leave = Column(Boolean, default=True)
    
    # Round Rules
    round_leave_days = Column(Boolean, default=False)
    round_method = Column(String(20), default="ceil")  # ceil, floor, nearest
    
    # Encashment
    allow_leave_encashment = Column(Boolean, default=False)
    max_encashment_days = Column(DECIMAL(5, 1), default=0)
    encashment_multiplier = Column(DECIMAL(5, 2), default=1.0)  # Salary multiplier
    
    # Approval Settings
    auto_approve_after_days = Column(Integer, default=0)  # Auto-approve if not responded in X days
    allow_employee_cancel = Column(Boolean, default=True)
    cancellation_deadline_days = Column(Integer, default=0)  # Days before start date to cancel
    
    # Calendar Year Reset
    reset_balance_on_calendar_year = Column(Boolean, default=True)
    reset_balance_on_work_year = Column(Boolean, default=False)
    
    # HR Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== EMPLOYEE LEAVE BALANCE ====================

class EmployeeLeaveBalance(Base):
    """
    Employee Leave Balance per Leave Type
    Tracks available days for each leave type
    """
    __tablename__ = "employee_leave_balances"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Links
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    
    # Balance for Current Year
    allocated_days = Column(DECIMAL(5, 1), default=0)  # Days allocated for this year
    used_days = Column(DECIMAL(5, 1), default=0)       # Days used
    pending_days = Column(DECIMAL(5, 1), default=0)    # Days pending approval
    remaining_days = Column(DECIMAL(5, 1), default=0)  # Remaining = allocated - used - pending
    
    # Carry Over from Previous Year
    carried_over_days = Column(DECIMAL(5, 1), default=0)
    
    # Encashment
    encashed_days = Column(DECIMAL(5, 1), default=0)
    
    # Year Reference
    year = Column(Integer, nullable=False)
    
    # Last Updated
    last_updated = Column(DateTime, default=func.now())
    
    # Relationships
    employee = relationship("Employee", backref="leave_balances")
    leave_type = relationship("LeaveType", backref="employee_balances")


# ==================== APPROVAL CHAIN ====================

class ApprovalChain(Base):
    """
    Approval Chain Configuration
    Defines approval workflow for different scenarios
    """
    __tablename__ = "approval_chains"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Chain Name
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Trigger Conditions (JSON)
    trigger_conditions = Column(JSON, default=dict)  
    # e.g., {"leave_type_ids": [], "employee_level": "all", "department_ids": []}
    
    # Approval Levels
    level_1_approver_type = Column(String(50), default=ApprovalLevel.MANAGER)
    level_1_approver_id = Column(UUID(as_uuid=True), nullable=True)  # Specific user if custom
    
    level_2_approver_type = Column(String(50), nullable=True)
    level_2_approver_id = Column(UUID(as_uuid=True), nullable=True)
    
    level_3_approver_type = Column(String(50), nullable=True)
    level_3_approver_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority evaluated first
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== LEAVE REQUEST ====================

class LeaveRequest(Base):
    """
    Main Leave Request Model
    Comprehensive leave request with multi-level approval
    """
    __tablename__ = "leave_requests"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Request Info
    request_number = Column(String(50), unique=True, nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    # Leave Type
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    
    # Date Range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=True)  # For half-day requests "HH:mm"
    end_time = Column(String(10), nullable=True)
    
    # Days Calculation
    total_days = Column(DECIMAL(5, 1), nullable=False)
    deduction_days = Column(DECIMAL(5, 1), nullable=False)  # Actual days to deduct
    is_half_day = Column(Boolean, default=False)
    is_hourly = Column(Boolean, default=False)
    hours_requested = Column(DECIMAL(5, 2), default=0)
    
    # Reason & Details
    reason = Column(Text, nullable=True)
    destination = Column(String(255), nullable=True)  # Where they'll be
    contact_number = Column(String(50), nullable=True)  # Contact during leave
    
    # Documents
    documents = Column(JSON, default=list)  # List of document paths
    document_descriptions = Column(JSON, default=list)
    
    # Status Tracking
    status = Column(String(30), default=LeaveRequestStatus.DRAFT)
    
    # Level 1 Approval (Manager)
    level_1_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    level_1_approved_at = Column(DateTime, nullable=True)
    level_1_approved = Column(Boolean, default=False)
    level_1_notes = Column(Text, nullable=True)
    level_1_rejected_reason = Column(Text, nullable=True)
    
    # Level 2 Approval (Dept Head/HR)
    level_2_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    level_2_approved_at = Column(DateTime, nullable=True)
    level_2_approved = Column(Boolean, default=False)
    level_2_notes = Column(Text, nullable=True)
    level_2_rejected_reason = Column(Text, nullable=True)
    
    # Level 3 Approval (Director)
    level_3_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    level_3_approved_at = Column(DateTime, nullable=True)
    level_3_approved = Column(Boolean, default=False)
    level_3_notes = Column(Text, nullable=True)
    level_3_rejected_reason = Column(Text, nullable=True)
    
    # Final Approval (for backward compatibility)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Handover
    handover_to_employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    handover_notes = Column(Text, nullable=True)
    handover_completed = Column(Boolean, default=False)
    
    # Replacement
    replacement_employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    
    # Cancellation
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    
    # Expiry
    expires_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    submitted_at = Column(DateTime, nullable=True)
    
    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], backref="leave_requests")
    leave_type = relationship("LeaveType", backref="leave_requests")
    level_1_approver = relationship("User", foreign_keys=[level_1_approver_id])
    level_2_approver = relationship("User", foreign_keys=[level_2_approver_id])
    level_3_approver = relationship("User", foreign_keys=[level_3_approver_id])
    approver = relationship("User", foreign_keys=[approved_by])
    handover_to = relationship("Employee", foreign_keys=[handover_to_employee_id])
    replacement = relationship("Employee", foreign_keys=[replacement_employee_id])
    canceller = relationship("User", foreign_keys=[cancelled_by])


# ==================== LEAVE ENTITLEMENT ====================

class LeaveEntitlement(Base):
    """
    Leave Entitlement / Allocation Record
    Tracks annual allocation of leave to employees
    """
    __tablename__ = "leave_entitlements"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Links
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    
    # Entitlement Details
    year = Column(Integer, nullable=False)
    allocated_days = Column(DECIMAL(5, 1), nullable=False)
    description = Column(String(255), nullable=True)
    
    # Source of entitlement
    is_carry_over = Column(Boolean, default=False)
    is_adjustment = Column(Boolean, default=False)
    adjustment_reason = Column(Text, nullable=True)
    
    # Created by
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    employee = relationship("Employee", backref="leave_entitlements")
    leave_type = relationship("LeaveType", backref="entitlements")
    creator = relationship("User", foreign_keys=[created_by])


# ==================== LEAVE APPROVAL HISTORY ====================

class LeaveApprovalHistory(Base):
    """
    Leave Approval History / Audit Trail
    """
    __tablename__ = "leave_approval_history"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Link to Leave Request
    leave_request_id = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id"), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Action Details
    action = Column(String(50), nullable=False)  # submit, approve, reject, cancel, etc.
    level = Column(Integer, nullable=True)  # 1, 2, 3 for multi-level
    
    # Previous & New Status
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Metadata
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    leave_request = relationship("LeaveRequest", backref="approval_history")
    actor = relationship("User", foreign_keys=[actor_id])


# ==================== LEAVE CALENDAR ====================

class LeaveCalendar(Base):
    """
    Leave Calendar for Team Planning
    """
    __tablename__ = "leave_calendars"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Links
    leave_request_id = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id"), nullable=False)
    
    # Calendar Details
    date = Column(Date, nullable=False, index=True)
    is_holiday = Column(Boolean, default=False)
    is_weekend = Column(Boolean, default=False)
    
    # Relationships
    leave_request = relationship("LeaveRequest", backref="calendar_entries")


# ==================== PUBLIC HOLIDAYS ====================

class PublicHoliday(Base):
    """
    Public Holidays Configuration
    """
    __tablename__ = "public_holidays"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Holiday Details
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=True)
    date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # For multi-day holidays
    
    # Recurrence
    is_recurring = Column(Boolean, default=True)  # Repeats every year
    
    # Country/Region
    country = Column(String(100), default="General")
    region = Column(String(100), nullable=True)
    
    # Settings
    is_paid = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    # Color for display
    color = Column(String(7), default="#EF4444")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== LEAVE REPORT ====================

class LeaveReport(Base):
    """
    Leave Reports Summary
    """
    __tablename__ = "leave_reports"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Report Details
    name = Column(String(100), nullable=False)
    report_type = Column(String(50), nullable=False)  # summary, detailed, balance, usage
    
    # Filters
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    department_ids = Column(JSON, default=list)
    employee_ids = Column(JSON, default=list)
    leave_type_ids = Column(JSON, default=list)
    
    # Generated By
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime, default=func.now())
    
    # File Location
    file_path = Column(String(500), nullable=True)


# ==================== ENHANCED APPROVAL WORKFLOW ====================

class ApprovalWorkflow(Base):
    """
    Enhanced Approval Workflow
    Defines approval workflow with employee groups and sequential steps
    """
    __tablename__ = "approval_workflows"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Workflow Name
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Trigger Conditions (JSON)
    # e.g., {"leave_type_ids": [], "department_ids": [], "employee_level": "all"}
    trigger_conditions = Column(JSON, default=dict)
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority evaluated first
    
    # Is default workflow for employees not in any specific group
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class ApprovalWorkflowStep(Base):
    """
    Individual Approval Step in a Workflow
    Each step can be linked to a specific employee or role
    """
    __tablename__ = "approval_workflow_steps"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Link to Workflow
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("approval_workflows.id"), nullable=False)
    
    # Step Order (1, 2, 3, etc.)
    step_order = Column(Integer, nullable=False)
    
    # Step Name
    name = Column(String(100), nullable=False)
    
    # Approver Type: manager, dept_head, hr_manager, director, custom, employee
    approver_type = Column(String(50), nullable=False, default=ApprovalLevel.MANAGER)
    
    # Specific approver ID (if approver_type is custom or employee)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Or specific employee ID (for direct approval by an employee)
    approver_employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    
    # Auto-assign: if true, system will find the approver based on type
    auto_assign = Column(Boolean, default=True)
    
    # Can delegate this step?
    allow_delegation = Column(Boolean, default=False)
    
    # Is active
    is_active = Column(Boolean, default=True)
    
    # Relationships
    workflow = relationship("ApprovalWorkflow", backref="steps")
    approver = relationship("User", foreign_keys=[approver_id])
    approver_employee = relationship("Employee", foreign_keys=[approver_employee_id])


class WorkflowEmployeeGroup(Base):
    """
    Employee Groups assigned to specific workflows
    Links employees to approval workflows
    """
    __tablename__ = "workflow_employee_groups"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Link to Workflow
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("approval_workflows.id"), nullable=False)
    
    # Employee IDs (stored as JSON array)
    employee_ids = Column(JSON, default=list)
    
    # Department IDs (all employees in these departments)
    department_ids = Column(JSON, default=list)
    
    # Job title/level filter
    employee_levels = Column(JSON, default=list)
    
    # Is active
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    workflow = relationship("ApprovalWorkflow", backref="employee_groups")


class LeaveRequestApprovalStep(Base):
    """
    Tracks the current approval step for each leave request
    Links a leave request to its current approver
    """
    __tablename__ = "leave_request_approval_steps"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Link to Leave Request
    leave_request_id = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id"), nullable=False)
    
    # Current Step in Workflow
    current_step = Column(Integer, default=1)  # 1, 2, 3, etc.
    
    # Total steps required
    total_steps = Column(Integer, default=1)
    
    # Workflow used
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("approval_workflows.id"), nullable=True)
    
    # Current approver
    current_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Approval status: pending, approved, rejected
    approval_status = Column(String(20), default="pending")
    
    # All approval steps history
    step_history = Column(JSON, default=list)
    # e.g., [{"step": 1, "approver_id": "...", "status": "approved", "timestamp": "..."}]
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    leave_request = relationship("LeaveRequest", backref="approval_steps")
    workflow = relationship("ApprovalWorkflow")
    current_approver = relationship("User", foreign_keys=[current_approver_id])
    
    # Relationships
    generator = relationship("User")
