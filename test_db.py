from sqlalchemy import create_engine, text
import os

DATABASE_URL = "sqlite:///./server/cashflow.db"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT count(*) FROM users"))
        print(f"Users count: {result.scalar()}")
        
        result = connection.execute(text("SELECT count(*) FROM notifications"))
        print(f"Notifications count: {result.scalar()}")
except Exception as e:
    print(f"Error: {e}")
