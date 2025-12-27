from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models import department_models
from core.auth import get_current_user_obj

router = APIRouter(tags=["Departments & Positions"])

@router.get("/departments")
def get_departments(db: Session = Depends(get_db), current_user = Depends(get_current_user_obj)):
    return db.query(department_models.Department).all()

@router.get("/positions")
def get_positions(db: Session = Depends(get_db), current_user = Depends(get_current_user_obj)):
    return db.query(department_models.Position).all()
