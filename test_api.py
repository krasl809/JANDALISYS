import requests
import json
import os
from dotenv import load_dotenv

load_dotenv("server/.env")

# The server seems to be running on some port, but I can also check the router code directly.
# However, testing the API is better if possible.
# Since I don't know the exact port (usually 8000 or 5000), I'll check the server startup command.

def test_api():
    base_url = "http://localhost:8000/api"
    login_url = f"{base_url}/auth/login"
    contracts_url = f"{base_url}/contracts/"
    
    try:
        # 1. Login
        print(f"Attempting login to {login_url}...")
        login_data = {
            "email": "admin@jandali.com",
            "password": "Admin@123"
        }
        login_res = requests.post(login_url, json=login_data)
        
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code} - {login_res.text}")
            return
            
        token = login_res.json().get("access_token")
        print("Login successful! Token obtained.")
        
        # 2. Fetch contracts
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Fetching contracts from {contracts_url}...")
        response = requests.get(contracts_url, headers=headers, params={"skip": 0, "limit": 50, "search": "", "tab": 0})
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            contracts = data.get("contracts", [])
            print(f"Contracts found in API: {len(contracts)}")
            if contracts:
                print("First contract sample:")
                print(f"  ID: {contracts[0].get('id')}")
                print(f"  No: {contracts[0].get('contract_no')}")
            print(f"Pagination: {data.get('pagination')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error during API test: {e}")

if __name__ == "__main__":
    test_api()
