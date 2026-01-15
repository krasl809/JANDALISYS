
import sys
import os
import uuid
from sqlalchemy.orm import Session

# Add the server directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from core.database import SessionLocal
from models import core_models

def init_incoterms():
    db = SessionLocal()
    try:
        incoterms_data = [
            {"code": "EXW", "name": "Ex Works", "description": "The seller makes the goods available at their premises."},
            {"code": "FCA", "name": "Free Carrier", "description": "The seller delivers the goods to a carrier or another person nominated by the buyer at the seller's premises or another named place."},
            {"code": "FOB", "name": "Free On Board", "description": "The seller delivers the goods on board the vessel nominated by the buyer at the named port of shipment."},
            {"code": "CFR", "name": "Cost and Freight", "description": "The seller delivers the goods on board the vessel or procures the goods already so delivered."},
            {"code": "CIF", "name": "Cost, Insurance and Freight", "description": "The seller delivers the goods on board the vessel or procures the goods already so delivered. The seller also contracts for insurance cover."},
            {"code": "CPT", "name": "Carriage Paid To", "description": "The seller delivers the goods to the carrier or another person nominated by the seller at an agreed place."},
            {"code": "CIP", "name": "Carriage and Insurance Paid To", "description": "The seller delivers the goods to the carrier or another person nominated by the seller at an agreed place. The seller also contracts for insurance cover."},
            {"code": "DAP", "name": "Delivered At Place", "description": "The seller delivers when the goods are placed at the disposal of the buyer on the arriving means of transport ready for unloading at the named place of destination."},
            {"code": "DPU", "name": "Delivered at Place Unloaded", "description": "The seller delivers when the goods, once unloaded from the arriving means of transport, are placed at the disposal of the buyer at a named place of destination."},
            {"code": "DDP", "name": "Delivered Duty Paid", "description": "The seller delivers the goods when the goods are placed at the disposal of the buyer, cleared for import on the arriving means of transport ready for unloading at the named place of destination."},
        ]

        print("Checking Incoterms...")
        for data in incoterms_data:
            existing = db.query(core_models.Incoterm).filter(core_models.Incoterm.code == data["code"]).first()
            if not existing:
                print(f"Adding Incoterm: {data['code']}")
                incoterm = core_models.Incoterm(
                    id=uuid.uuid4(),
                    code=data["code"],
                    name=data["name"],
                    description=data["description"]
                )
                db.add(incoterm)
            else:
                print(f"Incoterm {data['code']} already exists.")
        
        db.commit()
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_incoterms()
