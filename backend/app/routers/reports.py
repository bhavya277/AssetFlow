from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.core.database import get_db
from app.core.dependencies import RoleChecker, User
from app.models.models import Asset, MaintenanceTask
from app.analytics import get_categories_utilization, get_maintenance_trends

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/summary", response_model=Dict[str, Any])
def get_report_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    # 1. Base Counts
    total_assets = db.query(Asset).count()
    allocated_assets = db.query(Asset).filter(Asset.status == "Allocated").count()
    utilization_rate = round((allocated_assets / total_assets) * 100, 1) if total_assets > 0 else 0.0

    # 2. Total Maintenance Expenditures
    total_maint_cost = db.query(func.sum(MaintenanceTask.cost)).scalar() or 0.0

    # 3. Category Breakdown Utilization
    categories_utilization = get_categories_utilization(db)

    # 4. Idle Assets (Status Available, ordered by health score descending)
    idle_assets_query = db.query(Asset).filter(Asset.status == "Available").order_by(Asset.health_score.desc()).limit(5).all()
    idle_assets = [
        {
            "id": asset.id,
            "name": asset.name,
            "serial_number": asset.serial_number,
            "location": asset.location,
            "health_score": asset.health_score,
            "condition": asset.condition
        } for asset in idle_assets_query
    ]

    # 5. Frequently Maintained Assets (Top 5 assets with count of tasks)
    maint_freq_query = db.query(
        Asset.id,
        Asset.name,
        Asset.serial_number,
        func.count(MaintenanceTask.id).label("repair_count"),
        func.sum(MaintenanceTask.cost).label("total_cost")
    ).join(MaintenanceTask).group_by(Asset.id).order_by(func.count(MaintenanceTask.id).desc()).limit(5).all()

    frequently_maintained = [
        {
            "id": item[0],
            "name": item[1],
            "serial_number": item[2],
            "repair_count": item[3],
            "total_cost": item[4] or 0.0
        } for item in maint_freq_query
    ]

    # 6. Monthly Maintenance Trends (Area chart values)
    maintenance_trends = get_maintenance_trends(db)

    return {
        "total_assets_count": total_assets,
        "utilization_rate": utilization_rate,
        "total_maintenance_cost": total_maint_cost,
        "categories_utilization": categories_utilization,
        "idle_assets": idle_assets,
        "frequently_maintained": frequently_maintained,
        "maintenance_trends": maintenance_trends
    }
