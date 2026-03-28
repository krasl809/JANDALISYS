"""
Excel Import Service
Import employee data from Excel files with hierarchical structure
"""
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Dict, List, Optional, Tuple
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ExcelImportService:
    """Service for importing employee data from Excel files"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def import_employees(self, file_path: str, imported_by: uuid.UUID) -> Dict:
        """
        Import employee data from Excel file
        
        Args:
            file_path: Path to Excel file
            imported_by: User ID who initiated the import
            
        Returns:
            dict: Import summary
        """
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            
            # Validate required columns
            validation_result = self._validate_columns(df)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Clean and prepare data
            df = self._clean_data(df)
            
            # Import data
            import_result = self._import_data(df, imported_by)
            
            return import_result
            
        except Exception as e:
            logger.error(f"Error importing Excel file: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_columns(self, df: pd.DataFrame) -> Dict:
        """Validate required columns in Excel file"""
        
        required_columns = [
            'الرقم الوظيفي',
            'الاسم',
            'تاريخ المباشرة',
            'رصيد الإجازات أول السنة',
            'رصيد الإجازات المتبقي',
            'المنشأة',
            'المسمى الوظيفي',
            'القسم المركزي',
            'المسؤول المباشر',
            'مدير المنشأة',
            'مدير الموارد البشرية'
        ]
        
        # Check for missing columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return {
                'valid': False,
                'error': f'أعمدة مفقودة: {", ".join(missing_columns)}'
            }
        
        return {'valid': True}
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and prepare data for import"""
        
        # Remove rows with all NaN values
        df = df.dropna(how='all')
        
        # Fill NaN values with appropriate defaults
        df['الرقم الوظيفي'] = df['الرقم الوظيفي'].astype(str).str.strip()
        df['الاسم'] = df['الاسم'].astype(str).str.strip()
        df['المنشأة'] = df['المنشأة'].astype(str).str.strip()
        df['المسمى الوظيفي'] = df['المسمى الوظيفي'].astype(str).str.strip()
        df['القسم المركزي'] = df['القسم المركزي'].astype(str).str.strip()
        
        # Convert date columns
        df['تاريخ المباشرة'] = pd.to_datetime(df['تاريخ المباشرة'], errors='coerce')
        
        # Convert numeric columns
        df['رصيد الإجازات أول السنة'] = pd.to_numeric(
            df['رصيد الإجازات أول السنة'], errors='coerce'
        ).fillna(0)
        df['رصيد الإجازات المتبقي'] = pd.to_numeric(
            df['رصيد الإجازات المتبقي'], errors='coerce'
        ).fillna(0)
        
        return df
    
    def _import_data(self, df: pd.DataFrame, imported_by: uuid.UUID) -> Dict:
        """Import data from DataFrame"""
        
        from models.employee_models import Employee
        from models.hierarchical_approval_models import Facility, Department
        
        imported_count = 0
        updated_count = 0
        errors = []
        warnings = []
        
        for index, row in df.iterrows():
            try:
                employee_code = str(row['الرقم الوظيفي']).strip()
                
                # Check if employee already exists
                existing_employee = self.db.query(Employee).filter(
                    Employee.code == employee_code
                ).first()
                
                if existing_employee:
                    # Update existing employee
                    employee = self._update_employee(existing_employee, row)
                    updated_count += 1
                    logger.info(f"Updated employee: {employee_code}")
                else:
                    # Create new employee
                    employee = self._create_employee(row, imported_by)
                    imported_count += 1
                    logger.info(f"Created employee: {employee_code}")
                
                self.db.flush()
                
            except Exception as e:
                error_msg = f"صف {index + 2}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
                self.db.rollback()
        
        # Commit all changes
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            return {
                'success': False,
                'error': f'خطأ في حفظ البيانات: {str(e)}',
                'imported_count': 0,
                'updated_count': 0,
                'errors': errors
            }
        
        return {
            'success': True,
            'imported_count': imported_count,
            'updated_count': updated_count,
            'total_rows': len(df),
            'errors': errors,
            'warnings': warnings
        }
    
    def _create_employee(self, row, imported_by: uuid.UUID):
        """Create new employee from Excel row"""
        
        from models.employee_models import Employee
        from core.auth import get_password_hash
        
        # Get or create facility
        facility = self._get_or_create_facility(row['المنشأة'])
        
        # Get or create department
        department = self._get_or_create_department(
            row['القسم المركزي'],
            facility.id
        )
        
        # Find responsible employees
        direct_supervisor = self._find_employee_by_name(row.get('المسؤول المباشر'))
        department_manager = self._find_employee_by_name(row.get('مدير القسم'))
        facility_manager = self._find_employee_by_name(row.get('مدير المنشأة'))
        hr_manager = self._find_employee_by_name(row.get('مدير الموارد البشرية'))
        executive_manager = self._find_employee_by_name(row.get('المدير التنفيذي'))
        
        # Determine if General Administration
        is_general_admin = self._is_general_admin_department(row['القسم المركزي'])
        
        # Create employee
        employee = Employee(
            id=uuid.uuid4(),
            code=row['الرقم الوظيفي'],
            first_name=row['الاسم'].split()[0] if row['الاسم'] else '',
            last_name=' '.join(row['الاسم'].split()[1:]) if len(row['الاسم'].split()) > 1 else '',
            full_name=row['الاسم'],
            work_email=f"{row['الرقم الوظيفي']}@company.com",
            department_name=row['القسم المركزي'],
            company=row['المنشأة'],
            position=row['المسمى الوظيفي'],
            joining_date=row['تاريخハー'].date() if pd.notna(row['تاريخᕕ']) else None,
            status='active',
            employment_type='full_time'
        )
        
        self.db.add(employee)
        self.db.flush()
        
        # Create user account for employee
        from models.core_models import User
        user = User(
            id=uuid.uuid4(),
            name=row['الاسم'],
            email=f"{row['الرقم الوظيفي']}@company.com",
            password=get_password_hash("123456"),  # Default password
            role='employee',
            is_active=True
        )
        
        self.db.add(user)
        self.db.flush()
        
        # Link employee to user
        employee.user_id = user.id
        
        return employee
    
    def _update_employee(self, employee, row):
        """Update existing employee from Excel row"""
        
        # Get or create facility
        facility = self._get_or_create_facility(row['المنشأة'])
        
        # Get or create department
        department = self._get_or_create_department(
            row['القسم المركزي'],
            facility.id
        )
        
        # Find responsible employees
        direct_supervisor = self._find_employee_by_name(row.get('المسؤول المباشر'))
        department_manager = self._find_employee_by_name(row.get('مدير القسم'))
        facility_manager = self._find_employee_by_name(row.get('مدير المنشأة'))
        hr_manager = self._find_employee_by_name(row.get('مدير الموارد البشرية'))
        executive_manager = self._find_employee_by_name(row.get('المدير التنفيذي'))
        
        # Determine if General Administration
        is_general_admin = self._is_general_admin_department(row['القسم المركزي'])
        
        # Update employee fields
        employee.full_name = row['الاسم']
        employee.first_name = row['الاسم'].split()[0] if row['الاسم'] else employee.first_name
        employee.last_name = ' '.join(row['الاسم'].split()[1:]) if len(row['الاسم'].split()) > 1 else employee.last_name
        employee.department_name = row['القسم المركزي']
        employee.company = row['المنشأة']
        employee.position = row['المسمى الوظيفي']
        
        if pd.notna(row['تاريخᕕ']):
            employee.joining_date = row['تاريخᕕ'].date()
        
        return employee
    
    def _get_or_create_facility(self, facility_name: str):
        """Get or create facility"""
        
        from models.hierarchical_approval_models import Facility
        
        facility = self.db.query(Facility).filter(
            Facility.name == facility_name
        ).first()
        
        if not facility:
            facility = Facility(
                id=uuid.uuid4(),
                name=facility_name,
                name_ar=facility_name,
                code=facility_name[:10].upper().replace(' ', '_'),
                is_active=True
            )
            self.db.add(facility)
            self.db.flush()
        
        return facility
    
    def _get_or_create_department(self, dept_name: str, facility_id: uuid.UUID):
        """Get or create department"""
        
        from models.hierarchical_approval_models import Department
        
        department = self.db.query(Department).filter(
            and_(
                Department.name == dept_name,
                Department.facility_id == facility_id
            )
        ).first()
        
        if not department:
            department = Department(
                id=uuid.uuid4(),
                name=dept_name,
                name_ar=dept_name,
                code=dept_name[:10].upper().replace(' ', '_'),
                facility_id=facility_id,
                is_active=True
            )
            self.db.add(department)
            self.db.flush()
        
        return department
    
    def _find_employee_by_name(self, name: str):
        """Find employee by name"""
        
        from models.employee_models import Employee
        
        if pd.isna(name) or not name or str(name).strip() == '':
            return None
        
        name = str(name).strip()
        
        # Try exact match first
        employee = self.db.query(Employee).filter(
            Employee.full_name == name
        ).first()
        
        if employee:
            return employee
        
        # Try partial match
        employee = self.db.query(Employee).filter(
            Employee.full_name.ilike(f'%{name}%')
        ).first()
        
        return employee
    
    def _is_general_admin_department(self, dept_name: str) -> bool:
        """Check if department is General Administration"""
        
        general_admin_keywords = [
            'الإدارة العامة',
            'المدير التنفيذي',
            'الرئيس التنفيذي',
            'الإدارة العليا',
            'الرئاسة',
            'الإدارة المركزية'
        ]
        
        dept_name_lower = str(dept_name).lower()
        
        return any(keyword.lower() in dept_name_lower for keyword in general_admin_keywords)
    
    def get_import_template(self) -> Dict:
        """Get Excel template structure for import"""
        
        template = {
            'columns': [
                {'name': 'الرقم الوظيفي', 'type': 'string', 'required': True},
                {'name': 'الاسم', 'type': 'string', 'required': True},
                {'name': 'تاريخᕕ', 'type': 'date', 'required': True},
                {'name': 'رصيد الإجازات أول السنة', 'type': 'number', 'required': True},
                {'name': 'رصيد الإجازات المتبقي', 'type': 'number', 'required': True},
                {'name': 'المنشأة', 'type': 'string', 'required': True},
                {'name': 'المسمى الوظيفي', 'type': 'string', 'required': True},
                {'name': 'القسم المركزي', 'type': 'string', 'required': True},
                {'name': 'المسؤول المباشر', 'type': 'string', 'required': False},
                {'name': 'مدير القسم', 'type': 'string', 'required': False},
                {'name': 'مدير المنشأة', 'type': 'string', 'required': True},
                {'name': 'مدير الموارد البشرية', 'type': 'string', 'required': True},
                {'name': 'المدير التنفيذي', 'type': 'string', 'required': False}
            ],
            'sample_data': [
                {
                    'الرقم الوظيفي': 'EMP001',
                    'الاسم': 'أحمد محمد علي',
                    'تاريخᕕ': '2024-01-15',
                    'رصيد الإجازات أول السنة': 21,
                    'رصيد الإجازات المتبقي': 15,
                    'المنشأة': 'المنشأة الرئيسية',
                    'المسمى الوظيفي': 'مهندس برمجيات',
                    'القسم المركزي': 'قسم تقنية المعلومات',
                    'المسؤول المباشر': 'محمد أحمد',
                    'مدير القسم': 'علي محمد',
                    'مدير المنشأة': 'خالد علي',
                    'مدير الموارد البشرية': 'سعد محمد',
                    'المدير التنفيذي': ''
                }
            ]
        }
        
        return template
