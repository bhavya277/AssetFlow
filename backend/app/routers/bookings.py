from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_activity, create_notification
from app.models.models import Booking, Asset, User
from app.schemas.schemas import BookingOut, BookingCreate

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.get("/", response_model=List[BookingOut])
def get_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Booking).all()

@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify times
    if booking_in.start_time >= booking_in.end_time:
        raise HTTPException(
            status_code=400,
            detail="Reservation end time must be after start time"
        )

    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == booking_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Business Rule: Prevent Booking Overlaps on the same asset
    overlap = db.query(Booking).filter(
        Booking.asset_id == booking_in.asset_id,
        Booking.status == "Confirmed",
        Booking.start_time < booking_in.end_time,
        Booking.end_time > booking_in.start_time
    ).first()

    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Resource conflict: Asset '{asset.name}' is already reserved during this period."
        )

    db_booking = Booking(
        asset_id=booking_in.asset_id,
        booked_by_id=current_user.id,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
        purpose=booking_in.purpose,
        status="Confirmed"
      )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    # Notification & Log
    create_notification(
        db,
        current_user.id,
        "Resource Reserved",
        f"You have reserved asset '{asset.name}' from {booking_in.start_time.strftime('%b %d, %H:%M')} to {booking_in.end_time.strftime('%b %d, %H:%M')}",
        "bookings"
    )
    log_activity(db, current_user.id, "Create Booking", f"Booked asset {asset.name} from {booking_in.start_time} to {booking_in.end_time}")

    return db_booking

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

    booking.status = "Cancelled"
    db.commit()
    db.refresh(booking)

    log_activity(db, current_user.id, "Cancel Booking", f"Cancelled reservation for booking ID {booking.id}")
    return booking
