"""
Database Index Management Script
Creates indexes for better query performance

Usage:
    python scripts/add_indexes.py
"""
import logging
from sqlalchemy import create_engine, text
import sys
import os

# Add parent directory to path to import core modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import DATABASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_indexes():
    """Add database indexes for better performance"""
    logger.info("="*70)
    logger.info("Database Index Creation Script")
    logger.info("="*70)
    
    engine = create_engine(DATABASE_URL)
    
    # Define indexes to create
    indexes = [
        # User indexes
        ("idx_users_email", "users", ["email"]),
        ("idx_users_role", "users", ["role"]),
        ("idx_users_is_active", "users", ["is_active"]),
        
        # Employee indexes
        ("idx_employees_code", "employees", ["code"]),
        ("idx_employees_name", "employees", ["name"]),
        ("idx_employees_department", "employees", ["department_id"]),
        ("idx_employees_status", "employees", ["status"]),
        
        # Attendance indexes
        ("idx_attendance_employee", "attendance_logs", ["employee_id"]),
        ("idx_attendance_date", "attendance_logs", ["check_in_date"]),
        ("idx_attendance_timestamp", "attendance_logs", ["timestamp"]),
        ("idx_attendance_status", "attendance_logs", ["status"]),
        ("idx_attendance_composite", "attendance_logs", ["employee_id", "check_in_date"]),
        
        # Contract indexes
        ("idx_contracts_status", "contracts", ["status"]),
        ("idx_contracts_seller", "contracts", ["seller_id"]),
        ("idx_contracts_buyer", "contracts", ["buyer_id"]),
        ("idx_contracts_date", "contracts", ["contract_date"]),
        
        # Financial transaction indexes
        ("idx_transactions_contract", "financial_transactions", ["contract_id"]),
        ("idx_transactions_date", "financial_transactions", ["transaction_date"]),
        ("idx_transactions_type", "financial_transactions", ["transaction_type"]),
        
        # Department indexes
        ("idx_departments_name", "departments", ["name"]),
        
        # Shift indexes
        ("idx_shifts_name", "shifts", ["name"]),
        
        # RBAC indexes
        ("idx_roles_name", "roles", ["name"]),
        ("idx_permissions_name", "permissions", ["name"]),
        ("idx_user_roles_user", "user_roles", ["user_id"]),
        ("idx_user_roles_role", "user_roles", ["role_id"]),
        ("idx_role_permissions_role", "role_permissions", ["role_id"]),
        ("idx_role_permissions_perm", "role_permissions", ["permission_id"]),
    ]
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    logger.info(f"\nDatabase: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL.split('///')[-1]}")
    logger.info(f"Total indexes to process: {len(indexes)}\n")
    
    with engine.connect() as conn:
        # Check database type
        db_url = str(DATABASE_URL).lower()
        is_postgres = db_url.startswith("postgresql")
        db_type = "PostgreSQL" if is_postgres else "SQLite"
        logger.info(f"Database type: {db_type}\n")
        
        for idx_name, table, columns in indexes:
            try:
                # Check if index exists
                if is_postgres:
                    check_sql = f"SELECT 1 FROM pg_indexes WHERE indexname = '{idx_name}'"
                    result = conn.execute(text(check_sql))
                    exists = result.fetchone() is not None
                else:
                    # SQLite: Check in sqlite_master
                    check_sql = f"SELECT 1 FROM sqlite_master WHERE type='index' AND name='{idx_name}'"
                    result = conn.execute(text(check_sql))
                    exists = result.fetchone() is not None
                
                if not exists:
                    # Create index
                    cols = ", ".join(columns)
                    create_sql = f"CREATE INDEX {idx_name} ON {table} ({cols})"
                    conn.execute(text(create_sql))
                    conn.commit()
                    logger.info(f"✅ Created: {idx_name:40s} on {table}({cols})")
                    created_count += 1
                else:
                    logger.info(f"⏭️  Exists:  {idx_name:40s}")
                    skipped_count += 1
                    
            except Exception as e:
                logger.error(f"❌ Failed:  {idx_name:40s} - {str(e)[:50]}")
                conn.rollback()
                error_count += 1
    
    # Summary
    logger.info("\n" + "="*70)
    logger.info("Index Creation Summary:")
    logger.info(f"  ✅ Created:  {created_count:3d}")
    logger.info(f"  ⏭️  Skipped:  {skipped_count:3d}")
    logger.info(f"  ❌ Errors:   {error_count:3d}")
    logger.info(f"  📊 Total:    {len(indexes):3d}")
    logger.info("="*70)
    
    return created_count, skipped_count, error_count

if __name__ == "__main__":
    logger.info("Starting database index creation...\n")
    
    try:
        created, skipped, errors = add_indexes()
        
        if errors > 0:
            logger.warning(f"\n⚠️  Completed with {errors} errors")
            sys.exit(1)
        else:
            logger.info("\n✅ Index creation completed successfully!")
            sys.exit(0)
            
    except Exception as e:
        logger.exception(f"\n❌ Fatal error: {e}")
        sys.exit(1)
