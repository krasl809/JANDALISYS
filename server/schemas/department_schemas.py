from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PositionBase(BaseModel):
    title: str
    description: Optional[str] = None
    department_id: uuid.UUID
    level: Optional[str] = None

class PositionCreate(PositionBase):
    pass

class Position(PositionBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True