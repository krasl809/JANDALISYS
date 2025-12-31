"""
Automated Database Backup Script
Creates PostgreSQL backups with automatic cleanup of old backups

Usage:
    python scripts/backup_database.py
    
Environment Variables:
    BACKUP_DIR: Directory for backups (default: ./backups)
    DB_HOST: Database host (default: localhost)
    DB_PORT: Database port (default: 5432)
    DB_NAME: Database name
    DB_USER: Database user
    BACKUP_RETENTION_DAYS: Days to keep backups (default: 30)
"""
import os
import subprocess
from datetime import datetime
import logging
from pathlib import Path
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
BACKUP_DIR = os.getenv("BACKUP_DIR", "./backups")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "jandalisys_prod")
DB_USER = os.getenv("DB_USER", "jandalisys_user")
RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))

def backup_database():
    """Create PostgreSQL backup"""
    logger.info("="*70)
    logger.info("Database Backup Script")
    logger.info("="*70)
    logger.info(f"Database: {DB_NAME}@{DB_HOST}:{DB_PORT}")
    logger.info(f"User: {DB_USER}")
    logger.info(f"Backup Directory: {BACKUP_DIR}")
    logger.info(f"Retention: {RETENTION_DAYS} days")
    logger.info("="*70)
    
    try:
        # Create backup directory
        Path(BACKUP_DIR).mkdir(parents=True, exist_ok=True)
        logger.info(f"\n✅ Backup directory ready: {BACKUP_DIR}")
        
        # Generate backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{BACKUP_DIR}/backup_{DB_NAME}_{timestamp}.sql"
        
        # Run pg_dump
        cmd = [
            "pg_dump",
            "-h", DB_HOST,
            "-p", DB_PORT,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-F", "c",  # Custom format (compressed)
            "-f", backup_file
        ]
        
        logger.info(f"\n🔄 Starting backup: {os.path.basename(backup_file)}")
        logger.info(f"   Command: {' '.join(cmd[:7])}...")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={**os.environ, 'PGPASSWORD': os.getenv('DB_PASSWORD', '')}
        )
        
        if result.returncode == 0:
            # Check file size
            if os.path.exists(backup_file):
                size_mb = os.path.getsize(backup_file) / (1024 * 1024)
                logger.info(f"✅ Backup successful!")
                logger.info(f"   File: {backup_file}")
                logger.info(f"   Size: {size_mb:.2f} MB")
                
                # Clean old backups
                cleanup_old_backups()
                
                return backup_file
            else:
                logger.error(f"❌ Backup file not created: {backup_file}")
                return None
        else:
            logger.error(f"❌ Backup failed!")
            logger.error(f"   Return code: {result.returncode}")
            if result.stderr:
                logger.error(f"   Error: {result.stderr}")
            return None
            
    except FileNotFoundError:
        logger.error("❌ pg_dump not found! Please install PostgreSQL client tools.")
        logger.error("   Ubuntu/Debian: sudo apt install postgresql-client")
        logger.error("   Windows: Install PostgreSQL from postgresql.org")
        return None
    except Exception as e:
        logger.exception(f"❌ Backup error: {e}")
        return None

def cleanup_old_backups():
    """Remove backups older than RETENTION_DAYS"""
    logger.info(f"\n🗑️  Cleaning up backups older than {RETENTION_DAYS} days...")
    
    try:
        import time
        now = time.time()
        retention_seconds = RETENTION_DAYS * 86400
        
        removed_count = 0
        total_size = 0
        
        for filename in os.listdir(BACKUP_DIR):
            if not filename.startswith("backup_"):
                continue
                
            filepath = os.path.join(BACKUP_DIR, filename)
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)
                if file_age > retention_seconds:
                    size = os.path.getsize(filepath)
                    os.remove(filepath)
                    logger.info(f"   Removed: {filename} ({size/(1024*1024):.2f} MB)")
                    removed_count += 1
                    total_size += size
        
        if removed_count > 0:
            logger.info(f"✅ Removed {removed_count} old backup(s), freed {total_size/(1024*1024):.2f} MB")
        else:
            logger.info(f"✅ No old backups to remove")
            
    except Exception as e:
        logger.error(f"❌ Cleanup error: {e}")

def list_backups():
    """List all available backups"""
    logger.info("\n📁 Available backups:")
    
    try:
        backups = []
        for filename in os.listdir(BACKUP_DIR):
            if filename.startswith("backup_"):
                filepath = os.path.join(BACKUP_DIR, filename)
                size = os.path.getsize(filepath) / (1024 * 1024)
                mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                backups.append((filename, size, mtime))
        
        if backups:
            backups.sort(key=lambda x: x[2], reverse=True)
            for filename, size, mtime in backups:
                logger.info(f"   {filename:50s} {size:8.2f} MB  {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"\n   Total backups: {len(backups)}")
        else:
            logger.info("   No backups found")
            
    except FileNotFoundError:
        logger.info(f"   Backup directory not found: {BACKUP_DIR}")
    except Exception as e:
        logger.error(f"   Error listing backups: {e}")

if __name__ == "__main__":
    logger.info("\n" + "="*70)
    logger.info("JANDALISYS - Database Backup Utility")
    logger.info("="*70 + "\n")
    
    # Check if list mode
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        list_backups()
        sys.exit(0)
    
    try:
        backup_file = backup_database()
        
        if backup_file:
            logger.info("\n" + "="*70)
            logger.info("✅ Backup completed successfully!")
            logger.info("="*70)
            sys.exit(0)
        else:
            logger.error("\n" + "="*70)
            logger.error("❌ Backup failed!")
            logger.error("="*70)
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Backup cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"\n❌ Fatal error: {e}")
        sys.exit(1)
