"""
Unit and Integration Tests for Authentication Module
Tests password hashing, JWT tokens, and user authentication flows
"""
import pytest
from datetime import datetime, timedelta, timezone
from core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
)


@pytest.mark.unit
@pytest.mark.auth
class TestPasswordHashing:
    """Test password hashing functions"""
    
    def test_password_hashing(self):
        """Test that password hashing works correctly"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        # Hash should be different from password
        assert hashed != password
        assert len(hashed) > 0
        
        # Hash should verify correctly
        assert verify_password(password, hashed) is True
        
        # Wrong password should not verify
        assert verify_password("WrongPassword", hashed) is False
    
    def test_password_minimum_length(self):
        """Test that short passwords are rejected"""
        with pytest.raises(Exception) as exc_info:
            get_password_hash("short")
        
        assert "8 characters" in str(exc_info.value) or "Password" in str(exc_info.value)
    
    def test_password_truncation(self):
        """Test that very long passwords are handled correctly (bcrypt 72 byte limit)"""
        very_long_password = "a" * 100
        hashed = get_password_hash(very_long_password)
        
        # Should still verify
        assert verify_password(very_long_password, hashed) is True
    
    def test_different_passwords_different_hashes(self):
        """Test that same password produces different hashes (due to salt)"""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different due to random salt
        assert hash1 != hash2
        
        # But both should verify
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True
    
    def test_empty_password_fails(self):
        """Test that empty password is rejected"""
        with pytest.raises(Exception):
            get_password_hash("")
    
    def test_unicode_password(self):
        """Test that unicode passwords work"""
        password = "كلمة_سر_عربية123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True


@pytest.mark.unit
@pytest.mark.auth
class TestJWTTokens:
    """Test JWT token creation and validation"""
    
    def test_token_creation(self):
        """Test that JWT tokens are created correctly"""
        data = {"sub": "test-user-id"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Token should have 3 parts (header.payload.signature)
        assert token.count('.') == 2
    
    def test_token_with_expiration(self):
        """Test token creation with custom expiration"""
        data = {"sub": "test-user-id"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta=expires_delta)
        
        assert token is not None
        assert isinstance(token, str)
    
    def test_token_contains_required_fields(self):
        """Test that token contains required fields"""
        import jwt
        import os
        
        data = {"sub": "test-user-id", "email": "test@example.com"}
        token = create_access_token(data)
        
        # Decode without verification for testing
        decoded = jwt.decode(
            token,
            os.getenv("SECRET_KEY", "test-secret-key-for-testing-only-32-chars"),
            algorithms=["HS256"]
        )
        
        # Check required fields
        assert "sub" in decoded
        assert decoded["sub"] == "test-user-id"
        assert "exp" in decoded  # Expiration
        assert "iat" in decoded  # Issued at
        assert "type" in decoded  # Token type
        assert decoded["type"] == "access"


@pytest.mark.integration
@pytest.mark.auth
class TestAuthentication:
    """Test complete authentication flow"""
    
    def test_successful_login(self, client, db_session):
        """Test successful user login"""
        from models.core_models import User
        
        # Create test user
        user = User(
            name="Test User",
            email="test@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Attempt login
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == "test@example.com"
    
    def test_login_wrong_password(self, client, db_session):
        """Test login with wrong password"""
        from models.core_models import User
        
        # Create test user
        user = User(
            name="Test User",
            email="test@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Attempt login with wrong password
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPassword"
        })
        
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user"""
        from models.core_models import User
        
        # Create inactive user
        user = User(
            name="Inactive User",
            email="inactive@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=False
        )
        db_session.add(user)
        db_session.commit()
        
        # Attempt login
        response = client.post("/api/auth/login", json={
            "email": "inactive@example.com",
            "password": "Password123!"
        })
        
        assert response.status_code == 401
    
    def test_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without token"""
        response = client.get("/api/users/")
        
        assert response.status_code == 403
    
    def test_protected_endpoint_with_valid_token(self, client, auth_headers):
        """Test accessing protected endpoint with valid token"""
        response = client.get("/api/users/", headers=auth_headers)
        
        assert response.status_code == 200
    
    def test_protected_endpoint_with_invalid_token(self, client):
        """Test accessing protected endpoint with invalid token"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/users/", headers=headers)
        
        assert response.status_code == 401
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user information"""
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data


@pytest.mark.integration
@pytest.mark.auth
class TestPasswordSecurity:
    """Test password security features"""
    
    def test_password_not_returned_in_response(self, client, db_session):
        """Test that password hash is never returned in API responses"""
        from models.core_models import User
        
        user = User(
            name="Test User",
            email="security@example.com",
            password=get_password_hash("Password123!"),
            role="user",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Login
        response = client.post("/api/auth/login", json={
            "email": "security@example.com",
            "password": "Password123!"
        })
        
        data = response.json()
        
        # Password should not be in response
        assert "password" not in data
        assert "password_hash" not in data
    
    def test_user_enumeration_protection(self, client):
        """Test that error messages don't reveal if user exists"""
        # Login with non-existent user
        response1 = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "Password123!"
        })
        
        # Should not reveal that user doesn't exist
        assert response1.status_code == 401
        # Message should be generic
        assert "Invalid" in response1.json()["detail"] or "Unauthorized" in response1.json()["detail"]
