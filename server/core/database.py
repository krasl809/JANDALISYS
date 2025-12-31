import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)

# Load environment variables
try:
    from dotenv import load_dotenv
    # Load .env from the server directory
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
    logger.info(f"Loaded environment from: {env_path}")
except ImportError:
    logger.warning("python-dotenv not installed")

# استخدام متغيرات البيئة لبيانات قاعدة البيانات
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# التحقق من عدم وجود بيانات اعتماد مكشوفة في الكود المصدري
if "password=" in DATABASE_URL.lower() and "DATABASE_URL" not in os.environ:
    raise ValueError("DATABASE_URL contains hardcoded credentials")

# Security: Warn if using SQLite in production
if DATABASE_URL.startswith("sqlite://"):
    if os.getenv("ENVIRONMENT") == "production":
        logger.error("⚠️ CRITICAL: SQLite is not recommended for production!")
        logger.error("⚠️ Please use PostgreSQL or MySQL for production environments")
    else:
        logger.warning("⚠️ Using SQLite - Not recommended for production!")

# Production-ready database configuration
engine_kwargs = {
    "pool_pre_ping": True,  # Verify connections before using them
    "echo": os.getenv("DEBUG", "false").lower() == "true",  # SQL logging only in debug mode
}

# Add connection pooling for non-SQLite databases
if not DATABASE_URL.startswith("sqlite://"):
    engine_kwargs.update({
        "poolclass": QueuePool,
        "pool_size": 10,          # Number of persistent connections
        "max_overflow": 20,       # Additional connections when needed
        "pool_timeout": 30,       # Timeout waiting for connection
        "pool_recycle": 3600,     # Recycle connections every hour
    })
    logger.info("Database connection pooling enabled")

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Add connection event listeners for monitoring
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    logger.debug("Database connection established")

@event.listens_for(engine, "close")
def receive_close(dbapi_conn, connection_record):
    logger.debug("Database connection closed")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for database sessions with proper cleanup and error handling"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.exception("Database session error")
        raise
    finally:
        db.close()

def check_db_connection():
    """Health check for database connection"""
    try:
        from sqlalchemy import text
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False