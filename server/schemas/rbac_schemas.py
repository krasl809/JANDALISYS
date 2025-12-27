from pydantic import BaseModel
from typing import List, Optional
import uuid

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

class PermissionBase(BaseModel):
    name: str

class PermissionCreate(PermissionBase):
    pass

class Permission(PermissionBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

class RolePermissionsUpdate(BaseModel):
    permission_ids: List[uuid.UUID]