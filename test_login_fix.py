#!/usr/bin/env python3
"""
Test script to verify the login fix
"""
import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

# Set environment variables before importing
os.environ['DATABASE_URL'] = 'sqlite:///server/cashflow.db'
os.environ['SECRET_KEY'] = 'your-super-secret-key-for-development-purposes-only-1234567890'

try:
    from main import app
    from fastapi.testclient import TestClient
    
    print("Testing server startup...")
    client = TestClient(app)
    
    print("Testing database connection...")
    db_response = client.get('/api/test-db')
    print(f"Database test - Status: {db_response.status_code}")
    print(f"Database test - Response: {db_response.json()}")
    
    print("\nTesting login endpoint...")
    login_data = {
        'email': 'admin@jandali.com',
        'password': 'Admin@123'
    }
    
    login_response = client.post('/api/auth/login', json=login_data)
    print(f"Login test - Status: {login_response.status_code}")
    print(f"Login test - Response: {login_response.json()}")
    
    if login_response.status_code == 200:
        print("\n✅ LOGIN FIXED! The server is now working correctly.")
    else:
        print(f"\n❌ Login still failing with status {login_response.status_code}")
        
except Exception as e:
    print(f"❌ Error during testing: {e}")
    import traceback
    traceback.print_exc()