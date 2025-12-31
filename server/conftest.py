"""
Pytest Configuration and Fixtures
Provides test database and client fixtures
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Base, get_db
from main import app

# Test database URL
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_cashflow.db")

# Create test engine
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
)

# Create test session maker
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """
    Create a fresh database session for each test
    Automatically rolls back after test completion
    """
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    
    # Create session
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Create a test client with overridden database dependency
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    with TestClient(app) as test_client:
        yield test_client
    
    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin_token(client, db_session):
    """
    Create an admin user and return authentication token
    """
    from models.core_models import User
    from core.auth import get_password_hash
    
    # Create admin user
    admin = User(
        name="Test Admin",
        email="test_admin@example.com",
        password=get_password_hash("TestPassword123!"),
        role="admin",
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    
    # Login to get token
    response = client.post("/api/auth/login", json={
        "email": "test_admin@example.com",
        "password": "TestPassword123!"
    })
    
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    return token


@pytest.fixture(scope="function")
def auth_headers(admin_token):
    """
    Return authorization headers with admin token
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def sample_employee(db_session):
    """
    Create a sample employee for testing
    """
    from models.employee_models import Employee
    
    employee = Employee(
        code="EMP001",
        name="Test Employee",
        status="active",
        email="employee@example.com"
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)
    
    return employee


@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """
    Setup test environment variables
    Runs once at the beginning of test session
    """
    os.environ["ENVIRONMENT"] = "testing"
    os.environ["DEBUG"] = "false"
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only-32-chars"
    
    yield
    
    # Cleanup
    try:
        os.remove("test_cashflow.db")
    except:
        pass
