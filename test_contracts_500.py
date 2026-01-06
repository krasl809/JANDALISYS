import sys
import os
import requests

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

BASE_URL = "http://127.0.0.1:8000"

def test_contracts_api():
    print("Logging in...")
    login_data = {
        'email': 'admin@jandali.com',
        'password': 'Admin@123'
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} - {response.text}")
        return
    
    token = response.json().get("access_token")
    print(f"Login successful. Token: {token[:10]}...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print("\nFetching contracts...")
    response = requests.get(f"{BASE_URL}/api/contracts/?skip=0&limit=50&search=&tab=0", headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success!")
        print(f"Data: {response.json().get('pagination')}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_contracts_api()
