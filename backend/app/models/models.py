from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    users = relationship("User", back_populates="department")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="Employee")  # Admin, Asset Manager, Department Head, Employee
    is_active = Column(Boolean, default=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="users")
    
    # Relationships for audits, bookings, notifications
    notifications = relationship("Notification", back_populates="user")
    bookings = relationship("Booking", back_populates="booked_by")
    allocations = relationship("Allocation", foreign_keys="[Allocation.allocated_to_id]", back_populates="allocated_to")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    department = relationship("Department")
    user = relationship("User")

class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    assets = relationship("Asset", back_populates="category")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    serial_number = Column(String, unique=True, index=True, nullable=False)
    qr_code_key = Column(String, unique=True, index=True, nullable=False)
    condition = Column(String, default="Excellent")  # Excellent, Good, Warning, Critical
    health_score = Column(Integer, default=100)
    location = Column(String, nullable=False)
    status = Column(String, default="Available")  # Available, Allocated, Under Maintenance, Retired
    warranty_expiry = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("asset_categories.id"), nullable=False)
    current_holder_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    category = relationship("AssetCategory", back_populates="assets")
    current_holder = relationship("User")
    allocations = relationship("Allocation", back_populates="asset")
    transfers = relationship("Transfer", back_populates="asset")
    bookings = relationship("Booking", back_populates="asset")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="asset")

class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    allocated_to_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    allocated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    allocated_at = Column(DateTime, default=datetime.utcnow)
    returned_at = Column(DateTime, nullable=True)
    status = Column(String, default="Active")  # Active, Returned

    asset = relationship("Asset", back_populates="allocations")
    allocated_to = relationship("User", foreign_keys=[allocated_to_id], back_populates="allocations")
    allocated_by = relationship("User", foreign_keys=[allocated_by_id])

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="Pending")  # Pending, Approved, Rejected
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    asset = relationship("Asset", back_populates="transfers")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    target_employee = relationship("User", foreign_keys=[target_employee_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    booked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    purpose = Column(String, nullable=False)
    status = Column(String, default="Confirmed")  # Confirmed, Cancelled

    asset = relationship("Asset", back_populates="bookings")
    booked_by = relationship("User", back_populates="bookings")

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    technician_name = Column(String, nullable=True)
    description = Column(String, nullable=False)
    priority = Column(String, default="Medium")  # Low, Medium, High, Critical
    cost = Column(Float, default=0.0)
    status = Column(String, default="Requested")  # Requested, In Progress, Awaiting Parts, Done
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    asset = relationship("Asset", back_populates="maintenance_tasks")
    reported_by = relationship("User")

class AuditSession(Base):
    __tablename__ = "audit_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="In Progress")  # In Progress, Completed
    auditor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    auditor = relationship("User")
    logs = relationship("AuditLog", back_populates="session")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    audit_session_id = Column(Integer, ForeignKey("audit_sessions.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    audited_at = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=False)
    condition_match = Column(String, nullable=False)  # Match, Mismatch, etc.
    notes = Column(String, nullable=True)

    session = relationship("AuditSession", back_populates="logs")
    asset = relationship("Asset")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    category = Column(String, default="alerts")  # approvals, alerts, bookings, returns
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
