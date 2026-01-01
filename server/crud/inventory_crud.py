from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
import uuid
from models import core_models
import schemas.schemas as schemas
from fastapi import HTTPException

def generate_note_number(db: Session, type_prefix: str):
    """Generates: DN-OUT-2024-001, DN-IN-2024-001"""
    year = datetime.now().year
    prefix = f"DN-{type_prefix.upper()}-{year}"
    count = db.query(core_models.DeliveryNote).filter(
        core_models.DeliveryNote.note_number.like(f"{prefix}%")
    ).count()
    return f"{prefix}-{str(count + 1).zfill(4)}"

def create_delivery_note(db: Session, note: schemas.DeliveryNoteCreate, user_id: uuid.UUID):
    # Generate Number
    type_code = "TRF" if note.type == "transfer" else ("IN" if note.type == "inbound" else "OUT")
    note_number = generate_note_number(db, type_code)

    db_note = core_models.DeliveryNote(
        note_number=note_number,
        type=note.type,
        status=note.status,
        date=note.date,
        warehouse_id=note.warehouse_id,
        target_warehouse_id=note.target_warehouse_id,
        contract_id=note.contract_id,
        entity_id=note.entity_id,
        notes=note.notes,
        created_by=user_id
    )
    db.add(db_note)
    db.flush() # to get ID

    for item in note.items:
        db_item = core_models.DeliveryNoteItem(
            note_id=db_note.id,
            article_id=item.article_id,
            quantity=item.quantity,
            batch_number=item.batch_number
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_note)
    return db_note

def approve_delivery_note(db: Session, note_id: uuid.UUID, approver_id: uuid.UUID):
    """
    The Critical Function:
    1. Changes status to approved.
    2. Updates Physical Inventory (Snapshot).
    3. Writes to Stock Log (History).
    """
    note = db.query(core_models.DeliveryNote).filter(core_models.DeliveryNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.status == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    # Logic based on type
    if note.type == "inbound":
        _process_stock_movement(db, note, "IN", note.warehouse_id)
    
    elif note.type == "outbound":
        _process_stock_movement(db, note, "OUT", note.warehouse_id)
        
    elif note.type == "transfer":
        # Out from Source
        _process_stock_movement(db, note, "OUT", note.warehouse_id)
        # In to Target
        _process_stock_movement(db, note, "IN", note.target_warehouse_id)

    note.status = "approved"
    note.approved_by = approver_id
    note.approved_at = datetime.now()
    
    db.commit()
    db.refresh(note)
    return note

def _process_stock_movement(db: Session, note: core_models.DeliveryNote, movement_type: str, warehouse_id: uuid.UUID):
    for item in note.items:
        # 1. Get or Create Inventory Record
        inventory = db.query(core_models.Inventory).filter(
            core_models.Inventory.warehouse_id == warehouse_id,
            core_models.Inventory.article_id == item.article_id
        ).first()

        if not inventory:
            inventory = core_models.Inventory(
                warehouse_id=warehouse_id, 
                article_id=item.article_id, 
                quantity_on_hand=0
            )
            db.add(inventory)
            db.flush() # Load into session

        # 2. Update Balance
        if movement_type == "IN":
            inventory.quantity_on_hand = float(inventory.quantity_on_hand) + float(item.quantity)
        else: # OUT
            if float(inventory.quantity_on_hand) < float(item.quantity):
                raise HTTPException(status_code=400, detail=f"Insufficient stock for article {item.article_id}")
            inventory.quantity_on_hand = float(inventory.quantity_on_hand) - float(item.quantity)

        # 3. Log Movement
        log = core_models.StockMovement(
            date=datetime.now(),
            article_id=item.article_id,
            warehouse_id=warehouse_id,
            movement_type=movement_type,
            quantity=item.quantity,
            balance_after=inventory.quantity_on_hand,
            reference_type="delivery_note",
            reference_id=note.id,
            created_by=note.created_by
        )
        db.add(log)

def reserve_stock(db: Session, article_id: uuid.UUID, warehouse_id: uuid.UUID, quantity: float):
    """Adds to reserved_quantity without changing quantity_on_hand"""
    inventory = db.query(core_models.Inventory).filter(
        core_models.Inventory.warehouse_id == warehouse_id,
        core_models.Inventory.article_id == article_id
    ).first()

    if not inventory:
        inventory = core_models.Inventory(
            warehouse_id=warehouse_id,
            article_id=article_id,
            quantity_on_hand=0,
            reserved_quantity=0
        )
        db.add(inventory)
        db.flush()

    inventory.reserved_quantity = float(inventory.reserved_quantity or 0) + float(quantity)
    db.commit()
    return inventory

def release_stock(db: Session, article_id: uuid.UUID, warehouse_id: uuid.UUID, quantity: float):
    """Subtracts from reserved_quantity"""
    inventory = db.query(core_models.Inventory).filter(
        core_models.Inventory.warehouse_id == warehouse_id,
        core_models.Inventory.article_id == article_id
    ).first()

    if inventory:
        inventory.reserved_quantity = max(0, float(inventory.reserved_quantity or 0) - float(quantity))
        db.commit()
    return inventory

def get_stock_card(db: Session, article_id: uuid.UUID, warehouse_id: uuid.UUID = None):
    """Trace specific article movements"""
    query = db.query(core_models.StockMovement).filter(core_models.StockMovement.article_id == article_id)
    if warehouse_id:
        query = query.filter(core_models.StockMovement.warehouse_id == warehouse_id)
    return query.order_by(core_models.StockMovement.date.desc()).all()