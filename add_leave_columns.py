import sqlite3
import os

def add_leave_columns(db_path):
    if not os.path.exists(db_path):
        print(f"Database file {db_path} does not exist.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(employees)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'remaining_leave_balance' not in columns:
        try:
            cursor.execute("ALTER TABLE employees ADD COLUMN remaining_leave_balance INTEGER DEFAULT 0")
            print(f"Added remaining_leave_balance to {db_path}")
        except Exception as e:
            print(f"Error adding remaining_leave_balance to {db_path}: {e}")
    else:
        print(f"remaining_leave_balance already exists in {db_path}")
    
    if 'beginning_year_leave_balance' not in columns:
        try:
            cursor.execute("ALTER TABLE employees ADD COLUMN beginning_year_leave_balance INTEGER DEFAULT 0")
            print(f"Added beginning_year_leave_balance to {db_path}")
        except Exception as e:
            print(f"Error adding beginning_year_leave_balance to {db_path}: {e}")
    else:
        print(f"beginning_year_leave_balance already exists in {db_path}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    # List of possible database files
    db_files = [
        "cashflow.db",
        "server/cashflow.db",
        "server/database.db",
        "server/finance.db",
        "jandalisys.db",
        "backup_cashflow_20260108_092331.db",
        "server/data/cashflow.db"
    ]
    
    for db_file in db_files:
        if os.path.exists(db_file):
            print(f"\nProcessing {db_file}...")
            add_leave_columns(db_file)
        else:
            print(f"\n{db_file} not found, skipping.")