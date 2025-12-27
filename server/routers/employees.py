from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from core.database import get_db
from models import core_models
from models.employee_models import (
    EmployeePersonalInfo, EmployeeBank, EmployeeEmergencyContact,
    EmployeeDocument, EmployeeSalary, EmployeeLeave, EmployeePerformance,
    EmployeeTraining, EmployeeWorkHistory, EmployeeSystemAccess
)
from schemas.employee_schemas import (
    EmployeeFormData, EmployeeFormResponse, EmployeeListItem, 
    EmployeeSearchRequest, EmployeeSearchResponse, EmployeeUpdate,
    EmployeeStatistics, EmployeeDocumentUpload, EmployeeDocumentUploadResponse,
    EmployeePersonalInfoCreate, EmployeeBankCreate, EmployeeEmergencyContactCreate,
    EmployeeDocumentCreate, EmployeeSalaryCreate, EmployeeSystemAccessCreate,
    EmployeeWorkHistoryCreate
)
from core.auth import get_current_user_obj, get_password_hash
from typing import List, Optional
import uuid
import os
import base64
from datetime import datetime, date
import re

router = APIRouter(tags=["Employee Management"])

@router.get("/test")
def test_endpoint():
    return {"message": "Employee router is working!"}

# --- Helper Functions ---

def validate_employee_data(data: EmployeeFormData) -> dict:
    """Validate and prepare employee data"""
    errors = []
    
    # Validate email format
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", data.email):
        errors.append("Invalid email format")
    
    # Validate employee_id uniqueness if provided
    if data.employee_id and len(data.employee_id) < 3:
        errors.append("Employee ID must be at least 3 characters")
    
    # Validate dates
    if data.hire_date and data.hire_date > date.today():
        errors.append("Hire date cannot be in the future")
    
    if data.personal_info and data.personal_info.date_of_birth:
        if data.personal_info.date_of_birth >= date.today():
            errors.append("Date of birth cannot be in the future")
        # Check if person is at least 16 years old
        age = (date.today() - data.personal_info.date_of_birth).days // 365
        if age < 16:
            errors.append("Employee must be at least 16 years old")
    
    # Validate salary
    if data.salary_info and data.salary_info.basic_salary <= 0:
        errors.append("Basic salary must be greater than 0")
    
    # Validate phone numbers (basic validation)
    phone_pattern = re.compile(r'^[\+]?[1-9][\d]{0,15}$')
    if data.phone and not phone_pattern.match(re.sub(r'[\s\-\(\)]', '', data.phone)):
        errors.append("Invalid phone number format")
    
    if data.personal_info and data.personal_info.mobile_primary:
        if not phone_pattern.match(re.sub(r'[\s\-\(\)]', '', data.personal_info.mobile_primary)):
            errors.append("Invalid mobile number format")
    
    if errors:
        raise HTTPException(status_code=400, detail=f"Validation errors: {', '.join(errors)}")
    
    return {}

def generate_employee_id(db: Session) -> str:
    """Generate unique employee ID"""
    # Get current year
    current_year = str(datetime.now().year)[-2:]
    
    # Find the last employee ID for current year
    last_employee = db.query(core_models.User).filter(
        core_models.User.employee_id.like(f"EMP{current_year}%")
    ).order_by(core_models.User.employee_id.desc()).first()
    
    if last_employee and last_employee.employee_id:
        # Extract the number and increment
        try:
            last_number = int(last_employee.employee_id[-3:])
            new_number = last_number + 1
        except ValueError:
            new_number = 1
    else:
        new_number = 1
    
    return f"EMP{current_year}{new_number:03d}"

def save_uploaded_file(file_content: str, file_name: str, employee_id: str) -> str:
    """Save uploaded file and return path"""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join("uploads", "employees", employee_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Decode base64 content
        file_data = base64.b64decode(file_content)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file_name)[1]
        unique_filename = f"{timestamp}_{file_name}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        return file_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

# --- Employee CRUD Operations ---

