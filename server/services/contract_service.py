
from sqlalchemy.orm import Session
from fastapi import HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from datetime import datetime as dt
import uuid
import logging

from crud import crud, inventory_crud
from schemas import schemas
from models import core_models
from ws_manager import manager
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class ContractService:
    @staticmethod
    async def create_contract(db: Session, contract_data: schemas.ContractCreate, user_id: uuid.UUID, background_tasks: BackgroundTasks = None) -> core_models.Contract:
        try:
            new_contract = crud.create_contract(db=db, contract=contract_data, user_id=user_id)
            
            if background_tasks:
                background_tasks.add_task(manager.broadcast, "CONTRACT_CREATED")
                background_tasks.add_task(
                    NotificationService.create_contract_notification,
                    db, user_id, new_contract.id, "contract_created", new_contract.contract_no
                )
            else:
                await manager.broadcast("CONTRACT_CREATED")
                await NotificationService.create_contract_notification(
                    db, user_id, new_contract.id, "contract_created", new_contract.contract_no
                )

            # --- Accounting Logic: Create Invoice when contract is posted/confirmed ---
            if new_contract.status in ["posted", "confirmed"]:
                # Calculate contract total value
                contract_total = sum(item.total for item in new_contract.items)

                if contract_total > 0:
                    # For import contracts: invoice is debit (buyer owes money)
                    # For export contracts: invoice is credit (seller is owed money)
                    is_credit = new_contract.direction == "export"
                    invoice_ref = f"INV-{new_contract.contract_no}-{uuid.uuid4().hex[:4].upper()}"
                    invoice = core_models.FinancialTransaction(
                        contract_id=new_contract.id,
                        transaction_date=new_contract.issue_date or func.current_date(),
                        type="Invoice",
                        description=f"Invoice for contract {new_contract.contract_no}",
                        reference=invoice_ref,
                        amount=contract_total,
                        is_credit=is_credit
                    )
                    db.add(invoice)
                    db.commit() # Ensure invoice is saved

            # --- Inventory Reservation Logic ---
            if new_contract.status in ["posted", "confirmed"] and new_contract.warehouse_id:
                for item in new_contract.items:
                    inventory_crud.reserve_stock(
                        db, item.article_id, new_contract.warehouse_id, item.quantity
                    )
                # Create notification for stock reservation
                await NotificationService.create_contract_notification(
                    db, user_id, new_contract.id, "stock_reserved", new_contract.contract_no
                )

            return new_contract
        except Exception as e:
            logger.error(f"Error in service creating contract: {e}")
            raise e

    @staticmethod
    async def update_contract(db: Session, contract_id: uuid.UUID, contract_data: schemas.ContractCreate, user_id: uuid.UUID) -> core_models.Contract:
        # Get current contract to check permissions for draft reversion
        current_contract = crud.get_contract_by_id(db, contract_id)
        if not current_contract:
            return None

        # Check permission for draft reversion: only contract creator can revert to draft
        if (contract_data.status and
            contract_data.status.value == "draft" and
            current_contract.status != "draft" and
            current_contract.created_by != user_id):
            raise HTTPException(
                status_code=403,
                detail="Only the contract creator can revert a contract to draft status"
            )

        # Store old state for inventory logic
        old_status = current_contract.status
        old_warehouse_id = current_contract.warehouse_id
        old_items = [(item.article_id, item.quantity) for item in current_contract.items]

        updated_contract = crud.update_contract(db=db, contract_id=contract_id, contract=contract_data)
        if updated_contract:
            await manager.broadcast("CONTRACT_UPDATED")
            # Create notification for contract update
            await NotificationService.create_contract_notification(
                db, user_id, contract_id, "contract_updated", updated_contract.contract_no
            )

            # --- Accounting Logic: Create Invoice when status changes to posted/confirmed ---
            if (updated_contract.status in ["posted", "confirmed"] and
                old_status not in ["posted", "confirmed"]):
                # Calculate contract total value
                contract_total = sum(item.total for item in updated_contract.items)

                if contract_total > 0:
                    # Check if invoice already exists
                    existing_invoice = db.query(core_models.FinancialTransaction).filter(
                        core_models.FinancialTransaction.contract_id == contract_id,
                        core_models.FinancialTransaction.type == "Invoice"
                    ).first()

                    if not existing_invoice:
                        # Create invoice transaction (debit - increases amount owed)
                        invoice_ref = f"INV-{updated_contract.contract_no}-{uuid.uuid4().hex[:4].upper()}"
                        invoice = core_models.FinancialTransaction(
                            contract_id=updated_contract.id,
                            transaction_date=updated_contract.issue_date or func.current_date(),
                            type="Invoice",
                            description=f"Invoice for contract {updated_contract.contract_no}",
                            reference=invoice_ref,
                            amount=contract_total,
                            is_credit=False  # Debit - increases balance owed
                        )
                        db.add(invoice)
                        db.commit() # Ensure invoice is saved

            # --- Inventory Reservation Logic ---
            # 1. Release old reservation if it was active
            if old_status in ["posted", "confirmed"] and old_warehouse_id:
                for art_id, qty in old_items:
                    inventory_crud.release_stock(db, art_id, old_warehouse_id, qty)
                # Notification for stock release
                await NotificationService.create_contract_notification(
                    db, user_id, contract_id, "stock_released", updated_contract.contract_no
                )

            # 2. Add new reservation if new status is active
            if updated_contract.status in ["posted", "confirmed"] and updated_contract.warehouse_id:
                for item in updated_contract.items:
                    inventory_crud.reserve_stock(
                        db, item.article_id, updated_contract.warehouse_id, item.quantity
                    )
                # Notification for stock reservation
                await NotificationService.create_contract_notification(
                    db, user_id, contract_id, "stock_reserved", updated_contract.contract_no
                )

        return updated_contract

    @staticmethod
    async def delete_contract(db: Session, contract_id: uuid.UUID, user_id: uuid.UUID):
        # Get contract for inventory release
        contract = crud.get_contract_by_id(db, contract_id)
        if not contract:
            return None

        # Release stock if it was reserved
        if contract.status in ["posted", "confirmed"] and contract.warehouse_id:
            for item in contract.items:
                inventory_crud.release_stock(db, item.article_id, contract.warehouse_id, item.quantity)

        result = crud.delete_contract(db=db, contract_id=contract_id)
        if result:
            await manager.broadcast("CONTRACT_DELETED")
            # Create notification for contract deletion
            await NotificationService.create_contract_notification(
                db, user_id, contract_id, "contract_deleted"
            )
        return result

    @staticmethod
    def get_contracts(db: Session, skip: int = 0, limit: int = 50, current_user_id: uuid.UUID = None):
        """Get paginated contracts with total count and view information"""
        try:
            contracts, total_count = crud.get_contracts(db, skip=skip, limit=limit)

            # Add view and financial information to each contract (simplified to avoid errors)
            for contract in contracts:
                contract.view_count = 0
                contract.last_viewed_by = None
                contract.last_viewed_at = None
                # Calculate financial value from items
                contract.financial_value = sum(item.total for item in contract.items if item.total) or 0

            # Add pagination metadata
            pagination_info = {
                'total': total_count,
                'page': (skip // limit) + 1,
                'per_page': limit,
                'pages': (total_count + limit - 1) // limit  # Ceiling division
            }

            return {
                'contracts': contracts,
                'pagination': pagination_info
            }
        except Exception as e:
            logger.error(f"Error in get_contracts: {e}")
            raise e

    @staticmethod
    def get_contract(db: Session, contract_id: uuid.UUID):
        return crud.get_contract_by_id(db, contract_id)

    @staticmethod
    def record_contract_view(db: Session, contract_id: uuid.UUID, user_id: uuid.UUID):
        """Record that a user viewed a contract"""
        view = core_models.ContractView(
            contract_id=contract_id,
            user_id=user_id
        )
        db.add(view)
        db.commit()

        # Create notification for contract view (optional, maybe only for certain conditions)
        # For now, let's skip notifications for views to avoid spam
        # NotificationService.create_contract_notification(
        #     db, user_id, contract_id, "contract_viewed"
        # )

    @staticmethod
    def get_contract_views(db: Session, contract_id: uuid.UUID):
        """Get viewing history for a specific contract"""
        results = db.query(core_models.ContractView)\
            .filter(core_models.ContractView.contract_id == contract_id)\
            .join(core_models.User, core_models.ContractView.user_id == core_models.User.id)\
            .add_columns(core_models.User.name.label('user_name'))\
            .order_by(core_models.ContractView.viewed_at.desc())\
            .all()
        
        views = []
        for view_obj, user_name in results:
            # Set the user_name attribute on the ORM object for Pydantic to pick up
            view_obj.user_name = user_name
            views.append(view_obj)
        return views

    @staticmethod
    def get_user_contract_views(db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 50):
        """Get viewing history for a specific user"""
        results = db.query(core_models.ContractView)\
            .filter(core_models.ContractView.user_id == user_id)\
            .join(core_models.Contract, core_models.ContractView.contract_id == core_models.Contract.id)\
            .add_columns(
                core_models.Contract.contract_no.label('contract_no'),
                core_models.Contract.direction.label('direction')
            )\
            .order_by(core_models.ContractView.viewed_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
        
        views = []
        for view_obj, contract_no, direction in results:
            # Set attributes on the ORM object for Pydantic to pick up
            view_obj.contract_no = contract_no
            view_obj.direction = direction
            views.append(view_obj)
        return views

    @staticmethod
    async def price_contract(db: Session, contract_id: uuid.UUID, pricing_data: schemas.ContractPricingRequest, user_id: uuid.UUID):
        contract = db.query(core_models.Contract).filter(core_models.Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        # 1. Update item prices in database
        if pricing_data.prices:
            prices_map = pricing_data.prices
            for item in contract.items:
                item_id_str = str(item.id)
                if item_id_str in prices_map:
                    try:
                        new_market_price = prices_map[item_id_str]
                        item.price = new_market_price

                        # Recalculate item total
                        qty = float(item.qty_ton or item.quantity or 0)
                        premium = float(item.premium or 0)
                        item.total = qty * (new_market_price + premium)
                    except ValueError:
                        continue

        # 2. Update contract status
        if pricing_data.status:
            contract.pricing_status = pricing_data.status.value
            contract.modified_date = func.now()

        # Smart Ledger Logic

        # Calculate new contract total after modification
        new_contract_total = sum(item.total for item in contract.items)

        # Calculate previously booked value (invoices + previous adjustments)
        previous_transactions = db.query(core_models.FinancialTransaction).filter(
            core_models.FinancialTransaction.contract_id == contract.id,
            core_models.FinancialTransaction.type.in_(['Invoice', 'Pricing Adjustment'])
        ).all()

        current_booked_value = sum(
            (t.amount if not t.is_credit else -t.amount) for t in previous_transactions
        )

        # Calculate difference
        difference = float(new_contract_total) - float(current_booked_value)

        # Record difference as new transaction (if significant difference)
        if abs(difference) > 0.01:
            is_reduction = difference < 0
            
            adjustment = core_models.FinancialTransaction(
                contract_id=contract.id,
                transaction_date=func.current_date(),
                type="Pricing Adjustment",
                description=f"Price Fixation Adjustment (Val: {new_contract_total:,.2f})",
                reference=f"ADJ-{uuid.uuid4().hex[:6].upper()}",
                amount=abs(difference),
                is_credit=is_reduction
            )
            db.add(adjustment)

        db.commit()
        db.refresh(contract)

        await manager.broadcast("CONTRACT_UPDATED")

        # Create notification for contract pricing
        await NotificationService.create_contract_notification(
            db, user_id, contract.id, "contract_priced", contract.contract_no
        )

        return {"message": "Pricing updated and financial adjustment recorded"}

    @staticmethod
    async def approve_pricing(db: Session, contract_id: uuid.UUID, user_id: uuid.UUID):
        contract = db.query(core_models.Contract).filter(core_models.Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        contract.pricing_status = "approved"
        db.commit()

        # Create notification for pricing approval
        await NotificationService.create_contract_notification(
            db, user_id, contract_id, "pricing_approved", contract.contract_no
        )

        await manager.broadcast("CONTRACT_UPDATED")
        return {"message": "Pricing approved successfully"}

    @staticmethod
    async def partial_price(db: Session, contract_id: uuid.UUID, pricing_data: schemas.ContractPartialPricingRequest, user_id: uuid.UUID):
        item_id = pricing_data.item_id
        if isinstance(item_id, str):
            try:
                item_id = uuid.UUID(item_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid item UUID format")

        contract = db.query(core_models.Contract).filter(core_models.Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        item = db.query(core_models.ContractItem).filter(core_models.ContractItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        qty_priced = pricing_data.qty_priced
        market_price = pricing_data.market_price
        premium = float(item.premium or 0)
        total_price = qty_priced * (market_price + premium)

        # Parse date string to date object
        pricing_date_str = pricing_data.pricing_date
        if pricing_date_str:
            transaction_date = dt.strptime(pricing_date_str, '%Y-%m-%d').date()
        else:
            transaction_date = dt.now().date()

        ref = f"PP-{uuid.uuid4().hex[:8].upper()}"
        article_name = item.article.article_name if item.article else 'N/A'
        
        transaction = core_models.FinancialTransaction(
            contract_id=contract.id,
            transaction_date=transaction_date,
            type="Partial Pricing",
            description=f"Partial pricing: {qty_priced} MT @ ${market_price}/MT (Item: {article_name})",
            reference=ref,
            amount=total_price,
            is_credit=False,
            item_id=item_id,
            qty_priced=qty_priced,
            unit_price=market_price
        )
        db.add(transaction)
        db.commit()

        # Create notification for partial pricing
        await NotificationService.create_contract_notification(
            db, user_id, contract.id, "contract_priced", contract.contract_no
        )

        await manager.broadcast("CONTRACT_UPDATED")
        return {"message": "Partial pricing recorded"}

    @staticmethod
    def get_contract_ledger(db: Session, contract_id: uuid.UUID, skip: int = 0, limit: int = 50):
        """Get financial ledger for a contract with pagination"""
        # Add index hint and limit the query for better performance
        return db.query(core_models.FinancialTransaction)\
            .filter(core_models.FinancialTransaction.contract_id == contract_id)\
            .order_by(core_models.FinancialTransaction.transaction_date.desc(), core_models.FinancialTransaction.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()

    @staticmethod
    def search_contracts(db: Session, status: str = None, start_date: str = None, end_date: str = None, user_id: str = None, skip: int = 0, limit: int = 50):
        """Search contracts based on criteria like status, date, or user"""
        query = db.query(core_models.Contract)

        # Apply filters
        if status:
            query = query.filter(core_models.Contract.status == status)
        if start_date:
            query = query.filter(core_models.Contract.contract_date >= start_date)
        if end_date:
            query = query.filter(core_models.Contract.contract_date <= end_date)
        if user_id:
            query = query.filter(core_models.Contract.created_by == user_id)

        # Apply pagination
        contracts = query.offset(skip).limit(limit).all()
        total_count = query.count()

        # Add pagination metadata
        pagination_info = {
            'total': total_count,
            'page': (skip // limit) + 1,
            'per_page': limit,
            'pages': (total_count + limit - 1) // limit  # Ceiling division
        }

        return {
            'contracts': contracts,
            'pagination': pagination_info
        }

    @staticmethod
    def get_pricing_tree(db: Session, contract_id: uuid.UUID):
        contract = db.query(core_models.Contract).filter(core_models.Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        tree = {}
        
        for item in contract.items:
            # 1. Get transactions for this item (Partial Pricing) - Using new item_id column
            item_transactions = db.query(core_models.FinancialTransaction).filter(
                core_models.FinancialTransaction.contract_id == contract_id,
                core_models.FinancialTransaction.item_id == item.id,
                core_models.FinancialTransaction.type == 'Partial Pricing'
            ).all()

            # Fallback for old transactions (string parsing) if item_id is null
            if not item_transactions:
                 # Standardize article name for search
                article_name_part = f"(Item: {item.article.article_name})" if item.article else ""
                
                # Loose fallback search
                item_transactions = db.query(core_models.FinancialTransaction).filter(
                    core_models.FinancialTransaction.contract_id == contract_id,
                    core_models.FinancialTransaction.type == 'Partial Pricing',
                    core_models.FinancialTransaction.description.contains(article_name_part),
                    core_models.FinancialTransaction.item_id == None
                ).all()

            tree[str(item.id)] = [
                {
                    "id": str(t.id),
                    "date": str(t.transaction_date),
                    # Prefer structured columns, fallback to parsing
                    "qty_priced": float(t.qty_priced) if t.qty_priced is not None else (float(t.description.split()[2]) if len(t.description.split()) > 2 else 0),
                    "price": float(t.unit_price) if t.unit_price is not None else (float(t.description.split('@')[1].split('/')[0].strip().replace('$', '')) if '@' in t.description else 0),
                    "total_value": float(t.amount),
                    "reference": t.reference
                }
                for t in item_transactions
            ]
        return tree
