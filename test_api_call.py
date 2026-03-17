import requests
import json

# Login first - using email field
login_data = {'email': 'admin@admin.com', 'password': 'admin123'}
try:
    resp = requests.post('http://localhost:8000/api/auth/login', json=login_data, timeout=5)
    with open('api_test_result.txt', 'w') as f:
        f.write(f'Login response: {resp.status_code}\n')
        if resp.status_code == 200:
            token = resp.json().get('access_token')
            headers = {'Authorization': f'Bearer {token}'}
            
            # Get employees
            emp_resp = requests.get('http://localhost:8000/api/hr/employees?limit=0', headers=headers, timeout=5)
            f.write(f'Employees response: {emp_resp.status_code}\n')
            if emp_resp.status_code == 200:
                data = emp_resp.json()
                f.write(f'Employees data keys: {data.keys()}\n')
                f.write(f'Employees count: {len(data.get("employees", []))}\n')
            else:
                f.write(f'Error: {emp_resp.text[:200]}\n')
            
            # Get departments
            dept_resp = requests.get('http://localhost:8000/api/departments', headers=headers, timeout=5)
            f.write(f'Departments response: {dept_resp.status_code}\n')
            if dept_resp.status_code == 200:
                f.write(f'Departments count: {len(dept_resp.json())}\n')
            else:
                f.write(f'Error: {dept_resp.text[:200]}\n')
        else:
            f.write(f'Login failed: {resp.text}')
except Exception as e:
    with open('api_test_result.txt', 'w') as f:
        f.write(f'Error: {e}')
