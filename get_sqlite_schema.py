
import sqlite3
import os
import sys

def get_schema(db_path, table_name):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table_name})")
    columns = cur.fetchall()
    print(f"Schema for {db_path} '{table_name}':")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "server/cashflow.db"
    table = sys.argv[2] if len(sys.argv) > 2 else "contracts"
    get_schema(db_path, table)
