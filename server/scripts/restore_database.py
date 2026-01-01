"""
Database Restore Script
Restores PostgreSQL backups created with backup_database.py

Usage:
    python scripts/restore_database.py <path_to_backup_file>

Environment Variables:
    DB_HOST: Database host (default: localhost)
    DB_PORT: Database port (default: 5432)
    DB_NAME: Database name (default from .env)
    DB_USER: Database user (default from .env)
"""
import os
import subprocess
import sys
import logging
from pathlib import Path

# Add parent directory to path to import core modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def restore_database(backup_path):
    """Restore PostgreSQL database from backup"""
    if not os.path.exists(backup_path):
        logger.error(f"❌ Backup file not found: {backup_path}")
        return False

    # Try to load environment variables
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        load_dotenv(env_path)
    except ImportError:
        pass

    # Extract DB info from DATABASE_URL if available
    db_url = os.getenv("DATABASE_URL", "")
    import re
    # postgresql://user:password@host:port/dbname
    match = re.match(r"postgresql://(.*?):(.*?)@(.*?):(.*?)/(.*)", db_url)
    
    if match:
        db_user = match.group(1)
        db_password = match.group(2)
        db_host = match.group(3)
        db_port = match.group(4)
        db_name = match.group(5)
    else:
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "cashflow_db")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "123456")

    logger.info("="*70)
    logger.info("Database Restore Script")
    logger.info("="*70)
    logger.info(f"Target Database: {db_name}@{db_host}:{db_port}")
    logger.info(f"Backup File: {backup_path}")
    logger.info("="*70)

    # Determine if it's a custom format (compressed) or plain SQL
    # Check file header or extension
    is_custom = False
    try:
        with open(backup_path, 'rb') as f:
            header = f.read(5)
            if header.startswith(b'PGDMP'):
                is_custom = True
    except:
        is_custom = backup_path.endswith('.sql') == False or backup_path.endswith('.bak')
    
    logger.info(f"Detected format: {'Custom (Compressed)' if is_custom else 'Plain SQL'}")
    
    # Common PostgreSQL paths on Windows
    pg_bin_paths = [
        r"C:\Program Files\PostgreSQL\18\bin",
        r"C:\Program Files\PostgreSQL\17\bin",
        r"C:\Program Files\PostgreSQL\16\bin",
        r"C:\Program Files\PostgreSQL\15\bin"
    ]
    
    def find_tool(tool_name):
        # Try system path first
        import shutil
        path = shutil.which(tool_name)
        if path: return path
        
        # Try common Windows paths
        for p in pg_bin_paths:
            full_path = os.path.join(p, tool_name + ".exe")
            if os.path.exists(full_path):
                return full_path
        return tool_name # Fallback to name

    if is_custom:
        tool = find_tool("pg_restore")
        cmd = [
            tool,
            "-h", db_host,
            "-p", db_port,
            "-U", db_user,
            "-d", db_name,
            "--clean",  # Drop existing objects before creating
            "--if-exists",
            "--no-owner", # Skip restoration of object ownership
            backup_path
        ]
    else:
        # For plain SQL files
        tool = find_tool("psql")
        cmd = [
            tool,
            "-h", db_host,
            "-p", db_port,
            "-U", db_user,
            "-d", db_name,
            "-f", backup_path
        ]

    try:
        logger.info(f"\n🔄 Starting restore...")
        
        # Set password in environment
        env = os.environ.copy()
        env['PGPASSWORD'] = db_password
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env
        )
        
        if result.returncode == 0:
            logger.info("✅ Database restoration successful!")
            return True
        else:
            logger.error("❌ Restoration failed!")
            if result.stderr:
                logger.error(f"Full Error Output:\n{result.stderr}")
            if result.stdout:
                logger.info(f"Output:\n{result.stdout}")
            return False
            
    except FileNotFoundError:
        logger.error("❌ PostgreSQL client tools (pg_restore/psql) not found!")
        return False
    except Exception as e:
        logger.exception(f"❌ Restore error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/restore_database.py <path_to_backup_file>")
        sys.exit(1)
    
    success = restore_database(sys.argv[1])
    sys.exit(0 if success else 1)
