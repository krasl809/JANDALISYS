import sqlite3
import os

def sync_db():
    db_paths = ['cashflow.db', 'server/cashflow.db', 'jandali.db']
    
    work_shifts_columns = [
        ('end_day_offset', 'INTEGER DEFAULT 0'),
        ('multiplier_normal', 'FLOAT DEFAULT 1.5'),
        ('multiplier_holiday', 'FLOAT DEFAULT 2.0'),
        ('holiday_days', 'JSON DEFAULT "[]"'),
        ('is_holiday_paid', 'BOOLEAN DEFAULT 1'),
        ('distribute_holiday_bonus', 'BOOLEAN DEFAULT 0'),
        ('min_days_for_paid_holiday', 'INTEGER DEFAULT 4'),
        ('rotation_pattern', 'JSON'),
        ('is_active', 'BOOLEAN DEFAULT 1')
    ]
    
    attendance_logs_columns = [
        ('is_manually_edited', 'BOOLEAN DEFAULT 0'),
        ('edited_by', 'UUID'),
        ('edited_at', 'DATETIME'),
        ('edit_reason', 'TEXT'),
        ('original_timestamp', 'DATETIME')
    ]
    
    for db_path in db_paths:
        if not os.path.exists(db_path):
            continue
            
        print(f"Syncing database: {db_path}")
        conn = None
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check work_shifts table
            cursor.execute("PRAGMA table_info(work_shifts)")
            columns = [col[1] for col in cursor.fetchall()]
            if not columns:
                print(f"Table work_shifts not found in {db_path}")
                conn.close()
                continue
                
            print(f"Current columns in work_shifts: {columns}")

            for col_name, col_type in work_shifts_columns:
                if col_name not in columns:
                    print(f"Adding column {col_name} to work_shifts in {db_path}...")
                    try:
                        cursor.execute(f"ALTER TABLE work_shifts ADD COLUMN {col_name} {col_type}")
                    except Exception as e:
                        print(f"Error adding {col_name} to {db_path}: {e}")

            # Check and create processed_attendance table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='processed_attendance'")
            if not cursor.fetchone():
                print(f"Creating processed_attendance table in {db_path}...")
                cursor.execute("""
                    CREATE TABLE processed_attendance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        employee_pk UUID NOT NULL,
                        work_date DATETIME NOT NULL,
                        check_in DATETIME,
                        check_out DATETIME,
                        work_hours REAL DEFAULT 0.0,
                        overtime_hours REAL DEFAULT 0.0,
                        late_minutes INTEGER DEFAULT 0,
                        early_leave_minutes INTEGER DEFAULT 0,
                        status TEXT DEFAULT 'present',
                        shift_id INTEGER,
                        expected_hours REAL DEFAULT 8.0,
                        is_calculated BOOLEAN DEFAULT 1,
                        calculated_at DATETIME,
                        calculation_version TEXT DEFAULT '1.0',
                        has_manual_adjustment BOOLEAN DEFAULT 0,
                        adjusted_work_hours REAL,
                        adjustment_reason TEXT,
                        adjusted_by UUID,
                        adjusted_at DATETIME
                    )
                """)
            else:
                print(f"processed_attendance table already exists in {db_path}")
            
            # Check attendance_logs table for new columns
            cursor.execute("PRAGMA table_info(attendance_logs)")
            att_columns = [col[1] for col in cursor.fetchall()]
            print(f"Current columns in attendance_logs: {att_columns}")
            
            for col_name, col_type in attendance_logs_columns:
                if col_name not in att_columns:
                    print(f"Adding column {col_name} to attendance_logs in {db_path}...")
                    try:
                        cursor.execute(f"ALTER TABLE attendance_logs ADD COLUMN {col_name} {col_type}")
                    except Exception as e:
                        print(f"Error adding {col_name} to {db_path}: {e}")

            conn.commit()
            print(f"Database {db_path} sync complete.")
        except Exception as e:
            print(f"Error processing {db_path}: {e}")
        finally:
            if conn:
                conn.close()

if __name__ == "__main__":
    sync_db()
