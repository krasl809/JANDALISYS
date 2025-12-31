
import requests
import json

def test_archive_stats():
    login_url = "http://localhost:8000/api/auth/login"
    stats_url = "http://localhost:8000/api/archive/stats"
    
    login_data = {
        "email": "admin@jandali.com",
        "password": "Admin@123"
    }
    
    try:
        print(f"Attempting login to {login_url}...")
        login_res = requests.post(login_url, json=login_data)
        
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code}")
            print(login_res.text)
            return

        token = login_res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"Fetching archive stats from {stats_url}...")
        response = requests.get(stats_url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            stats = response.json()
            print(f"Archive Stats:")
            print(f"  Total Folders: {stats.get('total_folders')}")
            print(f"  Total Files: {stats.get('total_files')}")
            print(f"  Total Size: {stats.get('total_size')}")
            print(f"  Files by Ext: {stats.get('files_by_ext')}")
            print(f"  Monthly Stats: {stats.get('monthly_stats')}")
            print(f"  Activity Count: {len(stats.get('activity', []))}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error during API test: {e}")

if __name__ == "__main__":
    test_archive_stats()
