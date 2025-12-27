#!/usr/bin/env python3
import subprocess
import time
import signal
import os
import sys

def restart_server():
    print("=== FORCED SERVER RESTART ===")
    
    # Get the current directory
    current_dir = os.getcwd()
    print(f"Working directory: {current_dir}")
    
    # Try to find and kill any running Python processes related to our server
    print("Looking for running server processes...")
    
    try:
        # Use tasklist to find Python processes (Windows)
        result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq python.exe'], 
                              capture_output=True, text=True)
        print("Current Python processes:")
        print(result.stdout)
        
        # Kill any processes that might be running our server
        print("Attempting to stop existing server processes...")
        
        # Try to kill processes by name (this is a best effort)
        try:
            subprocess.run(['taskkill', '/F', '/IM', 'python.exe'], 
                         capture_output=True, text=True)
            print("Killed existing Python processes")
        except:
            print("Could not kill Python processes (this is normal)")
            
    except Exception as e:
        print(f"Error checking processes: {e}")
    
    # Wait a moment for processes to stop
    print("Waiting for processes to stop...")
    time.sleep(3)
    
    # Start the server fresh
    print("Starting server with our fixes...")
    
    try:
        # Start the server in the background
        server_process = subprocess.Popen([
            sys.executable, 'run_server.py'
        ], cwd=current_dir)
        
        print(f"Server started with PID: {server_process.pid}")
        print("Waiting for server to initialize...")
        
        # Wait for server to start
        time.sleep(10)
        
        # Test if server is responding
        try:
            import requests
            response = requests.get('http://127.0.0.1:8000/health', timeout=5)
            if response.status_code == 200:
                print("✅ Server is running successfully!")
                print("Testing login endpoint...")
                
                # Test login
                login_data = {
                    "email": "admin@jandali.com",
                    "password": "Admin@123"
                }
                
                login_response = requests.post(
                    'http://127.0.0.1:8000/api/auth/login',
                    json=login_data,
                    timeout=10
                )
                
                print(f"Login response status: {login_response.status_code}")
                print(f"Login response: {login_response.text}")
                
                if login_response.status_code == 200:
                    print("🎉 LOGIN IS NOW WORKING!")
                    return True
                else:
                    print("❌ Login still failing")
                    return False
            else:
                print(f"❌ Server not responding properly: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Could not connect to server: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False

if __name__ == "__main__":
    success = restart_server()
    if success:
        print("\n=== SUCCESS ===")
        print("Server restarted with all fixes applied!")
        print("You can now login with:")
        print("Email: admin@jandali.com")
        print("Password: Admin@123")
    else:
        print("\n=== RESTART FAILED ===")
        print("Please manually restart the server by:")
        print("1. Stopping all Python processes")
        print("2. Running: python run_server.py")