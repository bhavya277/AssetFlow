from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity, create_notification
from app.models.models import Booking, Asset, User, Allocation
from app.schemas.schemas import BookingOut, BookingCreate, BookingUpdate

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _notify_managers(db: Session, title: str, message: str, category: str = "approvals"):
    managers = db.query(User).filter(User.role.in_(["Admin", "Asset Manager"])).all()
    for manager in managers:
        create_notification(db, manager.id, title, message, category)


def _check_booking_overlap(
    db: Session,
    asset_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: int | None = None,
):
    query = db.query(Booking).filter(
        Booking.asset_id == asset_id,
        Booking.status.in_(["Confirmed", "Pending"]),
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    )
    if exclude_booking_id is not None:
        query = query.filter(Booking.id != exclude_booking_id)
    return query.first()


def _allocate_asset_for_booking(db: Session, booking: Booking, allocated_by_id: int) -> None:
    """Auto-allocate asset to the booker when a booking is confirmed."""
    asset = db.query(Asset).filter(Asset.id == booking.asset_id).first()
    if not asset:
        return

    if asset.current_holder_id == booking.booked_by_id and asset.status == "Allocated":
        return

    if asset.status not in ["Available", "Allocated"]:
        raise HTTPException(
            status_code=400,
            detail=f"Asset '{asset.name}' cannot be allocated (status: {asset.status})",
        )

    prev_alloc = db.query(Allocation).filter(
        Allocation.asset_id == booking.asset_id,
        Allocation.status == "Active",
    ).first()
    if prev_alloc:
        prev_alloc.status = "Returned"
        prev_alloc.returned_at = datetime.utcnow()

    db.add(Allocation(
        asset_id=booking.asset_id,
        allocated_to_id=booking.booked_by_id,
        allocated_by_id=allocated_by_id,
        status="Active",
    ))
    asset.status = "Allocated"
    asset.current_holder_id = booking.booked_by_id


def _deallocate_asset_for_booking(db: Session, booking: Booking) -> None:
    """Return asset to storage when a confirmed booking is cancelled."""
    asset = db.query(Asset).filter(Asset.id == booking.asset_id).first()
    if not asset or asset.current_holder_id != booking.booked_by_id:
        return

    active_alloc = db.query(Allocation).filter(
        Allocation.asset_id == booking.asset_id,
        Allocation.allocated_to_id == booking.booked_by_id,
        Allocation.status == "Active",
    ).first()
    if active_alloc:
        active_alloc.status = "Returned"
        active_alloc.returned_at = datetime.utcnow()

    asset.status = "Available"
    asset.current_holder_id = None


@router.get("/", response_model=List[BookingOut])
def get_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role in ["Admin", "Asset Manager"]:
        return db.query(Booking).all()
    elif current_user.role == "Department Head":
        dept_user_ids = [u.id for u in db.query(User).filter(User.department_id == current_user.department_id).all()]
        return db.query(Booking).filter(Booking.booked_by_id.in_(dept_user_ids)).all()
    else:
        return db.query(Booking).filter(Booking.booked_by_id == current_user.id).all()


@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if booking_in.start_time >= booking_in.end_time:
        raise HTTPException(
            status_code=400,
            detail="Reservation end time must be after start time"
        )

    asset = db.query(Asset).filter(Asset.id == booking_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    overlap = _check_booking_overlap(
        db, booking_in.asset_id, booking_in.start_time, booking_in.end_time
    )
    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Resource conflict: Asset '{asset.name}' is already reserved during this period."
        )

    is_manager = current_user.role in ["Admin", "Asset Manager"]
    initial_status = "Confirmed" if is_manager else "Pending"

    db_booking = Booking(
        asset_id=booking_in.asset_id,
        booked_by_id=current_user.id,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
        purpose=booking_in.purpose,
        status=initial_status,
    )
    db.add(db_booking)
    db.flush()

    if initial_status == "Confirmed":
        _allocate_asset_for_booking(db, db_booking, current_user.id)
        create_notification(
            db,
            current_user.id,
            "Resource Reserved & Allocated",
            f"Asset '{asset.name}' has been reserved and allocated to you.",
            "bookings",
        )
        log_activity(
            db, current_user.id, "Create Booking",
            f"Booked and allocated asset {asset.name} from {booking_in.start_time} to {booking_in.end_time}",
        )
    else:
        create_notification(
            db,
            current_user.id,
            "Booking Request Submitted",
            f"Your reservation request for '{asset.name}' is pending manager approval.",
            "bookings",
        )
        _notify_managers(
            db,
            "Booking Approval Required",
            f"{current_user.full_name} requested to book '{asset.name}' from {booking_in.start_time.strftime('%b %d, %H:%M')} to {booking_in.end_time.strftime('%b %d, %H:%M')}.",
            "approvals",
        )
        log_activity(
            db, current_user.id, "Request Booking",
            f"Requested booking for {asset.name} from {booking_in.start_time} to {booking_in.end_time}",
        )

    db.commit()
    db.refresh(db_booking)

    return db_booking


@router.post("/{id}/process", response_model=BookingOut)
def process_booking(
    id: int,
    action: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"])),
):
    booking = db.query(Booking).filter(Booking.id == id, Booking.status == "Pending").first()
    if not booking:
        raise HTTPException(status_code=404, detail="Pending booking request not found")

    asset = db.query(Asset).filter(Asset.id == booking.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if action.status == "Confirmed":
        overlap = _check_booking_overlap(
            db, booking.asset_id, booking.start_time, booking.end_time, exclude_booking_id=booking.id
        )
        if overlap:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve: Asset '{asset.name}' has a conflicting reservation during this period.",
            )
        booking.status = "Confirmed"
        _allocate_asset_for_booking(db, booking, current_user.id)
        create_notification(
            db,
            booking.booked_by_id,
            "Booking Approved & Allocated",
            f"Your reservation for '{asset.name}' was approved and the asset has been allocated to you.",
            "bookings",
        )
        log_activity(
            db, current_user.id, "Approve Booking",
            f"Approved booking ID {booking.id} for {asset.name}",
        )
    elif action.status == "Rejected":
        booking.status = "Rejected"
        create_notification(
            db,
            booking.booked_by_id,
            "Booking Rejected",
            f"Your reservation request for '{asset.name}' was rejected.",
            "bookings",
        )
        log_activity(
            db, current_user.id, "Reject Booking",
            f"Rejected booking ID {booking.id} for {asset.name}",
        )
    else:
        raise HTTPException(status_code=400, detail="Status must be 'Confirmed' or 'Rejected'")

    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{id}/cancel", response_model=BookingOut)
def cancel_booking(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    if booking.booked_by_id != current_user.id and current_user.role not in ["Admin", "Asset Manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this reservation"
        )

    if booking.status not in ["Pending", "Confirmed"]:
        raise HTTPException(status_code=400, detail="This reservation cannot be cancelled")

    was_confirmed = booking.status == "Confirmed"
    booking.status = "Cancelled"

    if was_confirmed:
        _deallocate_asset_for_booking(db, booking)

    db.commit()
    db.refresh(booking)

    log_activity(db, current_user.id, "Cancel Booking", f"Cancelled reservation for booking ID {booking.id}")
    return booking
