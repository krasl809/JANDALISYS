from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.auth import require_permission
from models.core_models import Conveyor
from schemas.schemas import Conveyor as ConveyorSchema

router = APIRouter(prefix="/conveyors", tags=["conveyors"])

@router.get("/", response_model=List[ConveyorSchema])
def read_conveyors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Conveyor).offset(skip).limit(limit).all()