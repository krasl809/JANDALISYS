import os
import sys

# Add current directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from models.core_models import Contract
    print("SUCCESS: Imported Contract from models.core_models")
except Exception as e:
    print(f"FAILED: {e}")

try:
    from crud import crud
    print("SUCCESS: Imported crud")
except Exception as e:
    print(f"FAILED: {e}")
