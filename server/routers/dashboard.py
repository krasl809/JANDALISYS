from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from core.database import get_db
from core.auth import get_current_user, require_permission
import random
from models.core_models import Contract
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/profit-chart")
def get_profit_chart(db: Session = Depends(get_db), current_user = Depends(require_permission("view_dashboard"))):
    """Get profit chart data for dashboard"""
    try:
        # Generate sample profit data for the last 12 months
        data = []
        base_value = 50000  # Base profit value

        for i in range(12):
            month_date = datetime.now() - timedelta(days=30 * (11 - i))
            month_name = month_date.strftime("%b %Y")

            # Add some realistic variation
            variation = random.uniform(-0.3, 0.4)  # -30% to +40% variation
            value = int(base_value * (1 + variation))

            data.append({
                "name": month_name,
                "val": value
            })

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profit chart: {str(e)}")

@router.get("/operational-data")
def get_operational_data(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get operational data for dashboard table"""
    try:
        # Get the 5 most recent contracts
        recent_contracts = db.query(Contract).order_by(Contract.created_at.desc()).limit(5).all()

        operations = []
        for contract in recent_contracts:
            operations.append({
                "id": contract.contract_no,
                "type": contract.direction.capitalize() if contract.direction else "N/A",
                # Assuming a relationship to a 'buyer' or 'seller' model with a 'name' attribute
                "party": contract.buyer.name if contract.direction == 'export' and contract.buyer else (contract.seller.name if contract.direction == 'import' and contract.seller else "N/A"),
                "date": contract.issue_date.isoformat() if contract.issue_date else "N/A",
                "status": contract.status.capitalize() if contract.status else "N/A"
            })

        return operations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch operational data: {str(e)}")

@router.get("/pipeline")
def get_pipeline_data(db: Session = Depends(get_db), current_user = Depends(require_permission("view_dashboard"))):
    """Get pipeline data for visual pipeline component"""
    try:
        # Generate sample pipeline data
        pipeline_data = [
            {
                "label": "New Orders",
                "value": str(random.randint(3, 8)),
                "amount": f"${random.randint(800, 1500)}k",
                "color": "#1976d2",  # info color
                "icon": "AccessTime"
            },
            {
                "label": "Shipping",
                "value": str(random.randint(2, 6)),
                "amount": f"${random.randint(600, 1000)}k",
                "color": "#ed6c02",  # accent color
                "icon": "LocalShipping"
            },
            {
                "label": "Clearance",
                "value": str(random.randint(1, 4)),
                "amount": f"${random.randint(300, 600)}k",
                "color": "#ed6c02",  # warning color
                "icon": "Warning"
            },
            {
                "label": "Collected",
                "value": str(random.randint(8, 15)),
                "amount": f"${random.randint(2500, 4000)}k",
                "color": "#2e7d32",  # success color
                "icon": "AttachMoney"
            }
        ]

        return pipeline_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pipeline data: {str(e)}")

@router.get("/risks")
def get_risks_data(db: Session = Depends(get_db), current_user = Depends(require_permission("view_dashboard"))):
    """Get risks/alerts data for dashboard"""
    try:
        # Generate sample risk alerts
        risks = [
            {
                "id": 1,
                "title": "Port Delay (Lattakia)",
                "description": "Shipment IMP-005 stuck for 3 days.",
                "action": "View",
                "color": "error",
                "icon": "LocalShipping"
            },
            {
                "id": 2,
                "title": "Payment Due",
                "description": "Cargill expects $50k tomorrow.",
                "action": "Pay",
                "color": "warning",
                "icon": "AttachMoney"
            },
            {
                "id": 3,
                "title": "Documentation Review",
                "description": "5 contracts pending approval.",
                "action": "Review",
                "color": "info",
                "icon": "Warning"
            }
        ]

        return risks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch risks data: {str(e)}")

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user = Depends(require_permission("view_dashboard"))):
    """Get dashboard statistics for operational cards"""
    try:
        # Generate sample statistics
        stats = {
            "tasks_today": random.randint(8, 15),
            "review_pending": random.randint(3, 8),
            "arriving": random.randint(1, 5),
            "pay_requests": random.randint(2, 6)
        }

        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")