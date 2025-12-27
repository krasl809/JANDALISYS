from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime
import uuid

# --- Employee Schemas ---

class EmployeePersonalInfoBase(BaseModel):
    # Arabic Names
    first_name_arabic: Optional[str] = None
    middle_name_arabic: Optional[str] = None
    last_name_arabic: Optional[str] = None
    full_name_arabic: Optional[str] = None
    
    # English Names
    first_name_english: Optional[str] = None
    middle_name_english: Optional[str] = None
    last_name_english: Optional[str] = None
    full_name_english: Optional[str] = None
    
    # Personal Details
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    
    # Identification
    national_id: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    
    # Contact Information
    personal_email: Optional[EmailStr] = None
    personal_phone: Optional[str] = None
    mobile_primary: Optional[str] = None
    mobile_secondary: Optional[str] = None
    
    # Address Information
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

    # Employment Information
    company: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    # Family Information
    marital_status: Optional[str] = None
    spouse_name: Optional[str] = None
    spouse_employment: Optional[str] = None
    number_of_children: Optional[int] = 0
    
    # Health Information
    blood_type: Optional[str] = None
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None

class EmployeePersonalInfoCreate(EmployeePersonalInfoBase):
    employee_id: uuid.UUID

class EmployeePersonalInfo(EmployeePersonalInfoBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeBankBase(BaseModel):
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    primary_account: bool = True

class EmployeeBankCreate(EmployeeBankBase):
    employee_id: uuid.UUID

class EmployeeBank(EmployeeBankBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeEmergencyContactBase(BaseModel):
    full_name: str
    relationship: Optional[str] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    primary_contact: bool = True

class EmployeeEmergencyContactCreate(EmployeeEmergencyContactBase):
    employee_id: uuid.UUID

class EmployeeEmergencyContact(EmployeeEmergencyContactBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeDocumentBase(BaseModel):
    document_type: str
    document_name: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    document_number: Optional[str] = None
    
    is_verified: bool = False
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None

class EmployeeDocumentCreate(EmployeeDocumentBase):
    employee_id: uuid.UUID

class EmployeeDocument(EmployeeDocumentBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeSalaryBase(BaseModel):
    basic_salary: float
    currency: str = "USD"
    
    # Allowances
    housing_allowance: float = 0
    transport_allowance: float = 0
    food_allowance: float = 0
    medical_allowance: float = 0
    other_allowances: float = 0
    
    # Deductions
    tax_deduction: float = 0
    insurance_deduction: float = 0
    other_deductions: float = 0
    
    effective_date: Optional[date] = None
    is_current: bool = True

class EmployeeSalaryCreate(EmployeeSalaryBase):
    employee_id: uuid.UUID

class EmployeeSalary(EmployeeSalaryBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeLeaveBase(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    reason: Optional[str] = None
    status: str = "pending"
    
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None

class EmployeeLeaveCreate(EmployeeLeaveBase):
    employee_id: uuid.UUID

class EmployeeLeave(EmployeeLeaveBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeePerformanceBase(BaseModel):
    review_period: Optional[str] = None
    review_date: Optional[date] = None
    
    # Performance Scores (1-5)
    technical_skills: Optional[int] = None
    communication: Optional[int] = None
    leadership: Optional[int] = None
    teamwork: Optional[int] = None
    punctuality: Optional[int] = None
    
    overall_score: Optional[float] = None
    
    goals_achieved: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    future_goals: Optional[str] = None
    
    reviewer_id: Optional[uuid.UUID] = None
    status: str = "draft"

class EmployeePerformanceCreate(EmployeePerformanceBase):
    employee_id: uuid.UUID

class EmployeePerformance(EmployeePerformanceBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeTrainingBase(BaseModel):
    training_name: str
    training_type: Optional[str] = None
    provider: Optional[str] = None
    
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours: Optional[float] = None
    
    status: str = "planned"
    cost: Optional[float] = None
    
    certificate_issued: bool = False
    certificate_number: Optional[str] = None

class EmployeeTrainingCreate(EmployeeTrainingBase):
    employee_id: uuid.UUID

class EmployeeTraining(EmployeeTrainingBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeWorkHistoryBase(BaseModel):
    company_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    
    salary: Optional[float] = None
    currency: str = "USD"
    
    reason_for_leaving: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None

class EmployeeWorkHistoryCreate(EmployeeWorkHistoryBase):
    employee_id: uuid.UUID

class EmployeeWorkHistory(EmployeeWorkHistoryBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeSystemAccessBase(BaseModel):
    system_role: str
    permissions: Optional[str] = None
    
    can_access_hr: bool = False
    can_access_finance: bool = False
    can_access_inventory: bool = False
    can_access_contracts: bool = False
    can_access_reports: bool = False
    
    last_login: Optional[datetime] = None
    is_active: bool = True

class EmployeeSystemAccessCreate(EmployeeSystemAccessBase):
    employee_id: uuid.UUID

class EmployeeSystemAccess(EmployeeSystemAccessBase):
    id: uuid.UUID
    employee_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# --- Comprehensive Employee Form Data ---
class EmployeeFormData(BaseModel):
    # User Basic Info (existing fields)
    name: str
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: str = "employee"
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    employee_id: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    
    # Employment Information
    employment_type: str = "full_time"  # full_time, part_time, contract, intern, temporary
    job_title: Optional[str] = None
    reporting_to: Optional[str] = None
    work_location: Optional[str] = None
    work_schedule: Optional[str] = None
    
    # Status
    status: str = "active"  # active, inactive, probation, resigned, terminated, on_leave
    
    # Personal Information
    personal_info: Optional[EmployeePersonalInfoCreate] = None
    
    # Bank Information
    bank_info: Optional[EmployeeBankCreate] = None
    
    # Emergency Contacts
    emergency_contacts: List[EmployeeEmergencyContactCreate] = []
    
    # Salary Information
    salary_info: Optional[EmployeeSalaryCreate] = None
    
    # System Access (RBAC)
    system_access: Optional[EmployeeSystemAccessCreate] = None
    
    # Documents
    documents: List[EmployeeDocumentCreate] = []
    
    # Work History
    work_history: List[EmployeeWorkHistoryCreate] = []

class EmployeeFormResponse(BaseModel):
    # Basic User Info
    id: uuid.UUID
    name: str
    email: str
    role: str
    department: Optional[str]
    position: Optional[str]
    hire_date: Optional[date]
    employee_id: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    is_active: bool
    created_at: datetime
    
    # Personal Information
    personal_info: Optional[EmployeePersonalInfo] = None
    
    # Bank Information
    bank_info: Optional[EmployeeBank] = None
    
    # Emergency Contacts
    emergency_contacts: List[EmployeeEmergencyContact] = []
    
    # Salary Information
    salary_info: Optional[EmployeeSalary] = None
    
    # System Access
    system_access: Optional[EmployeeSystemAccess] = None
    
    # Documents
    documents: List[EmployeeDocument] = []
    
    # Work History
    work_history: List[EmployeeWorkHistory] = []
    
    # Manager Information
    manager_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Employee List and Search ---
class EmployeeListItem(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    employee_id: Optional[str]
    department: Optional[str]
    position: Optional[str]
    status: str
    hire_date: Optional[date]
    phone: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True

class EmployeeSearchRequest(BaseModel):
    search: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    employment_type: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    page: int = 1
    limit: int = 50

class EmployeeSearchResponse(BaseModel):
    employees: List[EmployeeListItem]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

# --- Employee Update ---
class EmployeeUpdate(BaseModel):
    # Basic Info
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    
    # Employment
    employment_type: Optional[str] = None
    job_title: Optional[str] = None
    reporting_to: Optional[str] = None
    work_location: Optional[str] = None
    work_schedule: Optional[str] = None
    
    # Status
    status: Optional[str] = None
    
    # Personal Info
    personal_info: Optional[EmployeePersonalInfoBase] = None
    
    # Bank Info
    bank_info: Optional[EmployeeBankBase] = None
    
    # Emergency Contacts
    emergency_contacts: List[EmployeeEmergencyContactBase] = []
    
    # Salary Info
    salary_info: Optional[EmployeeSalaryBase] = None
    
    # System Access
    system_access: Optional[EmployeeSystemAccessBase] = None

# --- Employee Statistics ---
class EmployeeStatistics(BaseModel):
    total_employees: int
    active_employees: int
    inactive_employees: int
    probation_employees: int
    new_hires_this_month: int
    resigned_this_month: int
    
    by_department: Dict[str, int]
    by_status: Dict[str, int]
    by_employment_type: Dict[str, int]
    
    average_salary: Optional[float]
    total_payroll: Optional[float]

# --- Employee Document Upload ---
class EmployeeDocumentUpload(BaseModel):
    employee_id: uuid.UUID
    document_type: str
    document_name: str
    file_content: str  # base64 encoded file content
    file_name: str
    mime_type: str

class EmployeeDocumentUploadResponse(BaseModel):
    id: uuid.UUID
    document_name: str
    document_type: str
    file_path: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True