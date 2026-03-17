import requests
import sys

def test_contracts():
    url = "http://localhost:8000/api/contracts/"
    params = {
        "skip": 0,
        "limit": 50,
        "search": "",
        "tab": 0,
        "sort_by": "contract_no",
        "sort_dir": "asc"
    }
    try:
        # Note: This might fail if auth is required, but we want to see if it's 401/403 vs 500
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 500:
            print(f"Response: {response.text}")
        else:
            print("Request successful (or at least not 500)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_contracts()
