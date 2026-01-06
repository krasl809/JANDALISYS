from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from core.database import get_db
from schemas import schemas
from core.auth import get_current_user
from services.notification_service import NotificationService

router = APIRouter()

@router.post("/", response_model=schemas.Notification)
async def create_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Create a new notification.
    Requires authentication.
    """
    return await NotificationService.create_notification(db, notification)

@router.get("/", response_model=List[schemas.Notification])
def get_user_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get notifications for the current user"""
    if limit > 100:
        limit = 100
    if limit <= 0:
        limit = 50
    if skip < 0:
        skip = 0

    return NotificationService.get_user_notifications(db, current_user.id, skip, limit)

@router.get("/unread-count")
def get_unread_notifications_count(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Get count of unread notifications for the current user"""
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}

@router.put("/{notification_id}", response_model=schemas.Notification)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Mark a specific notification as read"""
    try:
        uuid_obj = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    notification = NotificationService.mark_as_read(db, uuid_obj)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""
    count = NotificationService.mark_all_read(db, current_user.id)
    return {"message": f"Marked {count} notifications as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """Delete a notification"""
    try:
        uuid_obj = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    success = NotificationService.delete_notification(db, uuid_obj)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}