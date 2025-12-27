from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from core.database import get_db
from models.core_models import FinancialTransaction
from schemas import schemas
from core.auth import get_current_user, require_permission

router = APIRouter()

@router.get("/", response_model=List[schemas.FinancialTransaction])
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    transaction_type: Optional[str] = None,
    contract_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get all financial transactions with optional filtering"""
    query = db.query(FinancialTransaction)

    if transaction_type:
        query = query.filter(FinancialTransaction.type == transaction_type)

    if contract_id:
        try:
            contract_uuid = uuid.UUID(contract_id)
            query = query.filter(FinancialTransaction.contract_id == contract_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid contract ID")

    transactions = query.order_by(FinancialTransaction.transaction_date.desc()).offset(skip).limit(limit).all()
    return transactions

@router.post("/", response_model=schemas.FinancialTransaction)
def create_transaction(
    transaction: schemas.FinancialTransactionCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_contracts"))
):
    """Create a new financial transaction"""
    db_transaction = FinancialTransaction(**transaction.dict(), created_by=current_user.id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("delete_contracts"))
):
    try:
        uuid_obj = uuid.UUID(transaction_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    transaction = db.query(FinancialTransaction).filter(FinancialTransaction.id == uuid_obj).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Only allow deleting certain transaction types
    allowed_types = ["Partial Pricing", "Invoice"]
    if transaction.type not in allowed_types:
        raise HTTPException(status_code=403, detail=f"Can only delete {', '.join(allowed_types)} transactions")

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted"}
