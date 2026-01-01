from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from core.database import get_db
from models.core_models import BankAccount
from core.auth import get_current_user

router = APIRouter()

# Pydantic schemas
class BankAccountBase(BaseModel):
    account_name: str
    account_number: str
    bank_name: str
    currency: str = "USD"
    branch: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None
    is_active: bool = True

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountResponse(BankAccountBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/bank-accounts/", response_model=List[BankAccountResponse])
def read_bank_accounts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all bank accounts.
    """
    try:
        bank_accounts = db.query(BankAccount).filter(BankAccount.is_active == True).offset(skip).limit(limit).all()
        return bank_accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve bank accounts: {str(e)}")

@router.post("/bank-accounts/", response_model=BankAccountResponse)
def create_bank_account(
    bank_account: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new bank account.
    """
    try:
        # Check if account number already exists
        existing = db.query(BankAccount).filter(BankAccount.account_number == bank_account.account_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bank account number already exists")

        db_bank_account = BankAccount(**bank_account.model_dump())
        db.add(db_bank_account)
        db.commit()
        db.refresh(db_bank_account)
        return db_bank_account
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create bank account: {str(e)}")

@router.put("/bank-accounts/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: str,
    bank_account: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update a bank account.
    """
    try:
        account_uuid = uuid.UUID(account_id)
        db_bank_account = db.query(BankAccount).filter(BankAccount.id == account_uuid).first()
        if not db_bank_account:
            raise HTTPException(status_code=404, detail="Bank account not found")

        # Check if account number is being changed and if it conflicts
        if bank_account.account_number != db_bank_account.account_number:
            existing = db.query(BankAccount).filter(
                BankAccount.account_number == bank_account.account_number,
                BankAccount.id != account_uuid
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Bank account number already exists")

        for key, value in bank_account.model_dump().items():
            setattr(db_bank_account, key, value)

        db.commit()
        db.refresh(db_bank_account)
        return db_bank_account
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update bank account: {str(e)}")

@router.delete("/bank-accounts/{account_id}")
def delete_bank_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Soft delete a bank account (set is_active to False).
    """
    try:
        account_uuid = uuid.UUID(account_id)
        db_bank_account = db.query(BankAccount).filter(BankAccount.id == account_uuid).first()
        if not db_bank_account:
            raise HTTPException(status_code=404, detail="Bank account not found")

        db_bank_account.is_active = False
        db.commit()
        return {"message": "Bank account deactivated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete bank account: {str(e)}")