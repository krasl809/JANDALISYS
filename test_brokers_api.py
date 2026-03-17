
import sys
import os
sys.path.insert(0, os.path.abspath("d:/JANDALISYS-2025/server"))

import requests

BASE_URL = "http://localhost:8000"

def test_brokers_api():
    # First, login to get token
    login_data = {
        "email": "admin@jandali.com",
        "password": "admin123"
    }
    
    try:
        print("Logging in...")
        login_response = requests.post(f"{BASE_URL}/api/login", json=login_data)
        login_response.raise_for_status()
        
        token = login_response.json()["access_token"]
        print(f"Login successful. Token: {token}")
        
        # Get brokers
        headers = {"Authorization": f"Bearer {token}"}
        print("\nCalling brokers endpoint...")
        brokers_response = requests.get(f"{BASE_URL}/api/brokers/", headers=headers)
        brokers_response.raise_for_status()
        
        brokers = brokers_response.json()
        print(f"Success! Found {len(brokers)} brokers:")
        for broker in brokers:
            print(f"- {broker['id']}: {broker['contact_name']}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        if e.response:
            print(f"Status code: {e.response.status_code}")
            print(f"Response: {e.response.text}")

if __name__ == "__main__":
    test_brokers_api()
