
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import uuid

from core.database import get_db
from schemas import schemas
from core.auth import get_current_user, require_permission
from services.contract_service import ContractService

router = APIRouter()


# --- CRUD Operations ---

@router.post("/", response_model=schemas.Contract)
async def create_contract(
    contract: schemas.ContractCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_contracts"))
):
    """
    Create a new contract.
    Business logic delegated to ContractService.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        return await ContractService.create_contract(db, contract, current_user.id, background_tasks)
    except Exception as e:
        logger.error(f"Error creating contract: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=schemas.ContractListResponse)
def read_contracts(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get paginated contracts with metadata"""
    # Validate pagination parameters
    if limit > 100:  # Prevent excessive loads
        limit = 100
    if limit <= 0:
        limit = 50
    if skip < 0:
        skip = 0
        
    result = ContractService.get_contracts(db, skip, limit)
    return result

@router.get("/next-number")
def get_next_number(
    seller_code: str = "SELL",
    issue_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Generate the next contract number based on seller code and optional issue date"""
    from datetime import datetime
    
    ref_date = None
    if issue_date:
        try:
            # Try to parse date from string (YYYY-MM-DD)
            ref_date = datetime.strptime(issue_date, "%Y-%m-%d")
        except ValueError:
            pass
            
    next_no = ContractService.get_next_number(db, seller_code, ref_date)
    # Extract only the sequence part (last 4 digits) for the frontend if needed,
    # or return the full number. The frontend currently expects next_no as a number or string.
    # Let's return both for flexibility.
    try:
        sequence = int(next_no[-4:])
    except:
        sequence = 1
    return {"next_no": sequence, "full_no": next_no}

@router.get("/{contract_id}", response_model=schemas.Contract)
def read_contract(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("read_contracts"))
):
    db_contract = ContractService.get_contract(db, contract_id)
    if db_contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Record the view
    ContractService.record_contract_view(db, contract_id, current_user.id)

    return db_contract

@router.put("/{contract_id}", response_model=schemas.Contract)
async def update_contract(
    contract_id: uuid.UUID,
    contract: schemas.ContractCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_contracts"))
):
    updated_contract = await ContractService.update_contract(db, contract_id, contract, current_user.id)
    if updated_contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return updated_contract

@router.post("/{contract_id}/notify-finance", response_model=schemas.Contract)
async def notify_finance(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("write_contracts"))
):
    """Record finance notification for a contract"""
    updated_contract = await ContractService.notify_finance(db, contract_id, current_user.id)
    if updated_contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return updated_contract

@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("delete_contracts"))
):
    result = await ContractService.delete_contract(db, contract_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"message": "Contract deleted successfully"}

@router.get("/{contract_id}/ledger", response_model=List[schemas.FinancialTransaction])
def get_contract_ledger(
    contract_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get financial ledger for a contract - requires authentication"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        uuid_obj = validate_uuid(contract_id)

        # Validate pagination parameters
        if limit > 100:  # Prevent excessive loads
            limit = 100
        if limit <= 0:
            limit = 50
        if skip < 0:
            skip = 0

        return ContractService.get_contract_ledger(db, uuid_obj, skip, limit)
    except Exception as e:
        logger.error(f"Error fetching ledger for contract {contract_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{contract_id}/price", response_model=schemas.PricingResponse)
async def price_contract(
    contract_id: str,
    pricing_data: schemas.ContractPricingRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("price_contracts"))
):
    uuid_obj = validate_uuid(contract_id)
    return await ContractService.price_contract(db, uuid_obj, pricing_data, current_user.id)

@router.get("/{contract_id}/pricing-tree")
def get_pricing_tree(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("read_contracts"))
):
    uuid_obj = validate_uuid(contract_id)
    return ContractService.get_pricing_tree(db, uuid_obj)

@router.post("/{contract_id}/approve-pricing")
async def approve_pricing(
    contract_id: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("approve_pricing"))
):
    uuid_obj = validate_uuid(contract_id)
    return await ContractService.approve_pricing(db, uuid_obj, current_user.id, version)

@router.post("/{contract_id}/partial-price", response_model=schemas.PricingResponse)
async def partial_price(
    contract_id: str,
    pricing_data: schemas.ContractPartialPricingRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(require_permission("price_contracts"))
):
    uuid_obj = validate_uuid(contract_id)
    return await ContractService.partial_price(db, uuid_obj, pricing_data, current_user.id)

@router.get("/{contract_id}/views", response_model=List[schemas.ContractView])
def get_contract_views(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get viewing history for a specific contract"""
    uuid_obj = validate_uuid(contract_id)

    return ContractService.get_contract_views(db, uuid_obj)

@router.get("/views/my-history")
def get_user_contract_views(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get viewing history for the current user"""
    return ContractService.get_user_contract_views(db, current_user.id, skip, limit)


@router.get("/search/", response_model=List[schemas.Contract])
def search_contracts(
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    user_id: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Search contracts based on criteria like status, date, or user"""
    # Validate pagination parameters
    if limit > 100:  # Prevent excessive loads
        limit = 100
    if skip < 0:
        skip = 0

    return ContractService.search_contracts(
        db, status, start_date, end_date, user_id, skip, limit
    )


def validate_uuid(uuid_string: str) -> uuid.UUID:
    """Validate string as UUID or raise 400 error"""
    try:
        return uuid.UUID(uuid_string)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid UUID format: {uuid_string}"
        )