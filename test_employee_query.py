import sqlite3
conn = sqlite3.connect('cashflow.db')
cursor = conn.cursor()
# Try to query an employee that was causing the error
test_codes = ['5004', '2024', '2026', '2025', '4019', '4018']
for code in test_codes:
    try:
        cursor.execute("SELECT id, code, direct_manager FROM employees WHERE code = ?", (code,))
        row = cursor.fetchone()
        if row:
            print(f"Code {code}: id={row[0]}, direct_manager={row[2]}")
        else:
            print(f"Code {code}: No employee found")
    except Exception as e:
        print(f"Code {code}: Error - {e}")
conn.close()