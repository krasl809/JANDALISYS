
import sys
import os
sys.path.insert(0, os.path.abspath("d:/JANDALISYS-2025/server"))

from core.database import SessionLocal, engine
import models.core_models as core_models
from core.database import Base

# Test connection to database
try:
    db = SessionLocal()
    print("OK Database connection successful")
    
    # Test querying brokers
    print("\nQuerying brokers table:")
    brokers = db.query(core_models.Broker).all()
    print(f"Found {len(brokers)} brokers")
    
    if brokers:
        for broker in brokers:
            print(f"- {broker.id}: {broker.contact_name}")
    else:
        print("WARNING: No brokers found in the table")
        
    db.close()
    print("\nOK Query completed successfully")
    
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    print(traceback.format_exc())
