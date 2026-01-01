
import sqlite3
import os

def get_schema(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(contracts)")
    columns = cur.fetchall()
    print(f"Schema for {db_path} 'contracts':")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    get_schema("server/cashflow.db")
