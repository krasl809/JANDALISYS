import requests

def test_survey_api():
    # Login to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {
        "email": "admin@jandali.com",
        "password": "Admin@123"
    }
    
    try:
        print("Testing login endpoint...")
        login_response = requests.post(login_url, json=login_data)
        login_response.raise_for_status()  # Raises exception for 4xx/5xx status codes
        
        print(f"Login successful: {login_response.status_code}")
        token = login_response.json()["access_token"]
        print(f"Token received: {token[:20]}...")
        
        # Test surveys endpoint
        surveys_url = "http://localhost:8000/api/surveys?page=1&limit=12"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        print("\nTesting surveys endpoint...")
        surveys_response = requests.get(surveys_url, headers=headers)
        surveys_response.raise_for_status()
        
        print(f"Surveys endpoint successful: {surveys_response.status_code}")
        data = surveys_response.json()
        print(f"Response data: {data}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        if e.response:
            print(f"Status code: {e.response.status_code}")
            print(f"Response body: {e.response.text}")

if __name__ == "__main__":
    test_survey_api()
