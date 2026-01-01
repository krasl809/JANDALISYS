from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
import json

from crud import crud
from schemas import schemas
from models import core_models
from ws_manager import manager

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def create_notification(db: Session, notification_data: schemas.NotificationCreate) -> core_models.Notification:
        """Create a new notification"""
        try:
            notification = crud.create_notification(db, notification_data)
            
            # Broadcast via WebSocket
            if notification:
                try:
                    await manager.broadcast(json.dumps({
                        "type": "notification",
                        "data": {
                            "id": str(notification.id),
                            "title": notification.title,
                            "message": notification.message,
                            "type": notification.type,
                            "user_id": str(notification.user_id),
                            "created_at": notification.created_at.isoformat() if notification.created_at else None
                        }
                    }))
                except Exception as ws_err:
                    logger.warning(f"WebSocket broadcast failed: {ws_err}")
                    
            return notification
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise e

    @staticmethod
    def get_user_notifications(db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 50) -> List[core_models.Notification]:
        """Get notifications for a user"""
        return crud.get_notifications_by_user(db, user_id, skip, limit)

    @staticmethod
    def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
        """Get count of unread notifications for a user"""
        return crud.get_unread_notifications_count(db, user_id)

    @staticmethod
    def mark_as_read(db: Session, notification_id: uuid.UUID) -> Optional[core_models.Notification]:
        """Mark a specific notification as read"""
        return crud.update_notification(db, notification_id, schemas.NotificationUpdate(is_read=True))

    @staticmethod
    def mark_all_read(db: Session, user_id: uuid.UUID) -> int:
        """Mark all notifications as read for a user"""
        return crud.mark_all_notifications_read(db, user_id)

    @staticmethod
    def delete_notification(db: Session, notification_id: uuid.UUID) -> bool:
        """Delete a notification"""
        return crud.delete_notification(db, notification_id)

    @staticmethod
    async def create_contract_notification(db: Session, user_id: uuid.UUID, contract_id: uuid.UUID, event_type: str, contract_no: str = None) -> list:
        """Create notifications for contract events for all users except the performer"""
        try:
            # ... (lines 76-114 omitted for brevity)
            # Define notification content based on event type
            notifications = {
                "contract_created": {
                    "title": "New Contract Created",
                    "message": f"Contract {contract_no or contract_id} has been created."
                },
                "contract_updated": {
                    "title": "Contract Updated",
                    "message": f"Contract {contract_no or contract_id} has been updated."
                },
                "contract_viewed": {
                    "title": "Contract Viewed",
                    "message": f"Contract {contract_no or contract_id} has been viewed."
                },
                "contract_status_changed": {
                    "title": "Contract Status Changed",
                    "message": f"Status of contract {contract_no or contract_id} has been changed."
                },
                "contract_priced": {
                    "title": "Contract Priced",
                    "message": f"Contract {contract_no or contract_id} has been priced."
                },
                "contract_deleted": {
                    "title": "Contract Deleted",
                    "message": f"Contract {contract_no or contract_id} has been deleted."
                },
                "stock_reserved": {
                    "title": "Stock Reserved",
                    "message": f"Stock has been reserved for contract {contract_no or contract_id}."
                },
                "stock_released": {
                    "title": "Stock Released",
                    "message": f"Stock has been released for contract {contract_no or contract_id}."
                },
                "pricing_approved": {
                    "title": "Pricing Approved",
                    "message": f"Pricing for contract {contract_no or contract_id} has been approved."
                }
            }

            if event_type not in notifications:
                logger.warning(f"Unknown notification event type: {event_type}")
                return []

            # Get all users except the one who performed the action
            # Extract user IDs immediately to avoid detached instance issues
            user_ids = [u.id for u in db.query(core_models.User.id).filter(core_models.User.id != user_id).all()]

            created_notifications = []
            for uid in user_ids:
                # Use the user's ID directly to avoid detached instance issues
                notification_data = schemas.NotificationCreate(
                    user_id=uid,
                    title=notifications[event_type]["title"],
                    message=notifications[event_type]["message"],
                    type=event_type,
                    related_id=contract_id
                )
                notification = await NotificationService.create_notification(db, notification_data)
                if notification:
                    created_notifications.append(notification)

            return created_notifications

        except Exception as e:
            logger.error(f"Error creating contract notifications: {e}")
            raise e

    @staticmethod
    async def create_inventory_notification(db: Session, user_id: uuid.UUID, note_id: uuid.UUID, event_type: str, note_number: str = None) -> list:
        """Create notifications for inventory events for all users except the performer"""
        try:
            # Define notification content based on event type
            notifications = {
                "delivery_note_created": {
                    "title": "New Delivery Note",
                    "message": f"Delivery Note {note_number or note_id} has been created."
                },
                "delivery_note_approved": {
                    "title": "Delivery Note Approved",
                    "message": f"Delivery Note {note_number or note_id} has been approved. Stock updated."
                },
                "low_stock_alert": {
                    "title": "Low Stock Alert",
                    "message": f"Stock level for article {note_number} is below minimum threshold."
                }
            }

            if event_type not in notifications:
                logger.warning(f"Unknown inventory notification event type: {event_type}")
                return []

            # Get all users except the one who performed the action
            # Extract user IDs immediately to avoid detached instance issues
            user_ids = [u.id for u in db.query(core_models.User.id).filter(core_models.User.id != user_id).all()]

            created_notifications = []
            for uid in user_ids:
                # Use the user's ID directly to avoid detached instance issues
                notification_data = schemas.NotificationCreate(
                    user_id=uid,
                    title=notifications[event_type]["title"],
                    message=notifications[event_type]["message"],
                    type=event_type,
                    related_id=note_id
                )
                notification = await NotificationService.create_notification(db, notification_data)
                if notification:
                    created_notifications.append(notification)

            return created_notifications

        except Exception as e:
            logger.error(f"Error creating inventory notifications: {e}")
            raise e