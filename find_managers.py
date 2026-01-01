
import sqlite3
import uuid

SQLITE_DB = "server/cashflow.db"

def find_missing_managers():
    conn = sqlite3.connect(SQLITE_DB)
    cur = conn.cursor()
    
    # Get all manager_ids from warehouses
    cur.execute("SELECT DISTINCT manager_id FROM warehouses")
    manager_ids = [row[0] for row in cur.fetchall() if row[0]]
    
    print(f"Found {len(manager_ids)} manager IDs in warehouses.")
    
    for mid in manager_ids:
        # Check if user exists in SQLite
        # SQLite might store it with or without hyphens
        search_id = mid.replace('-', '') if '-' in mid else mid
        cur.execute("SELECT name, email FROM users WHERE id = ? OR id = ?", (mid, search_id))
        user = cur.fetchone()
        
        if user:
            print(f"User {mid} exists: {user}")
        else:
            print(f"User {mid} NOT found in SQLite users table.")
            
    conn.close()

if __name__ == "__main__":
    find_missing_managers()
