import os
import sys

# Add the server directory to Python path
sys.path.insert(0, os.path.join(os.getcwd(), 'server'))

from main import app

print("Listing all registered routes:")
for route in app.routes:
    if hasattr(route, 'path'):
        methods = getattr(route, 'methods', [])
        print(f"{list(methods)} {route.path}")
