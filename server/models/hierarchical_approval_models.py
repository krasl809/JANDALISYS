"""
Hierarchical Approval Workflow Models
Multi-level approval system for leave management
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, DECIMAL, Enum as SqlEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from core.database import Base


# ==================== ENUMS ====================

class ApprovalLevelType(str, enum.Enum):
    """Approval Level Types"""
    DIRECT_SUPERVISOR = "direct_supervisor"      # المسؤول المباشر
    DEPARTMENT_MANAGER = "department_manager"    # مدير القسم
    FACILITY_MANAGER = "facility_manager"        # مدير المنشأة
    HR_MANAGER = "hr_manager"                    # مدير الموارد البشرية
    EXECUTIVE_MANAGER = "executive_manager"      # المدير التنفيذي (للإدارة العامة فقط)


class ApprovalStatus(str, enum.Enum):
    """Approval Status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"  # Returned for modification


class LeaveRequestStatus(str, enum.Enum):
    """Leave Request Status with Hierarchical Levels"""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED_LEVEL_1 = "approved_level_1"    # Approved by Direct Supervisor
    APPROVED_LEVEL_2 = "approved_level_2"    # Approved by Department Manager
    APPROVED_LEVEL_3 = "approved_level_3"    # Approved by Facility Manager
    APPROVED_LEVEL_4 = "approved_level_4"    # Approved by HR Manager
    APPROVED = "approved"                    # Fully approved
    REJECTED = "rejected"
    CANCELLED = "cancelled"


# ==================== FACILITY MODEL ====================

class Facility(Base):
    """
    Facility/Organization Model
    Represents different facilities/organizations in the company
    """
    __tablename__ = "facilities"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=True)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Manager
    manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    manager = relationship("Employee", foreign_keys=[manager_id])
    departments = relationship("Department", back_populates="facility")
    employees = relationship("Employee", back_populates="facility")


# ==================== DEPARTMENT MODEL ====================

class Department(Base):
    """
    Department Model
    Represents departments within facilities
    """
    __tablename__ = "departments"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=True)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Hierarchy
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    parent_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    
    # Manager
    manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    facility = relationship("Facility", back_populates="departments")
    parent = relationship("Department", remote_side=[id], backref="children")
    manager = relationship("Employee", foreign_keys=[manager_id])
    employees = relationship("Employee", back_populates="department")


# ==================== ENHANCED EMPLOYEE MODEL ====================

# Add these fields to existing Employee model via migration:
"""
New fields to add to employees table:

1. facility_id UUID REFERENCES facilities(id)
2. department_id UUID REFERENCES departments(id)
3. direct_supervisor_id UUID REFERENCES employees(id)
4. department_manager_id UUID REFERENCES employees(id)
5. facility_manager_id UUID REFERENCES employees(id)
6. hr_manager_id UUID REFERENCES employees(id)
7. executive_manager_id UUID REFERENCES employees(id)
8. is_general_admin BOOLEAN DEFAULT FALSE
9. annual_leave_balance_start DECIMAL(5,1) DEFAULT 0
10. annual_leave_balance_remaining DECIMAL(5,1) DEFAULT 0
11. profile_picture VARCHAR(500)
"""


# ==================== APPROVAL CHAIN CONFIGURATION ====================

class ApprovalChainConfig(Base):
    """
    Approval Chain Configuration
    Defines approval workflow for different employee types
    """
    __tablename__ = "approval_chain_configs"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Chain Name
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Trigger Conditions
    is_for_general_admin = Column(Boolean, default=False)  # Only for General Administration
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    
    # Approval Levels Configuration
    level_1_enabled = Column(Boolean, default=True)
    level_1_approver_type = Column(String(50), default=ApprovalLevelType.DIRECT_SUPERVISOR)
    
    level_2_enabled = Column(Boolean, default=True)
    level_2_approver_type = Column(String(50), default=ApprovalLevelType.DEPARTMENT_MANAGER)
    
    level_3_enabled = Column(Boolean, default=True)
    level_3_approver_type = Column(String(50), default=ApprovalLevelType.FACILITY_MANAGER)
    
    level_4_enabled = Column(Boolean, default=True)
    level_4_approver_type = Column(String(50), default=ApprovalLevelType.HR_MANAGER)
    
    level_5_enabled = Column(Boolean, default=False)  # Only for General Admin
    level_5_approver_type = Column(String(50), default=ApprovalLevelType.EXECUTIVE_MANAGER)
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority evaluated first
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    facility = relationship("Facility")
    department = relationship("Department")


