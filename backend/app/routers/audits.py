from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity, create_notification
from app.models.models import AuditSession, AuditLog, Asset, User
from app.schemas.schemas import AuditSessionOut, AuditSessionCreate, AuditLogOut, AuditLogCreate

router = APIRouter(prefix="/audits", tags=["audits"])

@router.get("/sessions", response_model=List[AuditSessionOut])
def get_audit_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    return db.query(AuditSession).all()

@router.get("/sessions/{id}", response_model=Dict[str, Any])
def get_audit_session_details(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    session = db.query(AuditSession).filter(AuditSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Audit session not found")

    # Fetch completed audits
    logs = db.query(AuditLog).filter(AuditLog.audit_session_id == id).all()
    audited_asset_ids = [log.asset_id for log in logs]

    # Fetch pending assets (all assets not in audited_asset_ids)
    pending_assets = db.query(Asset).filter(~Asset.id.in_(audited_asset_ids)).all() if audited_asset_ids else db.query(Asset).all()

    # Calculate completion percentage
    total_assets = db.query(Asset).count()
    completed_count = len(logs)
    progress_percentage = round((completed_count / total_assets) * 100) if total_assets > 0 else 0

    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at,
        "status": session.status,
        "auditor": {
            "id": session.auditor.id,
            "full_name": session.auditor.full_name,
            "email": session.auditor.email
        },
        "progress": progress_percentage,
        "completed_audits": [
            {
                "id": log.id,
                "asset_id": log.asset_id,
                "asset_name": log.asset.name,
                "serial_number": log.asset.serial_number,
                "audited_at": log.audited_at,
                "verified": log.verified,
                "condition_match": log.condition_match,
                "notes": log.notes
            } for log in logs
        ],
        "pending_assets": [
            {
                "id": asset.id,
                "name": asset.name,
                "serial_number": asset.serial_number,
                "location": asset.location,
                "condition": asset.condition
            } for asset in pending_assets
        ]
    }

@router.post("/sessions", response_model=AuditSessionOut, status_code=status.HTTP_201_CREATED)
def start_audit_session(
    session_in: AuditSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    # Check if there is already an active session
    active = db.query(AuditSession).filter(AuditSession.status == "In Progress").first()
    if active:
        raise HTTPException(
            status_code=400,
            detail=f"An audit session ('{active.title}') is already in progress. Complete it first."
        )

    db_session = AuditSession(
        title=session_in.title,
        status="In Progress",
        auditor_id=current_user.id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    log_activity(db, current_user.id, "Start Audit Session", f"Started audit session: {db_session.title}")
    return db_session

@router.post("/sessions/{session_id}/logs", response_model=AuditLogOut, status_code=status.HTTP_201_CREATED)
def submit_audit_log(
    session_id: int,
    log_in: AuditLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    # Verify session is active
    session = db.query(AuditSession).filter(AuditSession.id == session_id, AuditSession.status == "In Progress").first()
    if not session:
        raise HTTPException(status_code=400, detail="Active audit session not found or already completed")

    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == log_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Prevent auditing same asset twice in same session
    duplicate = db.query(AuditLog).filter(
        AuditLog.audit_session_id == session_id,
        AuditLog.asset_id == log_in.asset_id
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Asset has already been audited in this session")

    # Submit audit log
    db_log = AuditLog(
        audit_session_id=session_id,
        asset_id=log_in.asset_id,
        verified=log_in.verified,
        condition_match=log_in.condition_match,
        notes=log_in.notes
    )
    db.add(db_log)

    # Optional: Update asset condition if audited condition is different
    if log_in.condition_match != "Match" and log_in.notes:
        # Flagged condition, let's create a notification
        create_notification(
            db,
            session.auditor_id,
            "Asset Audit Discrepancy",
            f"Asset '{asset.name}' has been flagged during audit: {log_in.notes}",
            "alerts"
        )

    db.commit()
    db.refresh(db_log)

    log_activity(db, current_user.id, "Submit Audit Log", f"Audited asset {asset.name} in session {session.title}")
    return db_log

@router.post("/sessions/{id}/complete", response_model=AuditSessionOut)
def complete_audit_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    session = db.query(AuditSession).filter(AuditSession.id == id, AuditSession.status == "In Progress").first()
    if not session:
        raise HTTPException(status_code=404, detail="Active audit session not found")

    session.status = "Completed"
    db.commit()
    db.refresh(session)

    log_activity(db, current_user.id, "Complete Audit Session", f"Completed audit session: {session.title}")
    return session
