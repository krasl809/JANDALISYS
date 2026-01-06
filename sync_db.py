import sqlite3
import os

def sync_db():
    db_paths = ['cashflow.db', 'server/cashflow.db', 'jandali.db']
    
    required_columns = [
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

            for col_name, col_type in required_columns:
                if col_name not in columns:
                    print(f"Adding column {col_name} to work_shifts in {db_path}...")
                    try:
                        cursor.execute(f"ALTER TABLE work_shifts ADD COLUMN {col_name} {col_type}")
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
