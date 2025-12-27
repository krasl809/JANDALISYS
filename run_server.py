#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run the FastAPI server
"""

import uvicorn
import os
import sys

# Add the server directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

if __name__ == "__main__":
    print("Starting JANDALISYS Server...")
    print("Server will be available at: http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    
    # Run uvicorn directly on the server.main module
    uvicorn.run(
        "server.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )