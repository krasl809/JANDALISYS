"""Quick test to check if server can start"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    from models.core_models import Agent
    print("[OK] Agent model imported successfully")
    print(f"Agent table name: {Agent.__tablename__}")
except Exception as e:
    print(f"[ERROR] Error importing Agent: {e}")

try:
    from routers import agents
    print("[OK] Agents router imported successfully")
except Exception as e:
    print(f"[ERROR] Error importing agents router: {e}")

try:
    from main import app
    print("[OK] FastAPI app imported successfully")
    print(f"Routes: {[route.path for route in app.routes]}")
except Exception as e:
    print(f"[ERROR] Error importing app: {e}")
    import traceback
    traceback.print_exc()
