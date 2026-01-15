from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, DECIMAL, Enum as SqlEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from core.database import Base

# Employment Types
class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time" 
    CONTRACT = "contract"
    INTERN = "intern"
    TEMPORARY = "temporary"

# Employee Status
class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROBATION = "probation"
    RESIGNED = "resigned"
    TERMINATED = "terminated"
    ON_LEAVE = "on_leave"

# Gender
class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"

# Document Type
class DocumentType(str, enum.Enum):
    NATIONAL_ID = "national_id"
    PASSPORT = "passport"
    RESUME = "resume"
    CONTRACT = "contract"
    CERTIFICATE = "certificate"
    PROFILE_PICTURE = "profile_picture"
    OTHER = "other"

# --- NEW EMPLOYEE TABLE ---
class Employee(Base):
    """
    Central Employee Table. 
    Separated from User (Auth) to allow employees without login 
    and strict RBAC control.
    """
    __tablename__ = "employees"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core Identification
    code = Column(String(50), unique=True, nullable=False, index=True) # e.g. EMP-001
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(255), index=True) # Computed
    
    # Official Work Info
    work_email = Column(String(255), unique=True, nullable=True) # Contact email
    department_id = Column(UUID(as_uuid=True), nullable=True) # Link to Department model if exists (TODO)
    department_name = Column(String(100)) # Fallback/Cache
    company = Column(String(100)) # New Field

    
    position = Column(String(100))
    joining_date = Column(Date)
    
    status = Column(String(50), default=EmployeeStatus.ACTIVE)
    employment_type = Column(String(50), default=EmploymentType.FULL_TIME)
    
    # Link to Auth User (Optional)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=True)
    
    # Basic Contact (Moved from PersonalInfo for easier access)
    phone = Column(String(50))
    address = Column(Text)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="employee_profile")
    bank_info = relationship("EmployeeBank", back_populates="employee", uselist=False)
    emergency_contact = relationship("EmployeeEmergencyContact", back_populates="employee", uselist=False)
    documents = relationship("EmployeeDocument", back_populates="employee")
    personal_info = relationship("EmployeePersonalInfo", back_populates="employee", uselist=False)
    salary_info = relationship("EmployeeSalary", back_populates="employee", uselist=False)
    leaves = relationship("EmployeeLeave", back_populates="employee")

# Employee Bank Information
class EmployeeBank(Base):
    __tablename__ = "employee_banks"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    bank_name = Column(String(255))
    bank_account = Column(String(100))
    iban = Column(String(34))
    swift_code = Column(String(11))
    
    primary_account = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="bank_info")

# Employee Emergency Contacts
class EmployeeEmergencyContact(Base):
    __tablename__ = "employee_emergency_contacts"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    full_name = Column(String(255), nullable=False)
    relationship_type = Column(String(100))  # Father, Mother, Wife, etc.
    phone_primary = Column(String(20))
    phone_secondary = Column(String(20))
    email = Column(String(255))
    address = Column(Text)
    
    primary_contact = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="emergency_contact")

# Employee Documents
class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    document_type = Column(String(50), nullable=False)  # national_id, passport, resume, etc.
    document_name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    
    issue_date = Column(Date)
    expiry_date = Column(Date)
    issuing_authority = Column(String(255))
    document_number = Column(String(100))
    
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    verified_at = Column(DateTime)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="documents")
    verifier = relationship("User", foreign_keys=[verified_by])

# Employee Salary Information
class EmployeeSalary(Base):
    __tablename__ = "employee_salaries"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    basic_salary = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Allowances
    housing_allowance = Column(DECIMAL(10, 2), default=0)
    transport_allowance = Column(DECIMAL(10, 2), default=0)
    food_allowance = Column(DECIMAL(10, 2), default=0)
    medical_allowance = Column(DECIMAL(10, 2), default=0)
    other_allowances = Column(DECIMAL(10, 2), default=0)
    
    # Deductions
    tax_deduction = Column(DECIMAL(10, 2), default=0)
    insurance_deduction = Column(DECIMAL(10, 2), default=0)
    other_deductions = Column(DECIMAL(10, 2), default=0)
    
    effective_date = Column(Date, default=func.current_date())
    is_current = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="salary_info")

