from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from core.database import get_db, engine
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/run-migration")
def run_migration_fix(db: Session = Depends(get_db)):
    """
    Temporary endpoint to run database ALTER statements
    to fix missing columns for financial_transactions.
    """
    try:
        alter_statements = [
            # Add item_id column
            """
            ALTER TABLE financial_transactions 
            ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES contract_items(id);
            """,
            # Add qty_priced column
            """
            ALTER TABLE financial_transactions 
            ADD COLUMN IF NOT EXISTS qty_priced DECIMAL(10, 2);
            """,
            # Add unit_price column
            """
            ALTER TABLE financial_transactions 
            ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);
            """
        ]
        
        with engine.connect() as conn:
            for stmt in alter_statements:
                conn.execute(text(stmt))
                conn.commit()
                
        return {"message": "Migration executed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
