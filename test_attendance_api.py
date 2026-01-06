import requests

def test_attendance_api():
    login_url = "http://127.0.0.1:8000/api/auth/login"
    login_data = {"email": "admin@jandali.com", "password": "Admin@123"}
    
    print(f"Logging in to {login_url}...")
    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test HR Dashboard
            dashboard_url = "http://127.0.0.1:8000/api/hr/dashboard"
            print(f"Testing HR Dashboard: {dashboard_url}...")
            res_dash = requests.get(dashboard_url, headers=headers)
            print(f"Dashboard Status: {res_dash.status_code}")
            
            # Test Attendance
            attendance_url = "http://127.0.0.1:8000/api/hr/attendance"
            print(f"Testing Attendance: {attendance_url}...")
            res_att = requests.get(attendance_url, headers=headers)
            print(f"Attendance Status: {res_att.status_code}")
            if res_att.status_code == 200:
                data = res_att.json()
                print(f"Attendance Data count: {len(data)}")
            else:
                print(f"Attendance Error: {res_att.text}")
                
        else:
            print(f"Login failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_attendance_api()
