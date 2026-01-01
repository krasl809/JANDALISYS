from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from core.database import get_db, engine
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/run-migration")
def run_migration_fix(db: Session = Depends(get_db)):
    alter_statements = [
        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES contract_items(id);",
        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS qty_priced DECIMAL(10, 2);",
        "ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);",
        "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);"
    ]
    with engine.connect() as conn:
        for stmt in alter_statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f"Error executing {stmt}: {e}")
    return {"message": "Migration executed successfully"}
