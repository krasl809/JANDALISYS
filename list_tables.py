import sqlite3
import os

db_path = 'server/cashflow.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cur.fetchall()]
    print("Tables in DB:", tables)
    conn.close()
else:
    print(f"{db_path} not found")
