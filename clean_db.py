import psycopg2
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv('server/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

def clean_database():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        logger.info("Dropping public schema to clean database...")
        cur.execute("DROP SCHEMA public CASCADE")
        cur.execute("CREATE SCHEMA public")
        cur.execute("GRANT ALL ON SCHEMA public TO postgres")
        cur.execute("GRANT ALL ON SCHEMA public TO public")
        
        logger.info("Database cleaned successfully.")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error cleaning database: {e}")
        return False

if __name__ == "__main__":
    clean_database()
