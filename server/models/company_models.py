from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from core.database import Base

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(50), unique=True, nullable=True)
    
    # Contact Information
    address = Column(Text)
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100))
    
    phone = Column(String(50))
    fax = Column(String(50))
    email = Column(String(255))
    website = Column(String(255))
    
    # Business Information
    tax_number = Column(String(100))
    commercial_register = Column(String(100))
    industry = Column(String(100))
    
    # Financial Information
    currency = Column(String(3), default="USD")
    fiscal_year_start = Column(String(5), default="01-01")  # MM-DD
    
    # Settings
    is_active = Column(Boolean, default=True)
    logo_path = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships