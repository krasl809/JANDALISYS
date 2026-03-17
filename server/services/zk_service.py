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
        # Try connection with increased timeout and fallback to UDP
        conn = None
        zk = None
        try:
            logger.info(f"Connecting to ZK Device {device.ip_address} (TCP)...")
            zk = ZK(device.ip_address, port=device.port, timeout=20, force_udp=False)
            conn = zk.connect()
            logger.info("Connected successfully via TCP.")
        except Exception as e_tcp:
            logger.warning(f"TCP Connection failed: {e_tcp}. Trying UDP...")
            try:
                zk = ZK(device.ip_address, port=device.port, timeout=20, force_udp=True)
                conn = zk.connect()
                logger.info("Connected successfully via UDP.")
            except Exception as e_udp:
                logger.error(f"UDP Connection failed: {e_udp}")
                device.status = "error"
                self.db.commit()
                return {"status": "error", "message": f"Connection failed (TCP: {e_tcp}, UDP: {e_udp})"}

        try:
            # Disable device while reading
            conn.disable_device()

            # Get Attendance Logs
            logs = conn.get_attendance()
            new_logs_count = 0
            
            # --- AUTO-SYNC EMPLOYEES ---
            try:
                # Fetch users from device to get names
                device_users = conn.get_users()
                device_user_map = {str(u.user_id): u.name for u in device_users}
                logger.info(f"Fetched {len(device_users)} users from device.")
            except Exception as e:
                logger.warning(f"Could not fetch users from device: {e}")
                device_user_map = {}

            # Get existing Employees map
            employees = self.db.query(employee_models.Employee).all()
            employees_map = {str(e.code): e.id for e in employees}
            
            # Identify unique user_ids in logs
            log_user_ids = set(str(log.user_id) for log in logs)
            
            # Check for missing employees and create them
            import uuid
            for user_id in log_user_ids:
                if user_id not in employees_map:
                    # Determine name
                    emp_name = device_user_map.get(user_id)
                    if not emp_name:
                        emp_name = f"Employee {user_id}"
                    
                    logger.info(f"Auto-creating missing employee: {user_id} - {emp_name}")
                    
                    first_name = "Employee"
                    last_name = str(user_id)
                    if emp_name != f"Employee {user_id}":
                        # If we have a real name, try to split it
                        parts = emp_name.strip().split()
                        if len(parts) >= 2:
                            first_name = parts[0]
                            last_name = " ".join(parts[1:])
                        else:
                            first_name = emp_name
                            last_name = ""

                    new_emp = employee_models.Employee(
                        id=uuid.uuid4(),
                        code=user_id,
                        first_name=first_name,
                        last_name=last_name,
                        full_name=emp_name,
                        status=employee_models.EmployeeStatus.ACTIVE,
                        employment_type=employee_models.EmploymentType.FULL_TIME,
                        joining_date=datetime.date.today()
                    )
                    self.db.add(new_emp)
                    self.db.flush() # Flush to get ID if needed, though we set UUID manually
                    employees_map[user_id] = new_emp.id # Update map
            
            self.db.commit() # Commit new employees
            # ---------------------------

            for log in logs:
                # Check if log exists
                existing_log = self.db.query(hr_models.AttendanceLog).filter_by(
                    employee_id=str(log.user_id),
                    timestamp=log.timestamp
                ).first()

                # Determine type based on device IP
                log_type = self._get_type_by_device(device.ip_address)
                
                # Improve type detection using ZK status if available
                # ZK Status: 0=CheckIn, 1=CheckOut, 2=BreakOut, 3=BreakIn, 4=OT-In, 5=OT-Out
                zk_status = getattr(log, 'status', None)
                
                if log_type == "mixed":
                    # Handle mixed devices (e.g. 236) using time logic if status is generic
                    if zk_status == 0:
                        log_type = "check_in"
                    elif zk_status == 1:
                        log_type = "check_out"
                    else:
                        # Fallback to time-based inference (Work hours ~8 AM - 4 PM)
                        # Split day at 12:00 PM: Morning -> In, Afternoon -> Out
                        if log.timestamp.hour < 12:
                            log_type = "check_in"
                        else:
                            log_type = "check_out"
                
                elif zk_status is not None:
                    if log_type == "unknown" or log_type == "check_in": # Allow override if device explicitly says CheckOut
                        if zk_status == 1: # CheckOut
                            log_type = "check_out"
                        elif zk_status == 0: # CheckIn
                            log_type = "check_in"
                        elif zk_status == 2: # BreakOut
                            log_type = "break_out"
                        elif zk_status == 3: # BreakIn
                            log_type = "break_in"

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

                if not existing_log:
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
                else:
                    # Update existing log if status/type changed (data correction)
                    if existing_log.type != log_type or existing_log.status != status:
                        existing_log.type = log_type
                        existing_log.status = status
                        existing_log.raw_status = str(log.status)
                        existing_log.verification_mode = str(log.punch)
                        # We don't increment new_logs_count, but we do update the record


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
        elif device_ip == "10.0.0.236":
            # Device 236 handles both Entry and Exit (Mixed)
            # We return "mixed" so the sync logic can determine based on time
            return "mixed"
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
        conn = None
        zk = None
        try:
            # Try TCP first (5 seconds timeout for ping)
            zk = ZK(device.ip_address, port=device.port, timeout=5, force_udp=False)
            conn = zk.connect()
            device.status = "online"
            self.db.commit()
            return {"status": "online"}
        except Exception as e_tcp:
            logger.warning(f"Ping TCP failed for {device.ip_address}: {e_tcp}. Trying UDP...")
            try:
                # Fallback to UDP (5 seconds timeout for ping)
                zk = ZK(device.ip_address, port=device.port, timeout=5, force_udp=True)
                conn = zk.connect()
                device.status = "online"
                self.db.commit()
                return {"status": "online"}
            except Exception as e_udp:
                logger.error(f"Ping failed for {device.ip_address} (TCP: {e_tcp}, UDP: {e_udp})")
                device.status = "offline"
                self.db.commit()
                # Return the detailed error to the caller (optional) but keep status offline
                return {"status": "offline", "error": f"TCP: {str(e_tcp)}, UDP: {str(e_udp)}"}
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
