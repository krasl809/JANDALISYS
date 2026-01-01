import logging
import datetime
from sqlalchemy.orm import Session
from models import hr_models, core_models, employee_models
from core.database import SessionLocal

# Try importing zk, handle if missing
try:
    from zk import ZK
    ZK_AVAILABLE = True
except ImportError:
    ZK_AVAILABLE = False

logger = logging.getLogger(__name__)

class ZkTecoService:
    def __init__(self, db: Session):
        self.db = db

    def sync_device(self, device_id: int):
        device = self.db.query(hr_models.ZkDevice).filter(hr_models.ZkDevice.id == device_id).first()
        if not device:
            return {"status": "error", "message": "Device not found"}

        if not ZK_AVAILABLE:
            # Fake sync for testing UI if lib not installed
            if any(device.ip_address.startswith(prefix) for prefix in ["192.", "10.", "127."]):
                logger.warning("zkteco library not found. Installing mock data for demo.")
                self._create_mock_logs(device)
                return {"status": "warning", "message": "Library 'zkteco' missing. Mock data generated.", "logs_count": 5}
            else:
                return {"status": "error", "message": "Device unreachable (Mock Mode: Invalid IP range)"}

        # Real Connection Logic
        zk = ZK(device.ip_address, port=device.port, timeout=5)
        conn = None
        try:
            logger.info(f"Connecting to ZK Device {device.ip_address}...")
            conn = zk.connect()
            logger.info("Connected successfully.")

            # Disable device while reading
            conn.disable_device()

            # Get Attendance Logs
            logs = conn.get_attendance()
            new_logs_count = 0

            # Get Employees map for referencing by their device code
            # Note: We query all active employees to map device user_id to internal PK
            employees = self.db.query(employee_models.Employee).all()
            employees_map = {str(e.code): e.id for e in employees}

            for log in logs:
                # Check if log exists
                exists = self.db.query(hr_models.AttendanceLog).filter_by(
                    employee_id=str(log.user_id),
                    timestamp=log.timestamp
                ).first()

                if not exists:
                    # Determine type based on device IP
                    log_type = self._get_type_by_device(device.ip_address)

                    # Calculate status based on type and time
                    status = "present"
                    hour = log.timestamp.hour
                    minute = log.timestamp.minute

                    if log_type == "check_in":
                        # Late if after 9:15 AM
                        if hour > 9 or (hour == 9 and minute > 15):
                            status = "late"
                    elif log_type == "check_out":
                        # Early leave if before 4:00 PM
                        if hour < 16:
                            status = "early_leave"

                    new_log = hr_models.AttendanceLog(
                        employee_pk=employees_map.get(str(log.user_id)),
                        employee_id=str(log.user_id),
                        timestamp=log.timestamp,
                        type=log_type,
                        device_id=device.id,
                        verification_mode=str(log.punch),
                        raw_status=str(log.status),
                        status=status
                    )
                    self.db.add(new_log)
                    new_logs_count += 1

            device.last_sync = datetime.datetime.now()
            device.status = "online"
            self.db.commit()

            # Re-enable device
            conn.enable_device()
            return {"status": "success", "message": f"Synced {new_logs_count} new logs", "logs_count": new_logs_count}

        except Exception as e:
            logger.error(f"ZKTeco Sync Error: {e}")
            device.status = "error"
            self.db.commit()
            return {"status": "error", "message": str(e)}
        finally:
            if conn:
                try:
                    conn.disconnect()
                except:
                    pass

    def _get_type_by_device(self, device_ip):
        # Determine check-in/check-out based on device IP
        if device_ip == "10.0.0.234":
            return "check_in"
        elif device_ip == "10.0.0.235":
            return "check_out"
        else:
            # Fallback to status if IP not recognized
            return "unknown"

    def _map_status(self, zk_status):
        # Keep original status for reference
        return str(zk_status)

    def ping_device(self, device_id: int):
        device = self.db.query(hr_models.ZkDevice).filter(hr_models.ZkDevice.id == device_id).first()
        if not device:
            return {"status": "error", "message": "Device not found"}

        if not ZK_AVAILABLE:
            # Simulate ping for demo - only "online" if IP starts with 192 or 10 (common local IPs)
            # or if it's a specific test IP
            is_online = any(device.ip_address.startswith(prefix) for prefix in ["192.", "10.", "127."])
            device.status = "online" if is_online else "offline"
            self.db.commit()
            return {"status": "online" if is_online else "offline"}

        # Real ping logic
        zk = ZK(device.ip_address, port=device.port, timeout=5)
        conn = None
        try:
            conn = zk.connect()
            device.status = "online"
            self.db.commit()
            return {"status": "online"}
        except Exception as e:
            logger.error(f"Ping failed for {device.ip_address}: {e}")
            device.status = "offline"
            self.db.commit()
            return {"status": "offline"}
        finally:
            if conn:
                try:
                    conn.disconnect()
                except:
                    pass

    def _create_mock_logs(self, device):
        # Demo data generator
        import random
        employees = self.db.query(employee_models.Employee).filter(employee_models.Employee.status == "active").all()
        if not employees:
            return

        now = datetime.datetime.now()
        for emp in employees:
            # Determine type based on device IP
            log_type = self._get_type_by_device(device.ip_address)
            if log_type == "unknown":
                continue

            # Generate appropriate time based on type
            if log_type == "check_in":
                # Check-in today at 8-10 AM
                log_time = now.replace(hour=8, minute=0, second=0) + datetime.timedelta(minutes=random.randint(0, 120))
                raw_status = "101"
            else:  # check_out
                # Check-out today at 4-6 PM
                log_time = now.replace(hour=16, minute=0, second=0) + datetime.timedelta(minutes=random.randint(0, 120))
                raw_status = "102"

            # Check if log exists
            exists = self.db.query(hr_models.AttendanceLog).filter_by(
                employee_id=emp.code,
                timestamp=log_time
            ).first()
            if not exists:
                status = "present"
                hour = log_time.hour
                minute = log_time.minute

                if log_type == "check_in":
                    if hour > 9 or (hour == 9 and minute > 15):
                        status = "late"
                elif log_type == "check_out":
                    if hour < 16:
                        status = "early_leave"

                log = hr_models.AttendanceLog(
                    employee_pk=emp.id,
                    employee_id=emp.code,
                    timestamp=log_time,
                    type=log_type,
                    device_id=device.id,
                    raw_status=raw_status,
                    status=status,
                    verification_mode="Face"
                )
                self.db.add(log)
        self.db.commit()
