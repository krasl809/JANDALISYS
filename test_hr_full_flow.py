import urllib.request
import urllib.parse
import json

def test_hr_flow():
    base_url = "http://127.0.0.1:8000/api"
    
    # 1. Login
    login_url = f"{base_url}/auth/login"
    login_data = json.dumps({
        "email": "trae_test@example.com",
        "password": "password123"
    }).encode('utf-8')
    
    req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            token = res_data.get("access_token")
            print(f"✅ Login successful. Token: {token[:20]}...")
            
            # 2. Fetch HR Dashboard
            hr_url = f"{base_url}/hr/dashboard"
            hr_req = urllib.request.Request(hr_url, headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            })
            
            with urllib.request.urlopen(hr_req) as hr_response:
                hr_data = json.loads(hr_response.read().decode('utf-8'))
                print(f"✅ HR Dashboard fetched successfully!")
                print(json.dumps(hr_data, indent=2))
                
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_hr_flow()
