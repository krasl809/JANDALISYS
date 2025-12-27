from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import date

from core.database import get_db
from models.core_models import FinancialTransaction, Contract
from core.auth import get_current_user

router = APIRouter()

@router.post("/payments")
def create_payment(
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Register a payment for a contract.
    Expected payload:
    {
        "contract_id": "uuid",
        "payment_date": "YYYY-MM-DD",
        "amount": 1000.00,
        "currency": "USD",
        "exchange_rate": 1.0,
        "payment_method": "Bank Transfer",
        "bank_account_id": "uuid",
        "reference": "REF123",
        "description": "Payment description"
    }
    """
    try:
        # Validate contract exists
        contract = db.query(Contract).filter(Contract.id == uuid.UUID(payment_data["contract_id"])).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Generate professional payment reference if not provided
        payment_ref = payment_data.get("reference", "").strip()
        if not payment_ref or len(payment_ref) < 3:
            # Generate professional reference: PAY-YYYY-NNNN
            import datetime
            year = datetime.datetime.now().year
            # Find next sequential number for this year
            existing_payments = db.query(FinancialTransaction).filter(
                FinancialTransaction.type == "Payment",
                FinancialTransaction.reference.like(f"PAY-{year}-%")
            ).all()
            next_num = len(existing_payments) + 1
            payment_ref = f"PAY-{year}-{next_num:04d}"

        # For import contracts: payment is credit (buyer pays, reduces amount owed)
        # For export contracts: payment received is debit (seller receives, reduces amount receivable)
        is_credit = contract.direction == "import"

        # Create financial transaction record
        transaction = FinancialTransaction(
            contract_id=uuid.UUID(payment_data["contract_id"]),
            transaction_date=date.fromisoformat(payment_data["payment_date"]),
            type="Payment",
            description=payment_data.get("description", f"Payment via {payment_data.get('payment_method', 'Unknown')}")
                if payment_data.get("description")
                else f"Payment via {payment_data.get('payment_method', 'Unknown')}",
            reference=payment_ref,
            amount=float(payment_data["amount"]),
            is_credit=is_credit,
            linked_transaction_id=uuid.UUID(payment_data["linked_transaction_id"]) if payment_data.get("linked_transaction_id") else None
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return {
            "message": "Payment registered successfully",
            "transaction_id": str(transaction.id),
            "contract_id": str(transaction.contract_id),
            "amount": transaction.amount,
            "transaction_date": transaction.transaction_date
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register payment: {str(e)}")

@router.get("/contracts/{contract_id}/ledger")
def get_contract_ledger(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all financial transactions for a contract (ledger view).
    Returns both invoices and payments.
    """
    try:
        # Validate contract exists
        contract = db.query(Contract).filter(Contract.id == uuid.UUID(contract_id)).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Get all transactions for this contract
        transactions = db.query(FinancialTransaction).filter(
            FinancialTransaction.contract_id == uuid.UUID(contract_id)
        ).order_by(FinancialTransaction.transaction_date, FinancialTransaction.created_at).all()

        # Calculate accounting summaries
        total_debit = sum(t.amount for t in transactions if not t.is_credit)
        total_credit = sum(t.amount for t in transactions if t.is_credit)
        outstanding_balance = total_debit - total_credit

        # Calculate running balance (starting from 0)
        balance = 0
        ledger = []

        for transaction in transactions:
            if transaction.is_credit:
                balance -= transaction.amount  # Credits reduce balance
            else:
                balance += transaction.amount  # Debits increase balance

            ledger.append({
                "id": str(transaction.id),
                "transaction_date": transaction.transaction_date.isoformat(),
                "type": transaction.type,
                "description": transaction.description,
                "reference": transaction.reference,
                "amount": float(transaction.amount),
                "is_credit": transaction.is_credit,
                "running_balance": float(balance)
            })

        return {
            "contract_id": contract_id,
            "contract_no": contract.contract_no,
            "ledger": ledger,
            "accounting_summary": {
                "total_debit": float(total_debit),
                "total_credit": float(total_credit),
                "outstanding_balance": float(outstanding_balance)
            },
            "current_balance": float(balance)
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid contract ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ledger: {str(e)}")