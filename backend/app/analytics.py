from calendar import month_abbr
from datetime import datetime
from typing import List, Dict

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Asset, AssetCategory, MaintenanceTask


def get_categories_utilization(db: Session) -> List[Dict]:
    categories = db.query(AssetCategory).all()
    result = []
    for cat in categories:
        cat_total = db.query(Asset).filter(Asset.category_id == cat.id).count()
        cat_allocated = db.query(Asset).filter(
            Asset.category_id == cat.id, Asset.status == "Allocated"
        ).count()
        result.append({
            "category_name": cat.name,
            "allocated": cat_allocated,
            "total": cat_total,
            "rate": round((cat_allocated / cat_total) * 100, 1) if cat_total > 0 else 0.0,
        })
    return result


def get_maintenance_trends(db: Session, months: int = 6) -> List[Dict]:
    now = datetime.utcnow()
    trends = []

    for i in range(months - 1, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1

        month_start = datetime(year, month, 1)
        month_end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        cost = db.query(func.sum(MaintenanceTask.cost)).filter(
            MaintenanceTask.created_at >= month_start,
            MaintenanceTask.created_at < month_end,
        ).scalar() or 0.0

        trends.append({
            "month": month_abbr[month],
            "cost": round(float(cost), 2),
        })

    return trends