# ==================== LEAVE REQUEST APPROVAL TRACKING ====================

class LeaveRequestApproval(Base):
    """
    Leave Request Approval Tracking
    Tracks each approval step for a leave request
    """
    __tablename__ = "leave_request_approvals"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Links
    leave_request_id = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    # Approval Details
    approval_level = Column(Integer, nullable=False)  # 1, 2, 3, 4, 5
    approver_type = Column(String(50), nullable=False)  # direct_supervisor, dept_manager, etc.
    
    # Status
    status = Column(String(20), default=ApprovalStatus.PENDING)
    approved_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    leave_request = relationship("LeaveRequest", backref="approval_steps")
    approver = relationship("Employee", foreign_keys=[approver_id])


# ==================== EMPLOYEE ATTENDANCE WITH GPS ====================

class EmployeeAttendanceGPS(Base):
    """
    Employee Attendance with GPS Location
    Records check-in/check-out with camera and GPS
    """
    __tablename__ = "employee_attendance_gps"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Employee
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    # Attendance Type
    type = Column(String(20), nullable=False)  # check_in, check_out
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, default=func.now())
    
    # GPS Location
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)
    location_accuracy = Column(DECIMAL(10, 2), nullable=True)  # in meters
    location_address = Column(Text, nullable=True)  # Reverse geocoded address
    
    # Camera Photo
    photo_url = Column(String(500), nullable=True)
    photo_base64 = Column(Text, nullable=True)  # Base64 encoded photo
    
    # Device Info
    device_type = Column(String(50), nullable=True)  # mobile, tablet, desktop
    device_id = Column(String(100), nullable=True)
    device_model = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    
    # Status
    status = Column(String(20), default="present")  # present, late, early_leave
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id], backref="attendance_records")
    verifier = relationship("Employee", foreign_keys=[verified_by])


# ==================== HR SETTINGS ====================

class HRSettings(Base):
    """
    HR Settings Configuration
    Stores system-wide HR settings
    """
    __tablename__ = "hr_settings"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Setting Key-Value
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(Text, nullable=True)
    setting_type = Column(String(50), default="string")  # string, number, boolean, json
    
    # Metadata
    description = Column(Text, nullable=True)
    description_ar = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)  # leave, attendance, approval, etc.
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==================== EMPLOYEE REGISTRATION REQUEST ====================

class EmployeeRegistrationRequest(Base):
    """
    Employee Registration Request
    For HR to register new employees with camera photo
    """
    __tablename__ = "employee_registration_requests"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Request Info
    request_number = Column(String(50), unique=True, nullable=False)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Employee Data (from Excel)
    employee_code = Column(String(50), nullable=False)
    full_name = Column(String(255), nullable=False)
    hire_date = Column(Date, nullable=False)
    
    # Leave Balance
    annual_leave_balance_start = Column(DECIMAL(5, 1), default=0)
    annual_leave_balance_remaining = Column(DECIMAL(5, 1), default=0)
    
    # Organization
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=True)
    job_title = Column(String(100), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    
    # Hierarchy
    direct_supervisor_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    department_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    facility_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    hr_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    executive_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    
    # Photo
    profile_picture_url = Column(String(500), nullable=True)
    profile_picture_base64 = Column(Text, nullable=True)
    
    # Status
    status = Column(String(20), default="pending")  # pending, approved, rejected, completed
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    requester = relationship("User", foreign_keys=[requested_by])
    approver = relationship("User", foreign_keys=[approved_by])
    facility = relationship("Facility")
    department = relationship("Department")
    direct_supervisor = relationship("Employee", foreign_keys=[direct_supervisor_id])
    department_manager = relationship("Employee", foreign_keys=[department_manager_id])
    facility_manager = relationship("Employee", foreign_keys=[facility_manager_id])
    hr_manager = relationship("Employee", foreign_keys=[hr_manager_id])
    executive_manager = relationship("Employee", foreign_keys=[executive_manager_id])
