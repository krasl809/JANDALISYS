import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'server'))

from server.core.database import get_db
from server.services.zk_service import ZkTecoService
from server.models.hr_models import ZkDevice

def test_device_connection(device_id):
    db = next(get_db())
    
    print(f"Testing connection to device ID: {device_id}")
    
    try:
        # Get the device
        device = db.query(ZkDevice).filter(ZkDevice.id == device_id).first()
        if not device:
            print(f"Device with ID {device_id} not found")
            return
        
        print(f"Testing device: {device.name} ({device.ip_address}:{device.port})")
        
        # Test connection using ZkTecoService
        zk_service = ZkTecoService(db)
        
        print("\n--- Testing Ping ---")
        ping_result = zk_service.ping_device(device_id)
        print(f"Ping Result: {ping_result}")
        
        print("\n--- Testing Sync ---")
        sync_result = zk_service.sync_device(device_id)
        print(f"Sync Result: {sync_result}")
        
    except Exception as e:
        print(f"\nError: {type(e).__name__}: {e}")
        import traceback
        print(f"\nStack trace: {traceback.format_exc()}")
    finally:
        db.close()

if __name__ == "__main__":
    # Device 10.0.0.236 has ID 3
    test_device_connection(3)