@router.post("/", response_model=EmployeeFormResponse)
def create_employee(
    employee_data: EmployeeFormData,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Create new employee with comprehensive data"""
    
    # Validate data
    validate_employee_data(employee_data)
    
    # Check if email already exists
    existing_user = db.query(core_models.User).filter(
        core_models.User.email == employee_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if employee_id already exists (if provided)
    if employee_data.employee_id:
        existing_emp_id = db.query(core_models.User).filter(
            core_models.User.employee_id == employee_data.employee_id
        ).first()
        
        if existing_emp_id:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    try:
        # Generate employee ID if not provided
        if not employee_data.employee_id:
            employee_data.employee_id = generate_employee_id(db)
        
        # Hash password if provided
        password_hash = get_password_hash(employee_data.password or "123456")
        
        # Create main user record
        new_user = core_models.User(
            name=employee_data.name,
            email=employee_data.email,
            password=password_hash,
            role=employee_data.role,
            department=employee_data.department,
            position=employee_data.position,
            hire_date=employee_data.hire_date,
            employee_id=employee_data.employee_id,
            manager_id=employee_data.manager_id,
            phone=employee_data.phone,
            address=employee_data.address,
            is_active=employee_data.is_active,
            created_at=datetime.now()
        )
        
        db.add(new_user)
        db.flush()  # Get the user ID
        
        user_id = new_user.id
        
        # Create personal information
        if employee_data.personal_info:
            personal_info_data = employee_data.personal_info.dict()
            personal_info_data['employee_id'] = user_id
            personal_info = EmployeePersonalInfo(**personal_info_data)
            db.add(personal_info)
        
        # Create bank information
        if employee_data.bank_info:
            bank_info_data = employee_data.bank_info.dict()
            bank_info_data['employee_id'] = user_id
            bank_info = EmployeeBank(**bank_info_data)
            db.add(bank_info)
        
        # Create emergency contacts
        for contact_data in employee_data.emergency_contacts:
            contact_dict = contact_data.dict()
            contact_dict['employee_id'] = user_id
            contact = EmployeeEmergencyContact(**contact_dict)
            db.add(contact)
        
        # Create salary information
        if employee_data.salary_info:
            salary_data = employee_data.salary_info.dict()
            salary_data['employee_id'] = user_id
            salary = EmployeeSalary(**salary_data)
            db.add(salary)
        
        # Create system access
        if employee_data.system_access:
            system_access_data = employee_data.system_access.dict()
            system_access_data['employee_id'] = user_id
            system_access = EmployeeSystemAccess(**system_access_data)
            db.add(system_access)
        
        # Create work history
        for work_data in employee_data.work_history:
            work_dict = work_data.dict()
            work_dict['employee_id'] = user_id
            work_history = EmployeeWorkHistory(**work_dict)
            db.add(work_history)
        
        # Create documents
        for doc_data in employee_data.documents:
            doc_dict = doc_data.dict()
            doc_dict['employee_id'] = user_id
            document = EmployeeDocument(**doc_dict)
            db.add(document)
        
        # Add audit fields
        db.query(core_models.User).filter(core_models.User.id == user_id).update({
            'created_by': current_user.id,
            'created_at': datetime.now()
        })
        
        db.commit()
        
        # Return created employee
        return get_employee_by_id(user_id, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create employee: {str(e)}")

@router.get("/", response_model=EmployeeSearchResponse)
def search_employees(
    search: Optional[str] = Query(None, description="Search by name, email, or employee ID"),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    manager_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search and list employees with filtering and pagination"""
    
    query = db.query(core_models.User).filter(core_models.User.role != 'admin')
    
    # Apply filters
    if search:
        search_filter = or_(
            core_models.User.name.contains(search),
            core_models.User.email.contains(search)
            # employee_id field doesn't exist, so removed
        )
        query = query.filter(search_filter)
    
    # department and manager_id fields don't exist, so these filters are removed
    # if department:
    #     query = query.filter(core_models.User.department == department)
    
    # if manager_id:
    #     query = query.filter(core_models.User.manager_id == manager_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    employees = query.offset(offset).limit(limit).all()
    
    # Convert to response format
    employee_list = []
    for emp in employees:
        # Since the User model doesn't have these fields, provide defaults
        employee_list.append(EmployeeListItem(
            id=emp.id,
            name=emp.name,
            email=emp.email,
            employee_id="",  # Default empty since field doesn't exist
            department="",   # Default empty since field doesn't exist
            position="",     # Default empty since field doesn't exist
            status="active" if emp.is_active else "inactive",
            hire_date=None,   # Default None since field doesn't exist
            phone="",        # Default empty since field doesn't exist
            is_active=emp.is_active,
            company="Jandali Trading & Industries"  # Default company name
        ))
    
    return EmployeeSearchResponse(
        employees=employee_list,
        total=total,
        page=page,
        limit=limit,
        has_next=offset + limit < total,
        has_prev=page > 1
    )

@router.get("/{employee_id}", response_model=EmployeeFormResponse)
def get_employee_by_id(employee_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get employee by ID with all related data"""
    
    # Get basic user data
    user = db.query(core_models.User).filter(core_models.User.id == employee_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get related data
    personal_info = db.query(EmployeePersonalInfo).filter(
        EmployeePersonalInfo.employee_id == employee_id
    ).first()
    
    bank_info = db.query(EmployeeBank).filter(
        EmployeeBank.employee_id == employee_id
    ).first()
    
    emergency_contacts = db.query(EmployeeEmergencyContact).filter(
        EmployeeEmergencyContact.employee_id == employee_id
    ).all()
    
    salary_info = db.query(EmployeeSalary).filter(
        and_(EmployeeSalary.employee_id == employee_id, EmployeeSalary.is_current == True)
    ).first()
    
    system_access = db.query(EmployeeSystemAccess).filter(
        EmployeeSystemAccess.employee_id == employee_id
    ).first()
    
    documents = db.query(EmployeeDocument).filter(
        EmployeeDocument.employee_id == employee_id
    ).all()
    
    work_history = db.query(EmployeeWorkHistory).filter(
        EmployeeWorkHistory.employee_id == employee_id
    ).all()
    
    # Get manager name
    manager_name = None
    if user.manager_id:
        manager = db.query(core_models.User).filter(core_models.User.id == user.manager_id).first()
        manager_name = manager.name if manager else None
    
    return EmployeeFormResponse(
        # Basic User Info
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department,
        position=user.position,
        hire_date=user.hire_date,
        employee_id=user.employee_id,
        phone=user.phone,
        address=user.address,
        is_active=user.is_active,
        created_at=user.created_at,
        
        # Personal Information
        personal_info=personal_info,
        
        # Bank Information
        bank_info=bank_info,
        
        # Emergency Contacts
        emergency_contacts=emergency_contacts,
        
        # Salary Information
        salary_info=salary_info,
        
        # System Access
        system_access=system_access,
        
        # Documents
        documents=documents,
        
        # Work History
        work_history=work_history,
        
        # Manager Information
        manager_name=manager_name
    )

@router.put("/{employee_id}", response_model=EmployeeFormResponse)
def update_employee(
    employee_id: uuid.UUID,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Update employee with comprehensive data"""
    
    # Check if employee exists
    user = db.query(core_models.User).filter(core_models.User.id == employee_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        # Update basic user fields
        update_data = employee_data.dict(exclude_unset=True)
        
        # Update user record
        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        # Update personal information
        if employee_data.personal_info:
            personal_info = db.query(EmployeePersonalInfo).filter(
                EmployeePersonalInfo.employee_id == employee_id
            ).first()
            
            if personal_info:
                # Update existing personal info
                for field, value in employee_data.personal_info.dict(exclude_unset=True).items():
                    setattr(personal_info, field, value)
                personal_info.updated_at = datetime.now()
            else:
                # Create new personal info
                personal_data = employee_data.personal_info.dict()
                personal_data['employee_id'] = employee_id
                personal_info = EmployeePersonalInfo(**personal_data)
                db.add(personal_info)
        
        # Update bank information
        if employee_data.bank_info:
            bank_info = db.query(EmployeeBank).filter(
                EmployeeBank.employee_id == employee_id
            ).first()
            
            if bank_info:
                # Update existing bank info
                for field, value in employee_data.bank_info.dict(exclude_unset=True).items():
                    setattr(bank_info, field, value)
                bank_info.updated_at = datetime.now()
            else:
                # Create new bank info
                bank_data = employee_data.bank_info.dict()
                bank_data['employee_id'] = employee_id
                bank_info = EmployeeBank(**bank_data)
                db.add(bank_info)
        
        # Update emergency contacts
        if employee_data.emergency_contacts is not None:
            # Delete existing contacts
            db.query(EmployeeEmergencyContact).filter(
                EmployeeEmergencyContact.employee_id == employee_id
            ).delete()
            
            # Add new contacts
            for contact_data in employee_data.emergency_contacts:
                contact_dict = contact_data.dict()
                contact_dict['employee_id'] = employee_id
                contact = EmployeeEmergencyContact(**contact_dict)
                db.add(contact)
        
        # Update salary information
        if employee_data.salary_info:
            salary_info = db.query(EmployeeSalary).filter(
                and_(EmployeeSalary.employee_id == employee_id, EmployeeSalary.is_current == True)
            ).first()
            
            if salary_info:
                # Update existing salary
                for field, value in employee_data.salary_info.dict(exclude_unset=True).items():
                    setattr(salary_info, field, value)
                salary_info.updated_at = datetime.now()
            else:
                # Create new salary
                salary_data = employee_data.salary_info.dict()
                salary_data['employee_id'] = employee_id
                salary = EmployeeSalary(**salary_data)
                db.add(salary)
        
        # Update system access
        if employee_data.system_access:
            system_access = db.query(EmployeeSystemAccess).filter(
                EmployeeSystemAccess.employee_id == employee_id
            ).first()
            
            if system_access:
                # Update existing system access
                for field, value in employee_data.system_access.dict(exclude_unset=True).items():
                    setattr(system_access, field, value)
                system_access.updated_at = datetime.now()
            else:
                # Create new system access
                system_data = employee_data.system_access.dict()
                system_data['employee_id'] = employee_id
                system_access = EmployeeSystemAccess(**system_data)
                db.add(system_access)
        
        db.commit()
        
        # Return updated employee
        return get_employee_by_id(employee_id, db)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update employee: {str(e)}")

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Delete employee (soft delete by setting is_active to False)"""
    
    user = db.query(core_models.User).filter(core_models.User.id == employee_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Soft delete - set is_active to False
    user.is_active = False
    user.updated_at = datetime.now()
    
    # Also deactivate system access
    system_access = db.query(EmployeeSystemAccess).filter(
        EmployeeSystemAccess.employee_id == employee_id
    ).first()
    
    if system_access:
        system_access.is_active = False
        system_access.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Employee deactivated successfully"}

@router.get("/statistics/overview", response_model=EmployeeStatistics)
def get_employee_statistics(db: Session = Depends(get_db), current_user = Depends(get_current_user_obj)):
    """Get employee statistics overview"""
    
    # Basic counts
    total_employees = db.query(core_models.User).filter(core_models.User.role != 'admin').count()
    active_employees = db.query(core_models.User).filter(
        and_(core_models.User.role != 'admin', core_models.User.is_active == True)
    ).count()
    inactive_employees = total_employees - active_employees
    
    # New hires this month
    this_month = date.today().replace(day=1)
    new_hires_this_month = db.query(core_models.User).filter(
        and_(
            core_models.User.role != 'admin',
            core_models.User.hire_date >= this_month,
            core_models.User.hire_date <= date.today()
        )
    ).count()
    
    # Department breakdown
    departments = db.query(core_models.User.department, func.count(core_models.User.id)).filter(
        core_models.User.role != 'admin'
    ).group_by(core_models.User.department).all()
    
    by_department = {dept or 'Unassigned': count for dept, count in departments}
    
    # Status breakdown (simplified - using is_active)
    by_status = {
        'active': active_employees,
        'inactive': inactive_employees
    }
    
    # Employment type breakdown (from salary records if available)
    by_employment_type = {
        'full_time': 0,  # Would need to be calculated from employment data
        'part_time': 0,
        'contract': 0
    }
    
    # Salary statistics (if salary data exists)
    avg_salary_result = db.query(func.avg(EmployeeSalary.basic_salary)).filter(
        EmployeeSalary.is_current == True
    ).first()
    
    total_payroll_result = db.query(func.sum(EmployeeSalary.basic_salary)).filter(
        EmployeeSalary.is_current == True
    ).first()
    
    return EmployeeStatistics(
        total_employees=total_employees,
        active_employees=active_employees,
        inactive_employees=inactive_employees,
        probation_employees=0,  # Would need to be calculated from status
        new_hires_this_month=new_hires_this_month,
        resigned_this_month=0,  # Would need to be calculated from status changes
        by_department=by_department,
        by_status=by_status,
        by_employment_type=by_employment_type,
        average_salary=float(avg_salary_result[0]) if avg_salary_result[0] else None,
        total_payroll=float(total_payroll_result[0]) if total_payroll_result[0] else None
    )

# --- Document Upload ---

@router.post("/documents/upload", response_model=EmployeeDocumentUploadResponse)
async def upload_employee_document(
    employee_id: uuid.UUID,
    document_type: str,
    document_name: str,
    file_content: str,  # base64 encoded
    file_name: str,
    mime_type: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Upload employee document"""
    
    # Check if employee exists
    user = db.query(core_models.User).filter(core_models.User.id == employee_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        # Save file
        file_path = save_uploaded_file(file_content, file_name, user.employee_id or str(user.id))
        
        # Calculate file size
        file_size = len(base64.b64decode(file_content))
        
        # Create document record
        document = EmployeeDocument(
            employee_id=employee_id,
            document_type=document_type,
            document_name=document_name,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            created_at=datetime.now()
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return EmployeeDocumentUploadResponse(
            id=document.id,
            document_name=document.document_name,
            document_type=document.document_type,
            file_path=document.file_path,
            file_size=document.file_size,
            mime_type=document.mime_type,
            created_at=document.created_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

# --- Bulk Operations ---

@router.post("/bulk/deactivate")
def bulk_deactivate_employees(
    employee_ids: List[uuid.UUID],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Bulk deactivate employees"""
    
    updated_count = db.query(core_models.User).filter(
        core_models.User.id.in_(employee_ids)
    ).update({
        'is_active': False,
        'updated_at': datetime.now()
    }, synchronize_session=False)
    
    db.commit()
    
    return {"message": f"Deactivated {updated_count} employees"}

@router.post("/bulk/activate")
def bulk_activate_employees(
    employee_ids: List[uuid.UUID],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Bulk activate employees"""
    
    updated_count = db.query(core_models.User).filter(
        core_models.User.id.in_(employee_ids)
    ).update({
        'is_active': True,
        'updated_at': datetime.now()
    }, synchronize_session=False)
    
    db.commit()
    
    return {"message": f"Activated {updated_count} employees"}

# --- Export/Import ---

@router.get("/export")
def export_employees(
    format: str = Query("csv", regex="^(csv|excel)$"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Export employees data"""
    
    # This would implement the export functionality
    # For now, return a placeholder
    return {
        "message": "Export functionality not yet implemented",
        "format": format
    }

@router.post("/import")
async def import_employees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    """Import employees from Excel/CSV file"""
    
    # This would implement the import functionality
    # For now, return a placeholder
    return {
        "message": "Import functionality not yet implemented"
    }