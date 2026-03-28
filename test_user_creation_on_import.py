"""
Test script to verify user creation during employee import
"""
import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.core_models import User, Base
from services.import_service import EmployeeImportService
import uuid

# Create in-memory SQLite database for testing
engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
db = Session()

def test_user_creation_with_employee_code():
    """Test that users are created with employee code as username and password"""
    print("Testing user creation with employee code...")
    
    # Create import service
    service = EmployeeImportService(db)
    
    # Create test employee data
    test_data = [
        ['EMP001', 'John Doe', 'john@example.com', 'IT', 'Developer'],
        ['EMP002', 'Jane Smith', 'jane@example.com', 'HR', 'Manager'],
    ]
    
    # Column mappings
    mappings = {
        'code': 0,
        'first_name': 1,
        'work_email': 2,
        'department': 3,
        'position': 4
    }
    
    # Import options
    options = {
        'mappings': mappings,
        'skipDuplicates': False,
        'updateExisting': False,
        'createUsers': True,
        'useEmployeeCodeAsPassword': True,
        'forcePasswordChange': True,
        'autoCreateDepartments': True
    }
    
    # Execute import
    result = service.execute_import(test_data, options, uuid.uuid4())
    
    print(f"Import result: {result}")
    
    # Verify users were created
    users = db.query(User).all()
    print(f"Users created: {len(users)}")
    
    for user in users:
        print(f"  - User: {user.name}, Email: {user.email}, Force Password Change: {user.force_password_change}")
        # Verify username is employee code (not email format)
        assert '@' not in user.email, f"Username should be employee code, not email format: {user.email}"
        # Verify force_password_change is True
        assert user.force_password_change == True, f"force_password_change should be True"
    
    print("✓ Test passed: Users created with employee code as username")
    return True

def test_user_creation_without_email():
    """Test that users are created even without email"""
    print("\nTesting user creation without email...")
    
    # Clear database
    db.query(User).delete()
    db.commit()
    
    # Create import service
    service = EmployeeImportService(db)
    
    # Create test employee data without email
    test_data = [
        ['EMP003', 'Bob Wilson', None, 'Finance', 'Accountant'],
    ]
    
    # Column mappings (without email)
    mappings = {
        'code': 0,
        'first_name': 1,
        'department': 3,
        'position': 4
    }
    
    # Import options
    options = {
        'mappings': mappings,
        'skipDuplicates': False,
        'updateExisting': False,
        'createUsers': True,
        'useEmployeeCodeAsPassword': True,
        'forcePasswordChange': True,
        'autoCreateDepartments': True
    }
    
    # Execute import
    result = service.execute_import(test_data, options, uuid.uuid4())
    
    print(f"Import result: {result}")
    
    # Verify user was created
    users = db.query(User).all()
    print(f"Users created: {len(users)}")
    
    assert len(users) == 1, f"Expected 1 user, got {len(users)}"
    user = users[0]
    print(f"  - User: {user.name}, Email: {user.email}, Force Password Change: {user.force_password_change}")
    
    # Verify username is employee code
    assert user.email == 'EMP003', f"Username should be EMP003, got {user.email}"
    # Verify force_password_change is True
    assert user.force_password_change == True, f"force_password_change should be True"
    
    print("✓ Test passed: User created without email")
    return True

def test_force_password_change_option():
    """Test force_password_change option"""
    print("\nTesting force_password_change option...")
    
    # Clear database
    db.query(User).delete()
    db.commit()
    
    # Create import service
    service = EmployeeImportService(db)
    
    # Create test employee data
    test_data = [
        ['EMP004', 'Alice Brown', 'alice@example.com', 'Marketing', 'Specialist'],
    ]
    
    # Column mappings
    mappings = {
        'code': 0,
        'first_name': 1,
        'work_email': 2,
        'department': 3,
        'position': 4
    }
    
    # Import options with force_password_change = False
    options = {
        'mappings': mappings,
        'skipDuplicates': False,
        'updateExisting': False,
        'createUsers': True,
        'useEmployeeCodeAsPassword': True,
        'forcePasswordChange': False,  # Disable force password change
        'autoCreateDepartments': True
    }
    
    # Execute import
    result = service.execute_import(test_data, options, uuid.uuid4())
    
    print(f"Import result: {result}")
    
    # Verify user was created
    users = db.query(User).all()
    print(f"Users created: {len(users)}")
    
    assert len(users) == 1, f"Expected 1 user, got {len(users)}"
    user = users[0]
    print(f"  - User: {user.name}, Email: {user.email}, Force Password Change: {user.force_password_change}")
    
    # Verify force_password_change is False
    assert user.force_password_change == False, f"force_password_change should be False"
    
    print("✓ Test passed: force_password_change option works correctly")
    return True

if __name__ == '__main__':
    try:
        test_user_creation_with_employee_code()
        test_user_creation_without_email()
        test_force_password_change_option()
        print("\n" + "="*50)
        print("All tests passed! ✓")
        print("="*50)
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
