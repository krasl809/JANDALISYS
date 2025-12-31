import sqlite3
import os

db_path = 'd:/SAM-Work/GM/erp-2025/Finance/cashflow_system1/cashflow_system/server/cashflow.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if column exists
    cursor.execute("PRAGMA table_info(work_shifts)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'is_holiday_paid' not in columns:
        print("Adding is_holiday_paid column to work_shifts table...")
        cursor.execute("ALTER TABLE work_shifts ADD COLUMN is_holiday_paid BOOLEAN DEFAULT 1")
        conn.commit()
        print("Column is_holiday_paid added successfully.")
    
    if 'min_days_for_paid_holiday' not in columns:
        print("Adding min_days_for_paid_holiday column to work_shifts table...")
        cursor.execute("ALTER TABLE work_shifts ADD COLUMN min_days_for_paid_holiday INTEGER DEFAULT 4")
        conn.commit()
        print("Column min_days_for_paid_holiday added successfully.")
    else:
        print("Column min_days_for_paid_holiday already exists.")

    if 'end_day_offset' not in columns:
        print("Adding end_day_offset column to work_shifts table...")
        cursor.execute("ALTER TABLE work_shifts ADD COLUMN end_day_offset INTEGER DEFAULT 0")
        conn.commit()
        print("Column end_day_offset added successfully.")
    else:
        print("Column end_day_offset already exists.")

    if 'distribute_holiday_bonus' not in columns:
        print("Adding distribute_holiday_bonus column to work_shifts table...")
        cursor.execute("ALTER TABLE work_shifts ADD COLUMN distribute_holiday_bonus BOOLEAN DEFAULT 0")
        conn.commit()
        print("Column distribute_holiday_bonus added successfully.")
    else:
        print("Column distribute_holiday_bonus already exists.")

    # Add the administrative shift if it doesn't exist
    cursor.execute("SELECT id FROM work_shifts WHERE name = 'الشفت الإداري' OR name = 'Administrative Shift'")
    if not cursor.fetchone():
        print("Adding Administrative Shift...")
        # holiday_days is JSON, Friday is ["Friday"]
        import json
        holiday_days = json.dumps(["Friday"])
        cursor.execute("""
            INSERT INTO work_shifts (name, description, shift_type, start_time, end_time, expected_hours, 
                                   grace_period_in, grace_period_out, ot_threshold, multiplier_normal, 
                                   multiplier_holiday, holiday_days, is_holiday_paid, min_days_for_paid_holiday, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('الشفت الإداري', 'دوام الموظفين الإداريين 8 ساعات يومياً ماعدا الجمعة', 'fixed', '08:00', '16:00', 8.0, 
              15, 15, 30, 1.5, 2.0, holiday_days, 1, 4, 1))
        conn.commit()
        print("Administrative Shift added successfully.")
    else:
        print("Administrative Shift already exists.")

    # Add the Rotating/Shift Worker shift if it doesn't exist
    cursor.execute("SELECT id FROM work_shifts WHERE name = 'شفت الورديات' OR name = 'Shift Workers'")
    if not cursor.fetchone():
        print("Adding Shift Workers (48h/week) Shift...")
        import json
        holiday_days = json.dumps(["Friday"])
        cursor.execute("""
            INSERT INTO work_shifts (name, description, shift_type, start_time, end_time, expected_hours, 
                                   grace_period_in, grace_period_out, ot_threshold, multiplier_normal, 
                                   multiplier_holiday, holiday_days, is_holiday_paid, min_days_for_paid_holiday, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('شفت الورديات', 'دوام ورديات 48 ساعة أسبوعياً (6 أيام عمل × 8 ساعات)، يستحق العطلة بعد 6 أيام عمل', 'fixed', '08:00', '16:00', 8.0, 
              15, 15, 30, 1.5, 2.0, holiday_days, 1, 6, 1))
        conn.commit()
        print("Shift Workers Shift added successfully.")
    else:
        print("Shift Workers Shift already exists.")

    # Add the Advanced Rotation (8h-16h-OFF) if it doesn't exist
    cursor.execute("SELECT id FROM work_shifts WHERE name = 'شفت المناوبات الثلاثي' OR name = 'Triple Rotation Shift'")
    if not cursor.fetchone():
        print("Adding Triple Rotation Shift (8h-16h-OFF)...")
        import json
        rotation_pattern = json.dumps({
            "sequence": [
                {"label": "8h Morning", "hours": 8, "offset": 0, "start": "08:00", "end": "16:00"},
                {"label": "16h Night", "hours": 16, "offset": 1, "start": "16:00", "end": "08:00"},
                "OFF"
            ]
        })
        cursor.execute("""
            INSERT INTO work_shifts (name, description, shift_type, start_time, end_time, expected_hours, 
                                   grace_period_in, grace_period_out, ot_threshold, multiplier_normal, 
                                   multiplier_holiday, holiday_days, is_holiday_paid, min_days_for_paid_holiday, 
                                   rotation_pattern, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('شفت المناوبات الثلاثي', 'يوم 8 ساعات، يوم 16 ساعة (مبيت)، يوم عطلة', 'rotational', '08:00', '16:00', 8.0, 
              15, 15, 30, 1.5, 2.0, '[]', 1, 4, rotation_pattern, 1))
        conn.commit()
        print("Triple Rotation Shift added successfully.")
    else:
        print("Triple Rotation Shift already exists.")

    # Add the ABC Rotation Shift if it doesn't exist
    cursor.execute("SELECT id FROM work_shifts WHERE name = 'مناوبة الورديات المبسطة' OR name = 'ABC Rotation Shift'")
    if not cursor.fetchone():
        print("Adding ABC Rotation Shift (8h-16h-OFF with Slots)...")
        import json
        rotation_pattern = json.dumps({
            "sequence": [
                {"label": "A", "slots": ["A"], "hours": 8, "offset": 0},
                {"label": "B+C", "slots": ["B", "C"], "hours": 16, "offset": 1},
                "OFF"
            ],
            "slots": {
                "A": {"start": "08:00", "end": "16:00", "hours": 8},
                "B": {"start": "16:00", "end": "00:00", "hours": 8},
                "C": {"start": "00:00", "end": "08:00", "hours": 8}
            }
        })
        cursor.execute("""
            INSERT INTO work_shifts (name, description, shift_type, start_time, end_time, expected_hours, 
                                   grace_period_in, grace_period_out, ot_threshold, multiplier_normal, 
                                   multiplier_holiday, holiday_days, is_holiday_paid, min_days_for_paid_holiday, 
                                   rotation_pattern, distribute_holiday_bonus, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ('مناوبة الورديات المبسطة', 'نظام (A, B+C, OFF) مع توزيع استحقاق العطلة', 'rotational', '08:00', '16:00', 8.0, 
              15, 15, 30, 1.5, 2.0, '[]', 1, 4, rotation_pattern, 1, 1))
        conn.commit()
        print("ABC Rotation Shift added successfully.")
    else:
        print("ABC Rotation Shift already exists.")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
