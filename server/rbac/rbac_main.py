# [file name]: /server/rbac_main.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import get_current_user_obj
from crud import rbac_crud
from schemas import rbac_schemas
from models import rbac_models
from models import core_models
from schemas import schemas
from sqlalchemy import func

router = APIRouter(tags=["RBAC"])

@router.get("/roles", response_model=list[rbac_schemas.Role])
def get_roles(db: Session = Depends(get_db)):
    try:
        return db.query(rbac_models.Role).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve roles")

@router.post("/roles", response_model=rbac_schemas.Role)
def create_role(
    role_data: rbac_schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    try:
        if not current_user or current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return rbac_crud.create_role(db, role_data.name, role_data.description)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create role")

@router.post("/assign-role")
def assign_role_to_user(
    assignment: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    try:
        if not current_user or current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        if "user_id" not in assignment or "role_name" not in assignment:
            raise HTTPException(status_code=400, detail="Missing user_id or role_name")
        # Fix: Get role by name first, then use role_id
        role = rbac_crud.get_role_by_name(db, assignment["role_name"])
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return rbac_crud.assign_role_to_user(db, assignment["user_id"], role.id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to assign role to user")

@router.get("/permissions", response_model=list[rbac_schemas.Permission])
def get_permissions(db: Session = Depends(get_db)):
    try:
        return db.query(rbac_models.Permission).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve permissions")

@router.get("/user-permissions/{user_id}")
def get_user_permissions_endpoint(user_id: str, db: Session = Depends(get_db)):
    try:
        return rbac_crud.get_user_permissions(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user permissions")

@router.get("/user-roles/{user_id}")
def get_user_roles_endpoint(user_id: str, db: Session = Depends(get_db)):
    try:
        return rbac_crud.get_user_roles(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user roles")

@router.put("/roles/{role_id}/permissions")
def update_role_permissions_endpoint(
    role_id: str,
    update_data: rbac_schemas.RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_obj)
):
    try:
        if not current_user or current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        success = rbac_crud.update_role_permissions(db, role_id, [str(pid) for pid in update_data.permission_ids])
        return {"status": "success", "message": "Permissions updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update permissions: {str(e)}")