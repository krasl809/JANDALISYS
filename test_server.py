import requests
try:
    r = requests.get('http://localhost:8000/api/hr/employees?limit=1', timeout=3)
    with open('test_server.txt', 'w') as f:
        f.write(f'Status: {r.status_code}\n')
        f.write(f'Response: {r.text[:500]}')
except Exception as e:
    with open('test_server.txt', 'w') as f:
        f.write(f'Error: {str(e)}')
