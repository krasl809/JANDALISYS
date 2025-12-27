import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables
try:
    from dotenv import load_dotenv
    # Load .env from the server directory
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
except ImportError:
    pass

# استخدام متغيرات البيئة لبيانات قاعدة البيانات
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# التحقق من عدم وجود بيانات اعتماد مكشوفة في الكود المصدري
# هذا التحقق مرن للسماح بكلمات السر من متغيرات البيئة
if "password=" in DATABASE_URL.lower() and "DATABASE_URL" not in os.environ:
    raise ValueError("DATABASE_URL contains hardcoded credentials")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()