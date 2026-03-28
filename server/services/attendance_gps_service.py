"""
Attendance GPS Service
Mobile camera attendance with GPS location tracking
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, Dict, List
import uuid
from datetime import datetime, date, timedelta
import logging
import base64
import os

logger = logging.getLogger(__name__)


class AttendanceGPSService:
    """Service for recording attendance with GPS and camera"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def record_attendance(
        self,
        employee_id: uuid.UUID,
        attendance_type: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_accuracy: Optional[float] = None,
        photo_base64: Optional[str] = None,
        device_type: Optional[str] = None,
        device_id: Optional[str] = None,
        device_model: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict:
        """
        Record attendance with GPS and camera
        
        Args:
            employee_id: Employee UUID
            attendance_type: check_in or check_out
            latitude: GPS latitude
            longitude: GPS longitude
            location_accuracy: GPS accuracy in meters
            photo_base64: Base64 encoded photo
            device_type: mobile, tablet, desktop
            device_id: Device identifier
            device_model: Device model
            ip_address: IP address
            
        Returns:
            dict: Recording result
        """
        from models.employee_models import Employee
        from models.hierarchical_approval_models import EmployeeAttendanceGPS
        
        # Validate employee
        employee = self.db.query(Employee).filter(
            Employee.id == employee_id
        ).first()
        
        if not employee:
            raise ValueError("الموظف غير موجود")
        
        # Check for duplicate recording
        last_record = self.db.query(EmployeeAttendanceGPS).filter(
            EmployeeAttendanceGPS.employee_id == employee_id
        ).order_by(EmployeeAttendanceGPS.timestamp.desc()).first()
        
        if last_record and last_record.type == attendance_type:
            # Check time difference (can't record same type within 5 minutes)
            time_diff = (datetime.now() - last_record.timestamp).total_seconds() / 60
            if time_diff < 5:
                raise ValueError(
                    f"تم تسجيل {attendance_type} منذ {int(time_diff)} دقائق. "
                    "يرجى الانتظار 5 دقائق على الأقل."
                )
        
        # Save photo if provided
        photo_url = None
        if photo_base64:
            photo_url = self._save_photo(employee_id, photo_base64)
        
        # Reverse geocode location
        location_address = None
        if latitude and longitude:
            location_address = self._reverse_geocode(latitude, longitude)
        
        # Create attendance record
        attendance_record = EmployeeAttendanceGPS(
            id=uuid.uuid4(),
            employee_id=employee_id,
            type=attendance_type,
            timestamp=datetime.now(),
            latitude=latitude,
            longitude=longitude,
            location_accuracy=location_accuracy,
            location_address=location_address,
            photo_url=photo_url,
            photo_base64=photo_base64,
            device_type=device_type,
            device_id=device_id,
            device_model=device_model,
            ip_address=ip_address,
            status='present'
        )
        
        self.db.add(attendance_record)
        self.db.commit()
        
        logger.info(
            f"Recorded {attendance_type} for employee {employee.code} "
            f"at {location_address or 'unknown location'}"
        )
        
        return {
            'success': True,
            'message': f'تم تسجيل {attendance_type} بنجاح',
            'record_id': str(attendance_record.id),
            'timestamp': attendance_record.timestamp.isoformat(),
            'location': location_address,
            'photo_saved': photo_url is not None
        }
    
    def _save_photo(self, employee_id: uuid.UUID, photo_base64: str) -> str:
        """Save photo to storage and return URL"""
        
        try:
            # Create directory if not exists
            upload_dir = "uploads/attendance_photos"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{employee_id}_{timestamp}.jpg"
            filepath = os.path.join(upload_dir, filename)
            
            # Decode and save
            photo_data = base64.b64decode(photo_base64)
            with open(filepath, "wb") as f:
                f.write(photo_data)
            
            # Return URL
            return f"/uploads/attendance_photos/{filename}"
        
        except Exception as e:
            logger.error(f"Error saving photo: {str(e)}")
            return None
    
    def _reverse_geocode(self, latitude: float, longitude: float) -> str:
        """
        Convert GPS coordinates to address
        
        Args:
            latitude: GPS latitude
            longitude: GPS longitude
            
        Returns:
            str: Address string
        """
        try:
            # Try using geopy for reverse geocoding
            from geopy.geocoders import Nominatim
            
            geolocator = Nominatim(user_agent="hr_system")
            location = geolocator.reverse(f"{latitude}, {longitude}", language='ar')
            
            if location:
                return location.address
            else:
                return f"Lat: {latitude:.6f}, Lon: {longitude:.6f}"
        
        except ImportError:
            # geopy not installed, return coordinates
            logger.warning("geopy not installed, returning coordinates")
            return f"Lat: {latitude:.6f}, Lon: {longitude:.6f}"
        
        except Exception as e:
            logger.error(f"Error reverse geocoding: {str(e)}")
            return f"Lat: {latitude:.6f}, Lon: {longitude:.6f}"
    
    def get_employee_attendance(
        self,
        employee_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Dict]:
        """
        Get attendance records for an employee
        
        Args:
            employee_id: Employee UUID
            start_date: Start date filter
            end_date: End date filter
            
        Returns:
            list: Attendance records
        """
        from models.hierarchical_approval_models import EmployeeAttendanceGPS
        
        query = self.db.query(EmployeeAttendanceGPS).filter(
            EmployeeAttendanceGPS.employee_id == employee_id
        )
        
        if start_date:
            query = query.filter(
                func.date(EmployeeAttendanceGPS.timestamp) >= start_date
            )
        
        if end_date:
            query = query.filter(
                func.date(EmployeeAttendanceGPS.timestamp) <= end_date
            )
        
        records = query.order_by(EmployeeAttendanceGPS.timestamp.desc()).all()
        
        return [
            {
                'id': str(record.id),
                'type': record.type,
                'timestamp': record.timestamp.isoformat(),
                'latitude': float(record.latitude) if record.latitude else None,
                'longitude': float(record.longitude) if record.longitude else None,
                'location_accuracy': float(record.location_accuracy) if record.location_accuracy else None,
                'location_address': record.location_address,
                'photo_url': record.photo_url,
                'device_type': record.device_type,
                'status': record.status,
                'is_verified': record.is_verified
            }
            for record in records
        ]
    
    def get_today_attendance(self, employee_id: uuid.UUID) -> Dict:
        """
        Get today's attendance summary for an employee
        
        Args:
            employee_id: Employee UUID
            
        Returns:
            dict: Today's attendance summary
        """
        from models.hierarchical_approval_models import EmployeeAttendanceGPS
        
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        records = self.db.query(EmployeeAttendanceGPS).filter(
            and_(
                EmployeeAttendanceGPS.employee_id == employee_id,
                EmployeeAttendanceGPS.timestamp >= today_start,
                EmployeeAttendanceGPS.timestamp <= today_end
            )
        ).order_by(EmployeeAttendanceGPS.timestamp.asc()).all()
        
        check_in = None
        check_out = None
        
        for record in records:
            if record.type == 'check_in' and not check_in:
                check_in = record
            elif record.type == 'check_out':
                check_out = record
        
        result = {
            'date': today.isoformat(),
            'has_check_in': check_in is not None,
            'has_check_out': check_out is not None,
            'check_in_time': check_in.timestamp.isoformat() if check_in else None,
            'check_out_time': check_out.timestamp.isoformat() if check_out else None,
            'check_in_location': check_in.location_address if check_in else None,
            'check_out_location': check_out.location_address if check_out else None,
            'total_records': len(records)
        }
        
        # Calculate work hours if both check-in and check-out exist
        if check_in and check_out:
            work_duration = check_out.timestamp - check_in.timestamp
            result['work_hours'] = work_duration.total_seconds() / 3600
            result['work_hours_formatted'] = str(work_duration)
        
        return result
    
    def get_attendance_summary(
        self,
        employee_id: uuid.UUID,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> Dict:
        """
        Get attendance summary for a month
        
        Args:
            employee_id: Employee UUID
            month: Month number (1-12)
            year: Year number
            
        Returns:
            dict: Monthly attendance summary
        """
        from models.hierarchical_approval_models import EmployeeAttendanceGPS
        
        if not month:
            month = datetime.now().month
        if not year:
            year = datetime.now().year
        
        # Get first and last day of month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)
        
        # Get all records for the month
        records = self.db.query(EmployeeAttendanceGPS).filter(
            and_(
                EmployeeAttendanceGPS.employee_id == employee_id,
                func.date(EmployeeAttendanceGPS.timestamp) >= first_day,
                func.date(EmployeeAttendanceGPS.timestamp) <= last_day
            )
        ).order_by(EmployeeAttendanceGPS.timestamp.asc()).all()
        
        # Group by date
        daily_records = {}
        for record in records:
            record_date = record.timestamp.date().isoformat()
            if record_date not in daily_records:
                daily_records[record_date] = {
                    'date': record_date,
                    'check_in': None,
                    'check_out': None,
                    'work_hours': 0
                }
            
            if record.type == 'check_in':
                daily_records[record_date]['check_in'] = record.timestamp.isoformat()
            elif record.type == 'check_out':
                daily_records[record_date]['check_out'] = record.timestamp.isoformat()
        
        # Calculate work hours for each day
        for date_str, day_data in daily_records.items():
            if day_data['check_in'] and day_data['check_out']:
                check_in = datetime.fromisoformat(day_data['check_in'])
                check_out = datetime.fromisoformat(day_data['check_out'])
                work_duration = check_out - check_in
                day_data['work_hours'] = work_duration.total_seconds() / 3600
        
        # Calculate summary
        total_days = len(daily_records)
        total_work_hours = sum(d['work_hours'] for d in daily_records.values())
        present_days = sum(1 for d in daily_records.values() if d['check_in'])
        
        return {
            'month': month,
            'year': year,
            'total_days': total_days,
            'present_days': present_days,
            'absent_days': total_days - present_days,
            'total_work_hours': round(total_work_hours, 2),
            'average_work_hours': round(total_work_hours / present_days, 2) if present_days > 0 else 0,
            'daily_records': list(daily_records.values())
        }
    
    def verify_attendance_record(
        self,
        record_id: uuid.UUID,
        verified_by: uuid.UUID
    ) -> Dict:
        """
        Verify an attendance record
        
        Args:
            record_id: Attendance record UUID
            verified_by: Verifier employee UUID
            
        Returns:
            dict: Verification result
        """
        from models.hierarchical_approval_models import EmployeeAttendanceGPS
        
        record = self.db.query(EmployeeAttendanceGPS).filter(
            EmployeeAttendanceGPS.id == record_id
        ).first()
        
        if not record:
            raise ValueError("سجل الحضور غير موجود")
        
        record.is_verified = True
        record.verified_by = verified_by
        record.verified_at = datetime.now()
        
        self.db.commit()
        
        return {
            'success': True,
            'message': 'تم التحقق من السجل بنجاح'
        }
