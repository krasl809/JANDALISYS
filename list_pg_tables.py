import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('server/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

def list_tables():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = cur.fetchall()
        print("PostgreSQL Tables:")
        for table in tables:
            print(f"- {table[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_tables()
