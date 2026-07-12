from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity, create_notification
from app.models.models import MaintenanceTask, Asset, User
from app.schemas.schemas import MaintenanceTaskOut, MaintenanceTaskCreate, MaintenanceTaskUpdate

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.get("/", response_model=List[MaintenanceTaskOut])
def get_maintenance_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(MaintenanceTask).all()

@router.post("/", response_model=MaintenanceTaskOut, status_code=status.HTTP_201_CREATED)
def create_maintenance_task(
    task_in: MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == task_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Create task
    db_task = MaintenanceTask(
        asset_id=task_in.asset_id,
        reported_by_id=current_user.id,
        description=task_in.description,
        priority=task_in.priority or "Medium",
        status="Requested",
        cost=0.0
    )
    db.add(db_task)

    # Automatically set asset status to Under Maintenance
    asset.status = "Under Maintenance"

    db.commit()
    db.refresh(db_task)

    # Notify managers
    managers = db.query(User).filter(User.role.in_(["Admin", "Asset Manager"])).all()
    for mgr in managers:
        create_notification(
            db,
            mgr.id,
            "Maintenance Request",
            f"Maintenance requested for asset '{asset.name}': {task_in.description}",
            "alerts"
        )

    log_activity(db, current_user.id, "Create Maintenance Task", f"Reported issue on asset {asset.name}")
    return db_task

@router.put("/{id}", response_model=MaintenanceTaskOut)
def update_maintenance_task(
    id: int,
    task_update: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    asset = db.query(Asset).filter(Asset.id == task.asset_id).first()

    if task_update.technician_name is not None:
        task.technician_name = task_update.technician_name

    if task_update.cost is not None:
        task.cost = task_update.cost

    if task_update.status is not None:
        old_status = task.status
        task.status = task_update.status
        
        # If marked Done, restore asset status to Available
        if task_update.status == "Done" and old_status != "Done":
            task.resolved_at = datetime.utcnow()
            if asset:
                asset.status = "Available"
                
            # Send notification to reporter
            create_notification(
                db,
                task.reported_by_id,
                "Maintenance Completed",
                f"Maintenance for asset '{asset.name if asset else 'ID ' + str(task.asset_id)}' has been marked completed.",
                "alerts"
            )

    db.commit()
    db.refresh(task)
    
    log_activity(
        db,
        current_user.id,
        "Update Maintenance Task",
        f"Updated task ID {task.id} status to {task.status}, tech to {task.technician_name or 'Unassigned'}"
    )
    return task
