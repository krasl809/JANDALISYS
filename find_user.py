import sqlite3
import os

def check_db(db_path):
    if not os.path.exists(db_path):
        print(f"{db_path} does not exist")
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM users WHERE id='64f552dc6dc349ec8f5a80076ae3808f' OR id='64f552dc-6dc3-49ec-8f5a-80076ae3808f'")
        rows = cur.fetchall()
        print(f"{db_path}: {rows}")
    except Exception as e:
        print(f"Error checking {db_path}: {e}")
    finally:
        conn.close()

check_db('server/cashflow.db')
check_db('cashflow.db')
