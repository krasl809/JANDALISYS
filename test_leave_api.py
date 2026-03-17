import requests
try:
    r = requests.get('http://localhost:8000/api/leave/leave/requests?page_size=5', timeout=3)
    with open('test_leave_api.txt', 'w') as f:
        f.write(f'Status: {r.status_code}\n')
        f.write(f'Response: {r.text[:1000]}')
except Exception as e:
    with open('test_leave_api.txt', 'w') as f:
        f.write(f'Error: {str(e)}')