# Employee Leave Information
class EmployeeLeave(Base):
    __tablename__ = "employee_leaves"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    leave_type = Column(String(50))  # Annual, Sick, Emergency, etc.
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(DECIMAL(4, 1), nullable=False)
    
    reason = Column(Text)
    status = Column(String(20), default="pending")  # pending, approved, rejected, cancelled
    
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at = Column(DateTime)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="leaves")
    approver = relationship("User", foreign_keys=[approved_by])

# Employee Performance Reviews
class EmployeePerformance(Base):
    __tablename__ = "employee_performance"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    review_period = Column(String(100))  # Q1 2024, Annual 2024, etc.
    review_date = Column(Date, default=func.current_date())
    
    # Performance Scores (1-5)
    technical_skills = Column(Integer)
    communication = Column(Integer)
    leadership = Column(Integer)
    teamwork = Column(Integer)
    punctuality = Column(Integer)
    
    overall_score = Column(DECIMAL(3, 2))
    
    goals_achieved = Column(Text)
    areas_of_improvement = Column(Text)
    future_goals = Column(Text)
    
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String(20), default="draft")  # draft, submitted, reviewed
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])

# Employee Training Records
class EmployeeTraining(Base):
    __tablename__ = "employee_training"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    training_name = Column(String(255), nullable=False)
    training_type = Column(String(100))  # Technical, Soft Skills, Compliance, etc.
    provider = Column(String(255))
    
    start_date = Column(Date)
    end_date = Column(Date)
    hours = Column(DECIMAL(5, 2))
    
    status = Column(String(20), default="planned")  # planned, in_progress, completed, cancelled
    cost = Column(DECIMAL(10, 2))
    
    certificate_issued = Column(Boolean, default=False)
    certificate_number = Column(String(100))
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee")

# Employee Work History
class EmployeeWorkHistory(Base):
    __tablename__ = "employee_work_history"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    company_name = Column(String(255))
    position = Column(String(255))
    department = Column(String(100))
    
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Boolean, default=False)
    
    salary = Column(DECIMAL(12, 2))
    currency = Column(String(3), default="USD")
    
    reason_for_leaving = Column(Text)
    contact_person = Column(String(255))
    contact_phone = Column(String(20))
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    employee = relationship("Employee")

# Employee System Access (RBAC Integration)
class EmployeeSystemAccess(Base):
    __tablename__ = "employee_system_access"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    system_role = Column(String(50), nullable=False)  # admin, hr_manager, employee, etc.
    permissions = Column(Text)  # JSON string of permissions
    
    can_access_hr = Column(Boolean, default=False)
    can_access_finance = Column(Boolean, default=False)
    can_access_inventory = Column(Boolean, default=False)
    can_access_contracts = Column(Boolean, default=False)
    can_access_reports = Column(Boolean, default=False)
    
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee")

# Employee Personal Information (Extended)
class EmployeePersonalInfo(Base):
    __tablename__ = "employee_personal_info"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    # Arabic Names
    first_name_arabic = Column(String(100))
    middle_name_arabic = Column(String(100))
    last_name_arabic = Column(String(100))
    full_name_arabic = Column(String(300))
    
    # English Names
    first_name_english = Column(String(100))
    middle_name_english = Column(String(100))
    last_name_english = Column(String(100))
    full_name_english = Column(String(300))
    
    # Personal Details
    date_of_birth = Column(Date)
    place_of_birth = Column(String(255))
    nationality = Column(String(100))
    gender = Column(String(10))  # male, female
    
    # Identification
    national_id = Column(String(50))
    passport_number = Column(String(50))
    passport_expiry = Column(Date)
    
    # Contact Information
    personal_email = Column(String(255))
    personal_phone = Column(String(20))
    mobile_primary = Column(String(20))
    mobile_secondary = Column(String(20))
    
    # Address Information
    address_line1 = Column(Text)
    address_line2 = Column(Text)
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100))

    # Employment Information (Legacy fields, can be null now as they are in Employee)
    company = Column(String(100))  # Company name for multi-company groups
    department = Column(String(100))
    position = Column(String(100))
    hire_date = Column(Date)
    phone = Column(String(50))  # Work phone
    address = Column(Text)  # Work address

    # Family Information
    marital_status = Column(String(20))  # single, married, divorced, widowed
    spouse_name = Column(String(255))
    spouse_employment = Column(String(255))
    number_of_children = Column(Integer, default=0)
    
    # Health Information
    blood_type = Column(String(10))
    medical_conditions = Column(Text)
    allergies = Column(Text)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="personal_info")