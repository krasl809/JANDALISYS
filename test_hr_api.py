import requests

def test_hr_dashboard():
    url = "http://127.0.0.1:8000/api/hr/dashboard"
    # We need a token. Let's try to get one or use a dummy if the server allows (it probably doesn't)
    # Since I don't have a valid token handy, I'll look for one in the database or use the admin credentials
    
    print(f"Testing {url}...")
    try:
        # First, try to login
        login_url = "http://127.0.0.1:8000/api/auth/login"
        login_data = {"email": "admin@jandali.com", "password": "Admin@123"}
        
        response = requests.post(login_url, json=login_data)
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            res = requests.get(url, headers=headers)
            print(f"Status Code: {res.status_code}")
            print(f"Response: {res.text}")
        else:
            print(f"Login failed: {response.status_code} {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_hr_dashboard()
