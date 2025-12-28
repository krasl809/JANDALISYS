from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from core.database import get_db
from models.core_models import User
from crud import rbac_crud
from datetime import datetime, timedelta
from typing import Optional
import os
import jwt
import bcrypt

# إعدادات التوكن
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")
if len(SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY must be at least 32 characters long")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة المرور"""
    try:
        print("DEBUG: verify_password called", flush=True)
        return bcrypt.checkpw(
            plain_password.encode('utf-8')[:72],
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        return False

def get_password_hash(password: str) -> str:
    """تشفير كلمة المرور"""
    try:
        pwd_bytes = password.encode('utf-8')[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pwd_bytes, salt)
        return hashed.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail="Password hashing failed")

def authenticate_user(db: Session, email: str, password: str):
    try:
        print(f"DEBUG: authenticate_user called for email: {email}", flush=True)
        user = db.query(User).filter(User.email == email).first()
        print(f"DEBUG: User found: {user is not None}", flush=True)
        if user:
            print(f"DEBUG: User email: {user.email}, password hash starts with: {user.password[:20]}...", flush=True)
        if not user:
            print(f"DEBUG: User not found for email: {email}", flush=True)
            return None
        if not verify_password(password, user.password):
            print(f"DEBUG: Password verification failed for {email}", flush=True)
            return None
        print(f"DEBUG: Authentication successful for {email}", flush=True)
        return user
    except Exception as e:
        print(f"DEBUG: Exception in authenticate_user: {e}", flush=True)
        return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        raise HTTPException(status_code=500, detail="Token creation failed")

def _get_user_from_token(credentials: HTTPAuthorizationCredentials, db: Session) -> User:
    """Internal helper to get user from JWT token - reduces code duplication"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token credentials")
        
        # Security: Validate UUID format
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
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current user object from token"""
    return _get_user_from_token(credentials, db)

def get_current_user_obj(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current user object from token (alias for get_current_user)"""
    return get_current_user(credentials, db)

import logging
logger = logging.getLogger(__name__)

def require_permission(permission_name: str):
    """
    Dependency to check if the current user has the required permission.
    """
    def check_permission(
        current_user: User = Depends(get_current_user_obj),
        db: Session = Depends(get_db)
    ):
        logger.error(f"AUTH_DEBUG: check_permission for user: {current_user.email}, role: {current_user.role}, required: {permission_name}")
        
        if not current_user.is_active:
             logger.error(f"AUTH_DEBUG: User {current_user.email} is inactive")
             raise HTTPException(status_code=400, detail="Inactive user")

        if current_user.role == "admin": 
            logger.error(f"AUTH_DEBUG: User {current_user.email} is admin, bypassing check")
            return current_user 

        # Check permission via RBAC Logic
        has_perm, msg = rbac_crud.check_user_permission(db, current_user.id, permission_name)
        logger.error(f"AUTH_DEBUG: RBAC check for {current_user.email}: {has_perm} - {msg}")
        
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required: {permission_name}"
            )
        return current_user

    return check_permission