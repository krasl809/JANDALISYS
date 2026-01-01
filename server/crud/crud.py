# server/crud/crud.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid
import logging
from typing import Optional, List

# Import models and schemas
from models.core_models import Contract, ContractItem, Conveyor, Notification
from schemas.schemas import ContractCreate, NotificationCreate, NotificationUpdate

# Setup logging
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------

def get_contract_by_id(db: Session, contract_id: uuid.UUID) -> Optional[Contract]:
    """Get contract by ID with all relationships - optimized to avoid N+1 queries"""
    from sqlalchemy.orm import joinedload, selectinload
    contract = db.query(Contract)\
        .options(
            selectinload(Contract.items).selectinload(ContractItem.article)
        )\
        .filter(Contract.id == contract_id)\
        .first()

    # Article names are available through the relationship property
    # No need to manually assign - the article_name property handles this
    return contract

def get_contracts(db: Session, skip: int = 0, limit: int = 50) -> tuple[List[Contract], int]:
    """Get list of contracts with pagination - optimized version"""
    # Get total count (cached for better performance)
    total_count = db.query(func.count(Contract.id)).scalar()

    # Get paginated results with ordering for consistent pagination
    # Use selectinload to avoid N+1 queries for items and articles
    from sqlalchemy.orm import selectinload
    contracts = db.query(Contract)\
        .options(selectinload(Contract.items).selectinload(ContractItem.article))\
        .order_by(Contract.modified_date.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    logger.info(f"Fetched {len(contracts)} contracts from DB. Total count: {total_count}")
    return contracts, total_count

def get_conveyors(db: Session, skip: int = 0, limit: int = 100) -> List[Conveyor]:
    """Get list of conveyors for dropdown lists"""
    return db.query(Conveyor).offset(skip).limit(limit).all()

def generate_contract_number(db: Session, seller_code: str = "SELL") -> str:
    """
    Generate automatic contract number in format: SELLYYMM0001
    Based on seller code + year and month + sequence
    Fixed SQL injection vulnerability by using parameterized queries
    """
    today = datetime.now()
    year_month = today.strftime("%y%m")  # Example: 2411
    
    # Sanitize seller_code to prevent SQL injection
    sanitized_seller_code = ''.join(c for c in seller_code if c.isalnum())
    if len(sanitized_seller_code) > 10:
        sanitized_seller_code = sanitized_seller_code[:10]
    
    # Create the pattern for LIKE query using proper parameterization
    pattern = f"{sanitized_seller_code}{year_month}%"
    
    # Find last contract for this seller in this month using safe query
    last_contract = db.query(Contract).filter(
        Contract.contract_no.like(pattern)
    ).order_by(Contract.contract_no.desc()).first()
    
    next_num = 1
    if last_contract and last_contract.contract_no:
        try:
            # Extract serial number safely
            contract_no = last_contract.contract_no
            if contract_no.startswith(f"{sanitized_seller_code}{year_month}"):
                serial_part = contract_no[len(sanitized_seller_code) + len(year_month):]
                if len(serial_part) == 4 and serial_part.isdigit():
                    last_num = int(serial_part)
                    next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
            
    return f"{sanitized_seller_code}{year_month}{next_num:04d}"

def calculate_item_total(item_data, contract_type: str) -> tuple:
    """
    Calculate item quantity and total price.
    Returns: (quantity, total_price)
    
    This helper reduces code duplication between create_contract and update_contract.
    """
    qty = float(item_data.qty_ton or item_data.quantity or 0)
    price = float(item_data.price or 0)
    premium = float(item_data.premium or 0)
    
    # For stock_market contracts, add premium to price
    final_unit_price = price + premium if contract_type == 'stock_market' else price
    total = qty * final_unit_price
    
    return qty, total

def create_contract_item(contract_id: uuid.UUID, item_data, qty: float, total: float) -> ContractItem:
    """
    Create a ContractItem object from item data.
    This helper reduces code duplication.
    """
    return ContractItem(
        contract_id=contract_id,
        article_id=item_data.article_id,
        qty_lot=item_data.qty_lot,
        qty_ton=item_data.qty_ton,
        quantity=qty,
        premium=item_data.premium,
        packing=item_data.packing,
        price=item_data.price,
        total=total
    )

# ---------------------------------------------------------
# Create Operation
# ---------------------------------------------------------

def create_contract(db: Session, contract: ContractCreate, user_id: uuid.UUID) -> Contract:
    """Create new contract with its items"""
    try:
        # 1. Process contract number
        contract_no = contract.contract_no

        # If frontend didn't send number, generate one
        if not contract_no:
            contract_no = generate_contract_number(db, "CNT")

        # 2. Create contract object
        db_contract = Contract(
            contract_no=contract_no,
            direction=contract.direction,
            status=contract.status,
            issue_date=contract.issue_date,
            shipment_date=contract.shipment_date,
            contract_currency=contract.contract_currency,
            
            # Parties
            seller_id=contract.seller_id,
            shipper_id=contract.shipper_id,
            buyer_id=contract.buyer_id,
            broker_id=contract.broker_id,
            conveyor_id=contract.conveyor_id,
            
            # Terms
            payment_terms=contract.payment_terms,
            incoterms=contract.incoterms,
            destination=contract.destination,
            
            # Warehouse for reservation
            warehouse_id=contract.warehouse_id,
            
            # Additional details - FIXED: Added missing fields
            bank_details=contract.bank_details,
            insurance=contract.insurance,
            marks=contract.marks,
            consignee=contract.consignee,
            documents=contract.documents,
            port_of_loading=contract.port_of_loading,
            place_of_origin=contract.place_of_origin,
            place_of_delivery=contract.place_of_delivery,
            
            # Charter Party fields
            contract_type=contract.contract_type,
            demurrage_rate=contract.demurrage_rate,
            discharge_rate=contract.discharge_rate,
            dispatch_rate=contract.dispatch_rate,
            laycan_date_from=contract.laycan_date_from,
            laycan_date_to=contract.laycan_date_to,

            # System data
            created_by=user_id,
            posted_date=func.now() if contract.status == "posted" else None
        )
        
        db.add(db_contract)
        db.commit()
        db.refresh(db_contract)

        # 3. Add contract items
        if contract.items:
            for item_data in contract.items:
                qty, total = calculate_item_total(item_data, contract.contract_type)
                db_item = create_contract_item(db_contract.id, item_data, qty, total)
                db.add(db_item)

            db.commit()
            db.refresh(db_contract)

        return db_contract
        
    except Exception as e:
        logger.error(f"Failed to create contract: {e}")
        db.rollback()
        raise e

# ---------------------------------------------------------
# Update Operation
# ---------------------------------------------------------

def update_contract(db: Session, contract_id: uuid.UUID, contract: ContractCreate) -> Optional[Contract]:
    """Update existing contract"""
    try:
        db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not db_contract:
            return None
        
        # 1. Update basic fields
        update_data = contract.dict(exclude={'items', 'created_at', 'created_by', 'posted_date'})
        
        for key, value in update_data.items():
            if value is not None:
                setattr(db_contract, key, value)
        
        # Special logic when converting to Posted for first time
        if contract.status == "posted" and not db_contract.posted_date:
            db_contract.posted_date = func.now()
            if not db_contract.contract_no:
                db_contract.contract_no = generate_contract_number(db, "CNT")
        
        # 2. Update items smartly
        existing_items = db.query(ContractItem).filter(ContractItem.contract_id == contract_id).all()
        existing_items_dict = {str(item.id): item for item in existing_items}
        
        incoming_item_ids = set()
        
        if contract.items:
            for item_data in contract.items:
                qty, total = calculate_item_total(item_data, contract.contract_type)
                item_id_str = str(item_data.id) if hasattr(item_data, 'id') and item_data.id else None
                
                if item_id_str and item_id_str in existing_items_dict:
                    # Update existing item
                    db_item = existing_items_dict[item_id_str]
                    db_item.article_id = item_data.article_id
                    db_item.qty_lot = item_data.qty_lot
                    db_item.qty_ton = item_data.qty_ton
                    db_item.quantity = qty
                    db_item.premium = item_data.premium
                    db_item.packing = item_data.packing
                    db_item.price = item_data.price
                    db_item.total = total
                    incoming_item_ids.add(item_id_str)
                else:
                    # Add new item
                    db_item = create_contract_item(contract_id, item_data, qty, total)
                    db.add(db_item)
        
        # Delete items that are no longer present
        for eid, item in existing_items_dict.items():
            if eid not in incoming_item_ids:
                db.delete(item)
        
        db.commit()
        db.refresh(db_contract)
        return db_contract
        
    except Exception as e:
        logger.error(f"Failed to update contract {contract_id}: {e}")
        db.rollback()
        raise e

# ---------------------------------------------------------
# Delete Operation
# ---------------------------------------------------------

def delete_contract(db: Session, contract_id: uuid.UUID) -> Optional[dict]:
    """Delete contract and related records"""
    try:
        db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not db_contract:
            return None
            
        # Delete related contract views first to avoid constraint violations
        from server.models.core_models import ContractView
        db.query(ContractView).filter(ContractView.contract_id == contract_id).delete()
        
        # Delete the contract
        db.delete(db_contract)
        db.commit()
        return {"message": "Contract deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete contract {contract_id}: {e}")
        db.rollback()
        raise e

# ---------------------------------------------------------#
# Notification CRUD Operations
# ---------------------------------------------------------#

def create_notification(db: Session, notification: NotificationCreate) -> Notification:
    """Create a new notification"""
    try:
        db_notification = Notification(
            user_id=notification.user_id,
            title=notification.title,
            message=notification.message,
            type=notification.type,
            related_id=notification.related_id,
            is_read=notification.is_read
        )
        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)
        return db_notification
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        db.rollback()
        raise e

