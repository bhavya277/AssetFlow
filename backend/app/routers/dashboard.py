from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user, User
from app.models.models import Asset, Transfer, MaintenanceTask, ActivityLog
from app.analytics import get_categories_utilization, get_maintenance_trends

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _count_pending_transfers(db: Session, current_user: User) -> int:
    query = db.query(Transfer).filter(Transfer.status == "Pending")

    if current_user.role in ["Admin", "Asset Manager"]:
        return query.count()

    if current_user.role == "Department Head":
        dept_user_ids = [
            u.id for u in db.query(User).filter(User.department_id == current_user.department_id).all()
        ]
        return query.filter(
            (Transfer.requested_by_id.in_(dept_user_ids))
            | (Transfer.target_employee_id.in_(dept_user_ids))
        ).count()

    return query.filter(
        (Transfer.requested_by_id == current_user.id)
        | (Transfer.target_employee_id == current_user.id)
    ).count()


def _count_owned_assets(db: Session, current_user: User) -> int:
    """Count currently owned/allocated resources (role-scoped)."""
    if current_user.role in ["Admin", "Asset Manager"]:
        return db.query(Asset).filter(Asset.status == "Allocated").count()

    if current_user.role == "Department Head":
        dept_user_ids = [
            u.id for u in db.query(User).filter(User.department_id == current_user.department_id).all()
        ]
        if not dept_user_ids:
            return 0
        return db.query(Asset).filter(
            Asset.status == "Allocated",
            Asset.current_holder_id.in_(dept_user_ids),
        ).count()

    return db.query(Asset).filter(
        Asset.status == "Allocated",
        Asset.current_holder_id == current_user.id,
    ).count()


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_catalog = db.query(Asset).count()
    allocated_assets = db.query(Asset).filter(Asset.status == "Allocated").count()
    utilization_rate = round((allocated_assets / total_catalog) * 100, 1) if total_catalog > 0 else 0.0
    owned_assets = _count_owned_assets(db, current_user)

    active_maintenance = db.query(MaintenanceTask).filter(
        MaintenanceTask.status.in_(["In Progress", "Requested"])
    ).count()

    recent_activity = []
    if current_user.role in ["Admin", "Asset Manager"]:
        logs = (
            db.query(ActivityLog)
            .options(joinedload(ActivityLog.user))
            .order_by(ActivityLog.created_at.desc())
            .limit(5)
            .all()
        )
        recent_activity = [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at,
                "user": {
                    "full_name": log.user.full_name,
                    "email": log.user.email,
                } if log.user else None,
            }
            for log in logs
        ]

    return {
        "stats": {
            "total_assets": owned_assets,
            "utilization_rate": utilization_rate,
            "pending_transfers": _count_pending_transfers(db, current_user),
            "active_maintenance": active_maintenance,
        },
        "categories_utilization": get_categories_utilization(db),
        "maintenance_trends": get_maintenance_trends(db),
        "recent_activity": recent_activity,
    }
