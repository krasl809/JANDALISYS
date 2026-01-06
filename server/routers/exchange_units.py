
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from core.database import get_db
from schemas import schemas
from models.core_models import ExchangeQuoteUnit
from core.auth import get_current_user, require_permission

router = APIRouter()

@router.get("/", response_model=List[schemas.ExchangeQuoteUnit])
def get_exchange_units(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Get all available exchange quote units and their conversion factors.
    """
    return db.query(ExchangeQuoteUnit).all()

@router.post("/", response_model=schemas.ExchangeQuoteUnit)
def create_exchange_unit(
    unit_data: schemas.ExchangeQuoteUnitCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_settings"))
):
    """
    Create a new exchange quote unit.
    """
    db_unit = ExchangeQuoteUnit(**unit_data.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.get("/{unit_id}", response_model=schemas.ExchangeQuoteUnit)
def get_exchange_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Get a specific exchange quote unit by ID.
    """
    unit = db.query(ExchangeQuoteUnit).filter(ExchangeQuoteUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Exchange quote unit not found")
    return unit

@router.put("/{unit_id}", response_model=schemas.ExchangeQuoteUnit)
def update_exchange_unit(
    unit_id: uuid.UUID,
    unit_data: schemas.ExchangeQuoteUnitUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_settings"))
):
    """
    Update an exchange quote unit.
    """
    db_unit = db.query(ExchangeQuoteUnit).filter(ExchangeQuoteUnit.id == unit_id).first()
    if not db_unit:
        raise HTTPException(status_code=404, detail="Exchange quote unit not found")
    
    update_data = unit_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_unit, key, value)
    
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.delete("/{unit_id}")
def delete_exchange_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_settings"))
):
    """
    Delete an exchange quote unit.
    """
    db_unit = db.query(ExchangeQuoteUnit).filter(ExchangeQuoteUnit.id == unit_id).first()
    if not db_unit:
        raise HTTPException(status_code=404, detail="Exchange quote unit not found")
    
    db.delete(db_unit)
    db.commit()
    return {"message": "Exchange quote unit deleted successfully"}
