import sqlite3

# Test the original query that was failing
conn = sqlite3.connect('cashflow.db')
cursor = conn.cursor()

# Try to query an employee that was causing the error with the full column list
test_codes = ['5004', '2024', '2026', '2025', '4019', '4018', '3017']
for code in test_codes:
    try:
        cursor.execute("""
            SELECT employees.id AS employees_id, employees.code AS employees_code, 
                   employees.first_name AS employees_first_name, employees.last_name AS employees_last_name, 
                   employees.full_name AS employees_full_name, employees.work_email AS employees_work_email, 
                   employees.department_id AS employees_department_id, employees.department_name AS employees_department_name, 
                   employees.company AS employees_company, employees.position AS employees_position, 
                   employees.joining_date AS employees_joining_date, employees.status AS employees_status, 
                   employees.employment_type AS employees_employment_type, employees.user_id AS employees_user_id, 
                   employees.phone AS employees_phone, employees.address AS employees_address, 
                   employees.direct_manager AS employees_direct_manager, employees.facility_manager AS employees_facility_manager, 
                   employees.central_manager AS employees_central_manager, employees.hr_manager AS employees_hr_manager, 
                   employees.ceo AS employees_ceo, employees.remaining_leave_balance AS employees_remaining_leave_balance, 
                   employees.beginning_year_leave_balance AS employees_beginning_year_leave_balance, 
                   employees.created_at AS employees_created_at, employees.updated_at AS employees_updated_at 
            FROM employees WHERE employees.code = ? LIMIT ? OFFSET ?
        """, (code, 1, 0))
        row = cursor.fetchone()
        if row:
            print(f"Code {code}: SUCCESS - Found employee with remaining_leave_balance = {row[18]}")
        else:
            print(f"Code {code}: No employee found")
    except Exception as e:
        print(f"Code {code}: Error - {e}")

conn.close()