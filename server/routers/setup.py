from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from core.database import get_db, engine
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/run-migration")
def run_migration_fix(db: Session = Depends(get_db)):
    results = []
    
    # Use different syntax for SQLite vs PostgreSQL
    is_sqlite = "sqlite" in str(engine.url)
    
    statements = [
        # Archive enhancements
        "ALTER TABLE archive_folders ADD COLUMN is_public BOOLEAN DEFAULT 0;" if is_sqlite else "ALTER TABLE archive_folders ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE archive_folders ADD COLUMN description VARCHAR;" if is_sqlite else "ALTER TABLE archive_folders ADD COLUMN IF NOT EXISTS description VARCHAR;",
        "ALTER TABLE archive_files ADD COLUMN description VARCHAR;" if is_sqlite else "ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS description VARCHAR;",
        "ALTER TABLE archive_files ADD COLUMN is_public BOOLEAN DEFAULT 0;" if is_sqlite else "ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;",
        # ACL Table
        """
        CREATE TABLE IF NOT EXISTS archive_folder_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER REFERENCES archive_folders(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            permission_level VARCHAR DEFAULT 'view',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by UUID REFERENCES users(id)
        );
        """ if is_sqlite else """
        CREATE TABLE IF NOT EXISTS archive_folder_permissions (
            id SERIAL PRIMARY KEY,
            folder_id INTEGER REFERENCES archive_folders(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            permission_level VARCHAR DEFAULT 'view',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by UUID REFERENCES users(id)
        );
        """
    ]
    
    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
                results.append(f"Success: {stmt[:50]}...")
            except Exception as e:
                # If column already exists, SQLite will throw an error
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    results.append(f"Skipped (already exists): {stmt[:50]}...")
                else:
                    error_msg = f"Error executing {stmt[:50]}...: {str(e)}"
                    print(error_msg)
                    results.append(error_msg)
                    
    return {"message": "Migration execution finished", "details": results}
