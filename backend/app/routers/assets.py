from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity
from app.models.models import Asset, AssetCategory, User, Allocation, Transfer, Booking, MaintenanceTask, AuditLog
from app.schemas.schemas import AssetOut, AssetCreate

router = APIRouter(prefix="/assets", tags=["assets"])

@router.get("/", response_model=List[AssetOut])
def get_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Asset).all()

@router.get("/{id}", response_model=AssetOut)
def get_asset_by_id(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.post("/", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    # Verify serial number uniqueness
    existing = db.query(Asset).filter(Asset.serial_number == asset_in.serial_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset with this serial number already exists")

    # Verify category
    category = db.query(AssetCategory).filter(AssetCategory.id == asset_in.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Generate QR key automatically if empty
    qr_key = asset_in.qr_code_key if asset_in.qr_code_key else f"AF-{uuid.uuid4().hex[:10].upper()}"

    db_asset = Asset(
        name=asset_in.name,
        serial_number=asset_in.serial_number,
        qr_code_key=qr_key,
        condition=asset_in.condition or "Excellent",
        health_score=asset_in.health_score or 100,
        location=asset_in.location,
        status=asset_in.status or "Available",
        warranty_expiry=asset_in.warranty_expiry,
        category_id=asset_in.category_id,
        current_holder_id=asset_in.current_holder_id
    )

    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    log_activity(db, current_user.id, "Create Asset", f"Registered asset {db_asset.name} (SN: {db_asset.serial_number})")
    return db_asset

@router.get("/{id}/timeline", response_model=List[Dict[str, Any]])
def get_asset_timeline(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    timeline = []

    # 1. Fetch Allocations
    allocations = db.query(Allocation).filter(Allocation.asset_id == id).all()
    for alloc in allocations:
        timeline.append({
            "type": "Allocation",
            "date": alloc.allocated_at,
            "title": "Asset Allocated",
            "description": f"Allocated to {alloc.allocated_to.full_name} by {alloc.allocated_by.full_name}",
            "status": "success" if alloc.status == "Active" else "muted"
        })
        if alloc.returned_at:
            timeline.append({
                "type": "Return",
                "date": alloc.returned_at,
                "title": "Asset Returned",
                "description": f"Returned by {alloc.allocated_to.full_name}",
                "status": "info"
            })

    # 2. Fetch Transfers
    transfers = db.query(Transfer).filter(Transfer.asset_id == id).all()
    for trans in transfers:
        timeline.append({
            "type": "Transfer",
            "date": trans.requested_at,
            "title": f"Transfer Request ({trans.status})",
            "description": f"Requested transfer to {trans.target_employee.full_name} by {trans.requested_by.full_name}",
            "status": "warning" if trans.status == "Pending" else "success" if trans.status == "Approved" else "danger"
        })

    # 3. Fetch Bookings
    bookings = db.query(Booking).filter(Booking.asset_id == id).all()
    for book in bookings:
        timeline.append({
            "type": "Booking",
            "date": book.start_time,
            "title": "Resource Reserved",
            "description": f"Booked by {book.booked_by.full_name} for purpose: {book.purpose}",
            "status": "indigo"
        })

    # 4. Fetch Maintenance Tasks
    repairs = db.query(MaintenanceTask).filter(MaintenanceTask.asset_id == id).all()
    for task in repairs:
        timeline.append({
            "type": "Maintenance",
            "date": task.created_at,
            "title": f"Maintenance Task: {task.status}",
            "description": f"Reported issue: {task.description} (Priority: {task.priority})",
            "status": "danger" if task.priority == "Critical" else "warning"
        })

    # 5. Fetch Audits
    audits = db.query(AuditLog).filter(AuditLog.asset_id == id).all()
    for audit in audits:
        timeline.append({
            "type": "Audit",
            "date": audit.audited_at,
            "title": "Asset Audited",
            "description": f"Verified condition: {audit.condition_match}. Notes: {audit.notes}",
            "status": "success" if audit.verified else "danger"
        })

    # Sort timeline chronologically (latest first)
    timeline.sort(key=lambda x: x["date"], reverse=True)
    return timeline
