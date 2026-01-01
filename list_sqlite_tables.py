
import sqlite3

SQLITE_DB = "server/cashflow.db"

def list_tables():
    conn = sqlite3.connect(SQLITE_DB)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cur.fetchall()]
    print("Tables in SQLite:")
    for t in sorted(tables):
        print(f" - {t}")
    conn.close()

if __name__ == "__main__":
    list_tables()
