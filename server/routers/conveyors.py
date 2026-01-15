from fastapi import APIRouter, Depends, HTTPException
import uuid
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.auth import require_permission
from models.core_models import Conveyor
from schemas.schemas import Conveyor as ConveyorSchema, ConveyorCreate

router = APIRouter(prefix="/conveyors", tags=["conveyors"])

@router.get("/", response_model=List[ConveyorSchema])
def read_conveyors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(require_permission("read_conveyors"))):
    return db.query(Conveyor).offset(skip).limit(limit).all()

@router.post("/", response_model=ConveyorSchema)
def create_conveyor(conveyor: ConveyorCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_conveyors"))):
    try:
        db_conveyor = Conveyor(**conveyor.model_dump())
        db.add(db_conveyor)
        db.commit()
        db.refresh(db_conveyor)
        return db_conveyor
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create conveyor: {str(e)}")

@router.put("/{conveyor_id}", response_model=ConveyorSchema)
def update_conveyor(conveyor_id: uuid.UUID, conveyor: ConveyorCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_conveyors"))):
    try:
        db_conveyor = db.query(Conveyor).filter(Conveyor.id == conveyor_id).first()
        if not db_conveyor:
            raise HTTPException(status_code=404, detail="Conveyor not found")
        for key, value in conveyor.model_dump().items():
            setattr(db_conveyor, key, value)
        db.commit()
        db.refresh(db_conveyor)
        return db_conveyor
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update conveyor: {str(e)}")

@router.delete("/{conveyor_id}")
def delete_conveyor(conveyor_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_conveyors"))):
    try:
        db_conveyor = db.query(Conveyor).filter(Conveyor.id == conveyor_id).first()
        if not db_conveyor:
            raise HTTPException(status_code=404, detail="Conveyor not found")
        db.delete(db_conveyor)
        db.commit()
        return {"message": "Conveyor deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete conveyor: {str(e)}")
