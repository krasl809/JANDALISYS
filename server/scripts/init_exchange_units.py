from core.database import SessionLocal
from models import core_models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_units():
    db = SessionLocal()
    try:
        logger.info("Initializing default exchange quote units...")
        default_units = [
            {"name": "Metric Ton", "symbol": "MT", "factor": 1.0, "description": "Standard metric ton (1000kg)"},
            {"name": "Bushel (Wheat/Soybeans)", "symbol": "BU", "factor": 0.0272155, "description": "Standard bushel for wheat and soybeans"},
            {"name": "Bushel (Corn/Sorghum)", "symbol": "BU", "factor": 0.0254012, "description": "Standard bushel for corn and sorghum"},
            {"name": "Pound", "symbol": "LB", "factor": 0.00045359237, "description": "Standard pound"},
            {"name": "Hundredweight", "symbol": "CWT", "factor": 0.045359237, "description": "Standard hundredweight (100 lbs)"}
        ]
        
        for unit_data in default_units:
            existing = db.query(core_models.ExchangeQuoteUnit).filter(core_models.ExchangeQuoteUnit.name == unit_data["name"]).first()
            if not existing:
                new_unit = core_models.ExchangeQuoteUnit(**unit_data)
                db.add(new_unit)
                print(f"Added unit: {unit_data['name']}")
            else:
                print(f"Unit already exists: {unit_data['name']}")
        db.commit()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_units()
