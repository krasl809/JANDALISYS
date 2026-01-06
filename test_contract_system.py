import sys
import os
import asyncio
import uuid
from datetime import date, datetime

# Add server directory to path
sys.path.insert(0, os.path.join(os.getcwd(), 'server'))

from core.database import SessionLocal, engine, Base
from models import core_models
from services.contract_service import ContractService
from services.notification_service import NotificationService
from schemas import schemas
from sqlalchemy import text

async def run_comprehensive_test():
    db = SessionLocal()
    print("--- Starting Comprehensive Contract System Test ---")
    
    try:
        # 0. Setup: Get or create users
        admin_user = db.query(core_models.User).filter(core_models.User.email == "admin@jandali.com").first()
        if not admin_user:
            print("Admin user not found, skipping test.")
            return

        test_user = db.query(core_models.User).filter(core_models.User.email == "said.shahwan@archive.com").first()
        if not test_user:
            # Create a test user if doesn't exist to receive notifications
            test_user = core_models.User(
                id=uuid.uuid4(),
                name="Test Receiver",
                email="test.receiver@jandali.com",
                password="hashed_password",
                role="user"
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        # Get a real article for items
        article = db.query(core_models.Article).first()
        if not article:
            # Create a dummy article if none exists
            article = core_models.Article(id=uuid.uuid4(), name="Test Article", code="T001")
            db.add(article)
            db.commit()
            db.refresh(article)

        # Get a real seller, buyer, warehouse
        seller = db.query(core_models.Seller).first()
        buyer = db.query(core_models.Buyer).first()
        warehouse = db.query(core_models.Warehouse).first()
        
        # If they don't exist, we'll create them or use dummy IDs (less ideal for FK constraints)
        seller_id = seller.id if seller else uuid.uuid4()
        buyer_id = buyer.id if buyer else uuid.uuid4()
        warehouse_id = warehouse.id if warehouse else uuid.uuid4()

        if not seller:
            db.add(core_models.Seller(id=seller_id, name="Test Seller"))
        if not buyer:
            db.add(core_models.Buyer(id=buyer_id, name="Test Buyer"))
        if not warehouse:
            db.add(core_models.Warehouse(id=warehouse_id, name="Test Warehouse"))
        db.commit()

        # --- STEP 1: CREATE DRAFT CONTRACT ---
        print("\nStep 1: Creating Draft Contract...")
        contract_create = schemas.ContractCreate(
            direction="export",
            status="draft",
            issue_date=date.today(),
            shipment_date=date.today(),
            contract_currency="USD",
            seller_id=seller_id,
            buyer_id=buyer_id,
            warehouse_id=warehouse_id,
            contract_type="fixed_price",
            items=[
                schemas.ContractItemCreate(
                    article_id=article.id,
                    qty_ton=100.0,
                    price=500.0,
                    premium=10.0,
                    packing="Bulk"
                )
            ]
        )
        
        # We simulate BackgroundTasks since we are in a script
        class MockBackgroundTasks:
            def add_task(self, func, *args, **kwargs):
                # Execute immediately for testing
                print(f"Executing background task: {func.__name__}")
                # We can't easily await here if func is async, but we'll try
                pass

        contract = await ContractService.create_contract(db, contract_create, admin_user.id, MockBackgroundTasks())
        contract_id = contract.id
        print(f"Contract created with ID: {contract_id}, Status: {contract.status}")

        # --- STEP 2: UPDATE CONTRACT TO POSTED ---
        print("\nStep 2: Updating Contract to Posted...")
        contract_update = schemas.ContractCreate(
            direction="export",
            status="posted",
            issue_date=date.today(),
            shipment_date=date.today(),
            contract_currency="USD",
            seller_id=seller_id,
            buyer_id=buyer_id,
            warehouse_id=warehouse_id,
            contract_type="fixed_price",
            items=[
                schemas.ContractItemCreate(
                    article_id=article.id,
                    qty_ton=150.0, # Increased quantity
                    price=510.0,
                    premium=10.0,
                    packing="Bulk"
                )
            ]
        )
        updated_contract = await ContractService.update_contract(db, contract_id, contract_update, admin_user.id)
        print(f"Contract updated. New Status: {updated_contract.status}, Contract No: {updated_contract.contract_no}")
        print(f"New quantity: {updated_contract.items[0].qty_ton}")

        # --- STEP 3: RECORD VIEW ---
        print("\nStep 3: Recording a View...")
        ContractService.record_contract_view(db, contract_id, test_user.id)
        views = ContractService.get_contract_views(db, contract_id)
        print(f"Total views for contract: {len(views)}")
        if views:
            print(f"Last viewed by: {views[0].user_name} at {views[0].viewed_at}")

        # --- STEP 4: PARTIAL PRICING ---
        print("\nStep 4: Adding Partial Pricing...")
        item_id = updated_contract.items[0].id
        pricing_data = schemas.ContractPartialPricingRequest(
            item_id=item_id,
            qty_priced=50.0,
            market_price=520.0
        )
        pricing_res = await ContractService.partial_price(db, contract_id, pricing_data, admin_user.id)
        print(f"Partial pricing added. Transaction ID: {pricing_res.id if hasattr(pricing_res, 'id') else 'N/A'}")

        # Check ledger
        ledger = ContractService.get_contract_ledger(db, contract_id)
        print(f"Ledger entries: {len(ledger)}")
        for entry in ledger:
            print(f" - {entry.transaction_date}: {entry.type} | Amount: {entry.amount} | Desc: {entry.description}")

        # --- STEP 5: FULL PRICING ---
        print("\nStep 5: Full Pricing (Finalizing)...")
        full_pricing_data = schemas.ContractPricingRequest(
            prices={str(item_id): 525.0},
            status=schemas.PricingStatus.APPROVED
        )
        await ContractService.price_contract(db, contract_id, full_pricing_data, admin_user.id)
        re_fetched_contract = db.query(core_models.Contract).filter(core_models.Contract.id == contract_id).first()
        print(f"Final Pricing Status: {re_fetched_contract.pricing_status}")

        # --- STEP 6: VERIFY NOTIFICATIONS ---
        print("\nStep 6: Verifying Notifications...")
        # Check notifications for the test_user
        notifications = NotificationService.get_user_notifications(db, test_user.id)
        print(f"Total notifications for test user ({test_user.name}): {len(notifications)}")
        for n in notifications[:5]: # Show last 5
            print(f" - [{n.type}] {n.title}: {n.message}")

        # --- STEP 7: CLEANUP ---
        print("\nStep 7: Cleanup (Deleting test data)...")
        # delete_contract already handles dependent records thanks to my previous fix
        await ContractService.delete_contract(db, contract_id, admin_user.id)
        
        # Verify deletion
        deleted_check = db.query(core_models.Contract).filter(core_models.Contract.id == contract_id).first()
        if not deleted_check:
            print("Contract deleted successfully.")
            # Check related transactions
            trans_check = db.query(core_models.FinancialTransaction).filter(core_models.FinancialTransaction.contract_id == contract_id).all()
            print(f"Remaining transactions: {len(trans_check)}")
        else:
            print("FAILED to delete contract!")

    except Exception as e:
        print(f"ERROR DURING TEST: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_comprehensive_test())
