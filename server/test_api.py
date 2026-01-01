"""
API Integration Tests
Tests for API endpoints, health checks, and general functionality
"""
import pytest


@pytest.mark.integration
class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns OK status"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data
    
    def test_health_check(self, client):
        """Test comprehensive health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        assert "version" in data
        assert "environment" in data
        assert "timestamp" in data
    
    def test_health_live(self, client):
        """Test liveness probe (Kubernetes)"""
        response = client.get("/health/live")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "alive"
        assert "timestamp" in data
    
    def test_health_ready(self, client):
        """Test readiness probe (Kubernetes)"""
        response = client.get("/health/ready")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ready"
        assert "timestamp" in data


@pytest.mark.integration
class TestAuthenticationFlow:
    """Test authentication and authorization"""
    
    def test_login_required_for_protected_endpoints(self, client):
        """Test that protected endpoints require authentication"""
        endpoints = [
            "/api/users/",
            "/api/hr/employees",
            "/api/finance/contracts",
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [401, 403], f"Endpoint {endpoint} should require auth"
    
    def test_valid_token_grants_access(self, client, auth_headers):
        """Test that valid token grants access to protected endpoints"""
        response = client.get("/api/users/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_invalid_token_denies_access(self, client):
        """Test that invalid token denies access"""
        headers = {"Authorization": "Bearer invalid_token_123"}
        response = client.get("/api/users/", headers=headers)
        assert response.status_code == 401
    
    def test_missing_token_denies_access(self, client):
        """Test that missing token denies access"""
        response = client.get("/api/users/")
        assert response.status_code == 403


@pytest.mark.integration
class TestCORS:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in responses"""
        response = client.options("/", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        
        # CORS should be configured
        assert response.status_code in [200, 204]


@pytest.mark.integration
class TestErrorHandling:
    """Test error handling"""
    
    def test_404_for_nonexistent_endpoint(self, client):
        """Test 404 for non-existent endpoints"""
        response = client.get("/api/nonexistent/endpoint")
        assert response.status_code == 404
    
    def test_405_for_wrong_method(self, client):
        """Test 405 for wrong HTTP method"""
        # Health endpoint only supports GET
        response = client.post("/health")
        assert response.status_code == 405
    
    def test_422_for_invalid_json(self, client):
        """Test 422 for invalid JSON in request body"""
        response = client.post("/api/auth/login", 
                              data="invalid json",
                              headers={"Content-Type": "application/json"})
        assert response.status_code == 422


@pytest.mark.integration
@pytest.mark.slow
class TestUserManagement:
    """Test user management endpoints"""
    
    def test_list_users(self, client, auth_headers):
        """Test listing users"""
        response = client.get("/api/users/", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user info"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data


@pytest.mark.integration
@pytest.mark.database
class TestDatabaseOperations:
    """Test database operations"""
    
    def test_create_and_retrieve_user(self, db_session):
        """Test creating and retrieving a user from database"""
        from models.core_models import User
        from core.auth import get_password_hash
        
        # Create user
        user = User(
            name="Database Test User",
            email="dbtest@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # Retrieve user
        retrieved = db_session.query(User).filter(
            User.email == "dbtest@example.com"
        ).first()
        
        assert retrieved is not None
        assert retrieved.name == "Database Test User"
        assert retrieved.email == "dbtest@example.com"
        assert retrieved.role == "user"
        assert retrieved.is_active is True
    
    def test_database_rollback_on_error(self, db_session):
        """Test that database rolls back on error"""
        from models.core_models import User
        from core.auth import get_password_hash
        
        # Create user
        user1 = User(
            name="Test User 1",
            email="rollback@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=True
        )
        db_session.add(user1)
        db_session.commit()
        
        # Try to create duplicate (should fail)
        try:
            user2 = User(
                name="Test User 2",
                email="rollback@example.com",  # Duplicate email
                password=get_password_hash("Password123!"),
                role="user",
                is_active=True
            )
            db_session.add(user2)
            db_session.commit()
        except:
            db_session.rollback()
        
        # Should only have one user
        count = db_session.query(User).filter(
            User.email == "rollback@example.com"
        ).count()
        assert count == 1


@pytest.mark.integration
@pytest.mark.slow
class TestPerformance:
    """Test performance characteristics"""
    
    def test_health_endpoint_fast(self, client):
        """Test that health endpoint responds quickly"""
        import time
        
        start = time.time()
        response = client.get("/health/live")
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 1.0, "Health check should respond in under 1 second"
    
    def test_login_performance(self, client, db_session):
        """Test login performance"""
        from models.core_models import User
        from core.auth import get_password_hash
        import time
        
        # Create test user
        user = User(
            name="Perf Test",
            email="perf@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Test login performance
        start = time.time()
        response = client.post("/api/auth/login", json={
            "email": "perf@example.com",
            "password": "Password123!"
        })
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 2.0, "Login should complete in under 2 seconds"
