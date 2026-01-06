from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
from core.database import get_db
from schemas import schemas
from crud import inventory_crud
from core.auth import get_current_user, require_permission
from models import core_models
from services.notification_service import NotificationService
from ws_manager import manager

router = APIRouter()

import logging
logger = logging.getLogger(__name__)

# --- Warehouses ---
@router.post("/warehouses/", response_model=schemas.Warehouse)
def create_warehouse(wh: schemas.WarehouseCreate, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_inventory"))):
    try:
        db_wh = core_models.Warehouse(**wh.dict())
        db.add(db_wh)
        db.commit()
        db.refresh(db_wh)
        return db_wh
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create warehouse")

@router.get("/warehouses/", response_model=List[schemas.Warehouse])
def get_warehouses(db: Session = Depends(get_db), current_user=Depends(require_permission("view_inventory"))):
    logger.error(f"DEBUG: get_warehouses called by {current_user.email}")
    return db.query(core_models.Warehouse).filter(core_models.Warehouse.is_active.is_(True)).all()

# --- Stock/Inventory ---
@router.get("/stock/{warehouse_id}", response_model=List[schemas.Inventory])
def get_warehouse_stock(warehouse_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        stock = db.query(core_models.Inventory).filter(core_models.Inventory.warehouse_id == warehouse_id).all()
        # Enrich with article names for UI
        for s in stock:
            s.article_name = s.article.article_name
        return stock
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve warehouse stock")

# --- Delivery Notes (Operations) ---
@router.post("/delivery-notes", response_model=schemas.DeliveryNote)
async def create_note(note: schemas.DeliveryNoteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_note = inventory_crud.create_delivery_note(db, note, user.id)
    
    # Create notification
    await NotificationService.create_inventory_notification(
        db, user.id, db_note.id, "delivery_note_created", db_note.note_number
    )
    
    return db_note

@router.post("/delivery-notes/{id}/approve")
async def approve_note(id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # RBAC Check
    if user.role not in ['admin', 'warehouse_manager']:
        raise HTTPException(status_code=403, detail="Only Warehouse Managers can approve stock movements")
    
    db_note = inventory_crud.approve_delivery_note(db, id, user.id)
    
    # Create notification
    await NotificationService.create_inventory_notification(
        db, user.id, db_note.id, "delivery_note_approved", db_note.note_number
    )
    
    return db_note

@router.get("/stock-card/{article_id}")
def get_article_history(article_id: uuid.UUID, warehouse_id: uuid.UUID = None, db: Session = Depends(get_db)):
    try:
        return inventory_crud.get_stock_card(db, article_id, warehouse_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve stock card")