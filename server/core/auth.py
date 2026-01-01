from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from core.database import get_db
from models.core_models import User
from crud import rbac_crud
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import jwt
import bcrypt
import logging

logger = logging.getLogger(__name__)

# إعدادات التوكن
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")
if len(SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY must be at least 32 characters long")

# Security: Warn if using weak or default secret keys
WEAK_KEYS = ["secret", "changeme", "default", "dev-secret", "test-secret", "your-secret-key"]
if any(weak in SECRET_KEY.lower() for weak in WEAK_KEYS):
    if os.environ.get("ENVIRONMENT") == "production":
        raise ValueError("⚠️ CRITICAL: Weak SECRET_KEY detected in production! Use a strong random key.")
    logger.warning("⚠️ WARNING: Weak SECRET_KEY detected. Change this for production!")

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours default

# Maximum password length (bcrypt limitation)
MAX_PASSWORD_LENGTH = 72

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة المرور"""
    try:
        # Truncate password to bcrypt limit (72 bytes)
        pwd_bytes = plain_password.encode('utf-8')[:MAX_PASSWORD_LENGTH]
        hash_bytes = hashed_password.encode('utf-8')
        
        result = bcrypt.checkpw(pwd_bytes, hash_bytes)
        
        # Log failed attempts for security monitoring
        if not result:
            logger.warning("Password verification failed")
        
        return result
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """تشفير كلمة المرور"""
    try:
        # Validate minimum password length
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Truncate to bcrypt limit
        pwd_bytes = password.encode('utf-8')[:MAX_PASSWORD_LENGTH]
        
        # Use higher cost factor for production (more secure but slower)
        cost_factor = 12 if os.environ.get("ENVIRONMENT") == "production" else 10
        salt = bcrypt.gensalt(rounds=cost_factor)
        
        hashed = bcrypt.hashpw(pwd_bytes, salt)
        return hashed.decode('utf-8')
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Password hashing failed")
        raise HTTPException(status_code=500, detail="Password hashing failed")

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate user with improved security logging"""
    try:
        logger.info(f"Authentication attempt for: {email}")
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logger.warning(f"User not found: {email}")
            # Security: Don't reveal whether user exists or not
            return None
        
        if not user.is_active:
            logger.warning(f"Inactive user login attempt: {email}")
            return None
        
        if not verify_password(password, user.password):
            logger.warning(f"Invalid password for: {email}")
            return None
        
        logger.info(f"Successful authentication for: {email}")
        return user
        
    except Exception as e:
        logger.exception(f"Authentication error for {email}")
        return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token with proper expiration and metadata"""
    try:
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),  # Issued at timestamp
            "type": "access"  # Token type for validation
        })
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        logger.debug("Access token created successfully")
        
        return encoded_jwt
    except Exception as e:
        logger.exception("Token creation failed")
        raise HTTPException(status_code=500, detail="Token creation failed")

def get_user_from_raw_token(token: str, db: Session) -> User:
    """Helper to get user from a raw JWT token string"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token credentials")
        
        import uuid
        try:
             user_uuid = uuid.UUID(user_id_str)
        except ValueError:
             raise HTTPException(status_code=401, detail="Invalid token subject")

        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

def _get_user_from_token(credentials: HTTPAuthorizationCredentials, db: Session) -> User:
    """Internal helper to get user from JWT token - reduces code duplication"""
    try:
        token = credentials.credentials
        
        # Decode and validate token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")
        
        # Validate token type
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        # Security: Validate UUID format
        import uuid
        try:
             user_uuid = uuid.UUID(user_id_str)
        except ValueError:
             raise HTTPException(status_code=401, detail="Invalid token: invalid user ID")

        user = db.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive")
        
        return user
        
    except jwt.ExpiredSignatureError:
        logger.warning("Expired token used")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        logger.warning("Invalid token used")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Authentication error")
        raise HTTPException(status_code=401, detail="Authentication failed")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get current user object from token"""
    return _get_user_from_token(credentials, db)

import logging
logger = logging.getLogger(__name__)

def require_permission(permission_name: str):
    """
    Dependency to check if the current user has the required permission.
    """
    def check_permission(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        logger.debug(f"Permission check: {permission_name} for user {current_user.email}, role: {current_user.role}")
        
        if not current_user.is_active:
             logger.warning(f"Inactive user access attempt: {current_user.email}")
             raise HTTPException(status_code=400, detail="Inactive user")

        # Admin bypass
        if current_user.role == "admin": 
            logger.debug(f"Admin bypass granted for {current_user.email}")
            return current_user 

        # Check permission via RBAC Logic
        has_perm, msg = rbac_crud.check_user_permission(db, current_user.id, permission_name)
        
        if not has_perm:
            logger.warning(f"Permission denied: {permission_name} for {current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required: {permission_name}"
            )
        
        logger.debug(f"Permission granted: {permission_name} for {current_user.email}")
        return current_user

    return check_permission