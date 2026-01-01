from sqlalchemy import Column, String, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from core.database import Base
import uuid

# جدول الأدوار
class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)  # admin, manager, finance, user, viewer
    description = Column(String(255))
    
    # علاقة الصلاحيات (Many-to-Many)
    permissions = relationship("Permission", secondary="role_permissions", backref="roles")

# جدول الأذونات
class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)  # read_contracts, write_contracts, post_contracts...

# جدول ربط Roles و Permissions (Many-to-Many)
try:
    role_permissions = Table(
        "role_permissions",
        Base.metadata,
        Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id")),
        Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id")),
        extend_existing=True
    )
except Exception as e:
    raise RuntimeError("Failed to create role_permissions table")

# جدول ربط Users و Roles (Many-to-Many)
try:
    user_roles = Table(
        "user_roles",
        Base.metadata,
        Column("user_id", UUID(as_uuid=True), ForeignKey("users.id")),
        Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id")),
        Column("assigned_at", DateTime, default=func.now()),
        extend_existing=True
    )
except Exception as e:
    raise RuntimeError("Failed to create user_roles table")