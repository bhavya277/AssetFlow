from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, User
from app.models.models import Notification, ActivityLog
from app.schemas.schemas import NotificationOut, ActivityLogOut

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Fetch notifications for current user
@router.get("/", response_model=List[NotificationOut])
def get_user_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()

# Mark notification as read
@router.put("/{id}/read", response_model=NotificationOut)
def mark_notification_as_read(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

# Fetch global Activity Logs (Admin/Manager only)
@router.get("/activity-logs", response_model=List[ActivityLogOut])
def get_global_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    return db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100).all()
