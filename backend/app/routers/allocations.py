from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity, create_notification
from app.models.models import Asset, Allocation, Transfer, User
from app.schemas.schemas import AllocationOut, AllocationCreate, TransferOut, TransferCreate, TransferUpdate

router = APIRouter(prefix="/allocations", tags=["allocations"])

@router.get("/", response_model=List[AllocationOut])
def get_allocations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Allocation).all()

@router.post("/", response_model=AllocationOut, status_code=status.HTTP_201_CREATED)
def allocate_asset(
    alloc_in: AllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    # Verify asset exists and is Available
    asset = db.query(Asset).filter(Asset.id == alloc_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.status != "Available":
        raise HTTPException(
            status_code=400,
            detail=f"Asset is not available for allocation. Current status: {asset.status}"
        )

    # Verify recipient exists
    recipient = db.query(User).filter(User.id == alloc_in.allocated_to_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    # Create allocation
    db_alloc = Allocation(
        asset_id=alloc_in.asset_id,
        allocated_to_id=alloc_in.allocated_to_id,
        allocated_by_id=current_user.id,
        status="Active"
    )
    db.add(db_alloc)

    # Update asset state
    asset.status = "Allocated"
    asset.current_holder_id = alloc_in.allocated_to_id

    db.commit()
    db.refresh(db_alloc)

    # Notification & Activity
    create_notification(
        db,
        alloc_in.allocated_to_id,
        "Asset Allocated",
        f"Asset '{asset.name}' has been allocated to you by {current_user.full_name}",
        "returns"
    )
    log_activity(db, current_user.id, "Allocate Asset", f"Allocated asset {asset.name} to {recipient.full_name}")

    return db_alloc

@router.post("/{id}/return", response_model=AllocationOut)
def return_asset(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    alloc = db.query(Allocation).filter(Allocation.id == id, Allocation.status == "Active").first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Active allocation record not found")

    asset = db.query(Asset).filter(Asset.id == alloc.asset_id).first()
    if asset:
        asset.status = "Available"
        asset.current_holder_id = None

    alloc.status = "Returned"
    alloc.returned_at = datetime.utcnow()

    db.commit()
    db.refresh(alloc)

    log_activity(db, current_user.id, "Return Asset", f"Asset returned: {asset.name if asset else 'Asset ID ' + str(alloc.asset_id)}")
    return alloc

# Transfers List
@router.get("/transfers", response_model=List[TransferOut])
def get_transfers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Transfer).all()

# Request Transfer
@router.post("/transfers", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def request_transfer(
    transfer_in: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset is currently allocated
    asset = db.query(Asset).filter(Asset.id == transfer_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.status != "Allocated" or asset.current_holder_id is None:
        raise HTTPException(
            status_code=400,
            detail="Only allocated assets can be requested for transfer"
        )

    # Verify recipient exists
    target = db.query(User).filter(User.id == transfer_in.target_employee_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target employee not found")

    if target.id == asset.current_holder_id:
        raise HTTPException(status_code=400, detail="Asset is already allocated to the target employee")

    # Create transfer request
    db_transfer = Transfer(
        asset_id=transfer_in.asset_id,
        requested_by_id=current_user.id,
        target_employee_id=transfer_in.target_employee_id,
        status="Pending"
    )
    db.add(db_transfer)
    db.commit()
    db.refresh(db_transfer)

    # Notify administrators / asset managers
    admins = db.query(User).filter(User.role.in_(["Admin", "Asset Manager"])).all()
    for admin in admins:
        create_notification(
            db,
            admin.id,
            "Transfer Approval Required",
            f"Transfer request pending approval for asset '{asset.name}' from {current_user.full_name}",
            "approvals"
        )

    log_activity(db, current_user.id, "Request Transfer", f"Requested transfer of {asset.name} to {target.full_name}")
    return db_transfer

# Approve or Reject Transfer
@router.post("/transfers/{transfer_id}/process", response_model=TransferOut)
def process_transfer(
    transfer_id: int,
    action: TransferUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager", "Department Head"]))
):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id, Transfer.status == "Pending").first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Pending transfer request not found")

    asset = db.query(Asset).filter(Asset.id == transfer.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if action.status == "Approved":
        # 1. Update previous active allocation to Returned
        prev_alloc = db.query(Allocation).filter(
            Allocation.asset_id == transfer.asset_id,
            Allocation.status == "Active"
        ).first()
        if prev_alloc:
            prev_alloc.status = "Returned"
            prev_alloc.returned_at = datetime.utcnow()

        # 2. Create new Allocation for target employee
        new_alloc = Allocation(
            asset_id=transfer.asset_id,
            allocated_to_id=transfer.target_employee_id,
            allocated_by_id=current_user.id,
            status="Active"
        )
        db.add(new_alloc)

        # 3. Update asset holder
        asset.current_holder_id = transfer.target_employee_id
        asset.status = "Allocated"

        transfer.status = "Approved"
        
        # Send notification to target
        create_notification(
            db,
            transfer.target_employee_id,
            "Transfer Approved",
            f"Transfer of asset '{asset.name}' to you has been approved.",
            "returns"
        )
    elif action.status == "Rejected":
        transfer.status = "Rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action status")

    transfer.approved_by_id = current_user.id
    transfer.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(transfer)

    # Notify requester
    create_notification(
        db,
        transfer.requested_by_id,
        f"Transfer Request {action.status}",
        f"Your transfer request for asset '{asset.name}' has been {action.status.lower()}.",
        "alerts"
    )

    log_activity(db, current_user.id, "Process Transfer", f"Processed transfer request ID {transfer.id} as {action.status}")
    return transfer
