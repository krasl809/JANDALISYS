
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from core.database import SessionLocal
from models import employee_models, hr_models
import datetime
from sqlalchemy import func

def test_hr_dashboard():
    db = SessionLocal()
    try:
        today = datetime.date.today()
        print(f"Checking HR Dashboard stats for today: {today}")
        
        # Total employees
        active_employees = db.query(employee_models.Employee).filter(employee_models.Employee.status == 'active').all()
        print(f"Active Employees count: {len(active_employees)}")
        
        # Attendance today
        today_logs = db.query(hr_models.AttendanceLog).filter(
            func.date(hr_models.AttendanceLog.timestamp) == today
        ).all()
        print(f"Today's attendance logs count: {len(today_logs)}")
        
        present_ids = set(log.employee_id for log in today_logs)
        print(f"Present employees today: {len(present_ids)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_hr_dashboard()
