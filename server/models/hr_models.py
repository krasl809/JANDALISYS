from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum, Float, JSON
from sqlalchemy.orm import relationship
from core.database import Base
from sqlalchemy.dialects.postgresql import UUID
# from models import employee_models # To ensure registry
import datetime
import enum

class AttendanceType(str, enum.Enum):
    CHECK_IN = "check_in"
    CHECK_OUT = "check_out"
    BREAK_OUT = "break_out"
    BREAK_IN = "break_in"
    OVERTIME_IN = "overtime_in"
    OVERTIME_OUT = "overtime_out"

class ZkDevice(Base):
    __tablename__ = "zk_devices"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    ip_address = Column(String, unique=True, nullable=False)
    port = Column(Integer, default=4370)
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    status = Column(String, default="offline") # online, offline, error

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    employee_pk = Column("user_id", UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True) # Linked to internal Employee ID
    employee_id = Column(String, index=True) # ID from device/user (ZKTeco User ID)
    timestamp = Column(DateTime, nullable=False, index=True)
    type = Column(String, default="check_in") # Mapped from device status
    device_id = Column(Integer, ForeignKey("zk_devices.id"), nullable=True)
    
    # Smart Analysis Fields
    status = Column(String, default="present") # present, late, early_leave
    verification_mode = Column(String, nullable=True) # Fingerprint, Face, Card, Password
    raw_status = Column(String, nullable=True) # Original status from device (101, 102, etc.)
    
    # Manual Edit Tracking
    is_manually_edited = Column(Boolean, default=False) # Whether this record was manually edited
    edited_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True) # Who edited
    edited_at = Column(DateTime, nullable=True) # When edited
    edit_reason = Column(String, nullable=True) # Reason for edit
    original_timestamp = Column(DateTime, nullable=True) # Original timestamp before edit

    employee = relationship("Employee", foreign_keys=[employee_pk])
    editor = relationship("Employee", foreign_keys=[edited_by])
    device = relationship("ZkDevice", backref="logs")

class ShiftType(str, enum.Enum):
    FIXED = "fixed"
    ROTATIONAL = "rotational"

class WorkShift(Base):
    __tablename__ = "work_shifts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    shift_type = Column(String, default=ShiftType.FIXED) # fixed, rotational
    
    # Standard Times (for Fixed)
    start_time = Column(String, nullable=True) # "HH:mm"
    end_time = Column(String, nullable=True)   # "HH:mm"
    expected_hours = Column(Float, default=8.0)
    
    # Policy Rules
    grace_period_in = Column(Integer, default=15)  # minutes
    grace_period_out = Column(Integer, default=15) # minutes
    ot_threshold = Column(Integer, default=30)     # minutes before OT starts
    end_day_offset = Column(Integer, default=0)    # 0: same day, 1: next day, 2: day after next
    
    # Overtime Multipliers
    multiplier_normal = Column(Float, default=1.5)
    multiplier_holiday = Column(Float, default=2.0)
    
    # Configuration
    holiday_days = Column(JSON, default=list) # ["Friday"]
    is_holiday_paid = Column(Boolean, default=True) # Whether holidays are paid when absent
    distribute_holiday_bonus = Column(Boolean, default=False) # For rotational: distribute holiday pay across work days
    min_days_for_paid_holiday = Column(Integer, default=4) # Min working days in last 7 days to get paid holiday
    
    # Advanced Rotation: [{"start": "08:00", "end": "16:00", "hours": 8, "offset": 0}, {"start": "16:00", "end": "08:00", "hours": 16, "offset": 1}, "OFF"]
    rotation_pattern = Column(JSON, nullable=True) 
    
    is_active = Column(Boolean, default=True)

class EmployeeShiftAssignment(Base):
    __tablename__ = "employee_shift_assignments"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("work_shifts.id"), nullable=False)
    
    start_date = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    
    employee = relationship("Employee", backref="shift_assignments")
    shift = relationship("WorkShift", backref="employee_assignments")

class ProcessedAttendance(Base):
    """Stored calculated daily attendance records"""
    __tablename__ = "processed_attendance"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    employee_pk = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    work_date = Column(DateTime, nullable=False, index=True)  # The date (normalized to midnight)
    
    # Calculated fields
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    work_hours = Column(Float, default=0.0)  # Total work hours
    overtime_hours = Column(Float, default=0.0)  # Overtime hours
    late_minutes = Column(Integer, default=0)  # Minutes late
    early_leave_minutes = Column(Integer, default=0)  # Minutes early left
    status = Column(String, default="present")  # present, late, early_leave, absent, holiday
    
    # Shift info
    shift_id = Column(Integer, ForeignKey("work_shifts.id"), nullable=True)
    expected_hours = Column(Float, default=8.0)
    
    # Processing metadata
    is_calculated = Column(Boolean, default=True)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)
    calculation_version = Column(String, default="1.0")  # To track calculation logic changes
    
    # Manual adjustments
    has_manual_adjustment = Column(Boolean, default=False)
    adjusted_work_hours = Column(Float, nullable=True)
    adjustment_reason = Column(String, nullable=True)
    adjusted_by = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    adjusted_at = Column(DateTime, nullable=True)
    
    employee = relationship("Employee", foreign_keys=[employee_pk])
    shift = relationship("WorkShift")
    adjuster = relationship("Employee", foreign_keys=[adjusted_by])
