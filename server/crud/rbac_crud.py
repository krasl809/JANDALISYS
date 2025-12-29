import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException
from models.rbac_models import Role, Permission, role_permissions, user_roles

def get_role_by_name(db: Session, name: str):
    return db.query(Role).filter(Role.name == name).first()

def create_role(db: Session, name: str, description: str = None):
    existing = db.query(Role).filter(Role.name == name).first()
    if existing:
        return existing
    role = Role(name=name, description=description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

def create_permission(db: Session, name: str):
    existing = db.query(Permission).filter(Permission.name == name).first()
    if existing:
        return existing
    perm = Permission(name=name)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm

def assign_permission_to_role(db: Session, role_id, permission_id):
    # Ensure UUIDs
    if isinstance(role_id, str): role_id = uuid.UUID(role_id)
    if isinstance(permission_id, str): permission_id = uuid.UUID(permission_id)
    
    exists_stmt = select(role_permissions.c.role_id).where(
        role_permissions.c.role_id == role_id,
        role_permissions.c.permission_id == permission_id
    )
    if db.execute(exists_stmt).first() is None:
        stmt = role_permissions.insert().values(role_id=role_id, permission_id=permission_id)
        db.execute(stmt)
        db.commit()

def assign_role_to_user(db: Session, user_id, role_id):
    # Ensure UUIDs
    if isinstance(user_id, str): user_id = uuid.UUID(user_id)
    if isinstance(role_id, str): role_id = uuid.UUID(role_id)
    
    # Check if already assigned
    exists_stmt = select(user_roles.c.user_id).where(
        user_roles.c.user_id == user_id,
        user_roles.c.role_id == role_id
    )
    if db.execute(exists_stmt).first() is None:
        stmt = user_roles.insert().values(user_id=user_id, role_id=role_id)
        db.execute(stmt)
        db.commit()

def get_user_permissions(db: Session, user_id):
    # Ensure UUID
    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(user_id)
        except ValueError:
            pass # Keep as string if not a valid UUID
            
    stmt = select(Permission.name).join(
        role_permissions, Permission.id == role_permissions.c.permission_id
    ).join(
        user_roles, role_permissions.c.role_id == user_roles.c.role_id
    ).where(user_roles.c.user_id == user_id)

    result = db.execute(stmt).scalars().all()
    return result

def get_user_roles(db: Session, user_id):
    # Ensure UUID
    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(user_id)
        except ValueError:
            pass
            
    stmt = select(Role.name).join(
        user_roles, Role.id == user_roles.c.role_id
    ).where(user_roles.c.user_id == user_id)

    result = db.execute(stmt).scalars().all()
    return result

def check_user_permission(db: Session, user_id, permission_name: str):
    """
    Check if a user has a specific permission.
    Returns: (bool, message)
    """
    # 1. Get user permissions
    permissions = get_user_permissions(db, user_id)
    
    if permission_name in permissions:
        return True, "Permission granted"
        
    return False, f"Permission {permission_name} not found for user"