def get_notifications_by_user(db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 50) -> List[Notification]:
    """Get notifications for a specific user"""
    return db.query(Notification)\
        .filter(Notification.user_id == user_id)\
        .order_by(Notification.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

def get_unread_notifications_count(db: Session, user_id: uuid.UUID) -> int:
    """Get count of unread notifications for a user"""
    return db.query(func.count(Notification.id))\
        .filter(Notification.user_id == user_id, Notification.is_read == False)\
        .scalar()

def update_notification(db: Session, notification_id: uuid.UUID, notification_update: NotificationUpdate) -> Optional[Notification]:
    """Update a notification (e.g., mark as read)"""
    try:
        db_notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if not db_notification:
            return None

        update_data = notification_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_notification, key, value)

        db.commit()
        db.refresh(db_notification)
        return db_notification
    except Exception as e:
        logger.error(f"Failed to update notification {notification_id}: {e}")
        db.rollback()
        raise e

def mark_all_notifications_read(db: Session, user_id: uuid.UUID) -> int:
    """Mark all notifications as read for a user, returns count of updated notifications"""
    try:
        result = db.query(Notification)\
            .filter(Notification.user_id == user_id, Notification.is_read == False)\
            .update({"is_read": True})
        db.commit()
        return result
    except Exception as e:
        logger.error(f"Failed to mark notifications as read for user {user_id}: {e}")
        db.rollback()
        raise e

def delete_notification(db: Session, notification_id: uuid.UUID) -> bool:
    """Delete a notification"""
    try:
        db_notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if not db_notification:
            return False

        db.delete(db_notification)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to delete notification {notification_id}: {e}")
        db.rollback()
        raise e