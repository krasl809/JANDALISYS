from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, JSON, Table
from sqlalchemy.orm import relationship
from core.database import Base
from sqlalchemy.dialects.postgresql import UUID
import datetime
import uuid

class ArchiveFolder(Base):
    __tablename__ = "archive_folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    path = Column(String, index=True) # Full path on server
    parent_id = Column(Integer, ForeignKey("archive_folders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Metadata
    description = Column(String, nullable=True)
    is_system = Column(Boolean, default=False) # To prevent deletion of core folders
    is_public = Column(Boolean, default=False) # Access control: if False, only owner/admin can see
    
    parent = relationship("ArchiveFolder", remote_side=[id], back_populates="subfolders")
    subfolders = relationship("ArchiveFolder", cascade="all, delete-orphan", back_populates="parent")
    files = relationship("ArchiveFile", back_populates="folder", cascade="all, delete-orphan")
    permissions = relationship("ArchiveFolderPermission", back_populates="folder", cascade="all, delete-orphan")

class ArchiveFolderPermission(Base):
    __tablename__ = "archive_folder_permissions"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("archive_folders.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Permission levels: view, edit, full
    permission_level = Column(String, default="view") 
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    folder = relationship("ArchiveFolder", back_populates="permissions")
    user = relationship("User", foreign_keys=[user_id])
    granter = relationship("User", foreign_keys=[granted_by])

class ArchiveFile(Base):
    __tablename__ = "archive_files"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("archive_folders.id"))
    name = Column(String, index=True, nullable=False)
    original_name = Column(String)
    file_type = Column(String) # pdf, png, jpg, etc.
    file_size = Column(Integer) # in bytes
    file_path = Column(String, nullable=False) # Physical path on storage
    
    # OCR & Metadata
    description = Column(String, nullable=True)
    ocr_text = Column(String, nullable=True) # Extracted text from OCR
    metadata_json = Column(JSON, nullable=True) # Additional attributes
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_public = Column(Boolean, default=False)
    
    folder = relationship("ArchiveFolder", back_populates="files")

class ScannerDevice(Base):
    __tablename__ = "scanner_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    device_type = Column(String)  # WIA, TWAIN, Network
    connection_string = Column(String)  # IP or Device ID
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Settings for this scanner
    settings = Column(JSON, nullable=True) # DPI, Color Mode, Paper Size
