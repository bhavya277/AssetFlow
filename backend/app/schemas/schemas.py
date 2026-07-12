from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ----------------- TOKEN -----------------
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# ----------------- DEPARTMENT -----------------
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    class Config:
        from_attributes = True

# ----------------- USER -----------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "Employee"
    department_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[int] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    class Config:
        from_attributes = True

# ----------------- EMPLOYEE -----------------
class EmployeeBase(BaseModel):
    email: EmailStr
    full_name: str
    department_id: int
    user_id: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeOut(EmployeeBase):
    id: int
    department: Optional[DepartmentOut] = None
    class Config:
        from_attributes = True


# ----------------- CATEGORY -----------------
class AssetCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class AssetCategoryCreate(AssetCategoryBase):
    pass

class AssetCategoryOut(AssetCategoryBase):
    id: int
    class Config:
        from_attributes = True

# ----------------- ASSET -----------------
class AssetBase(BaseModel):
    name: str
    serial_number: str
    qr_code_key: str
    condition: Optional[str] = "Excellent"
    health_score: Optional[int] = 100
    location: str
    status: Optional[str] = "Available"
    warranty_expiry: Optional[str] = None
    category_id: int
    current_holder_id: Optional[int] = None

class AssetCreate(AssetBase):
    pass

class AssetOut(AssetBase):
    id: int
    category: Optional[AssetCategoryOut] = None
    current_holder: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ----------------- ALLOCATION -----------------
class AllocationBase(BaseModel):
    asset_id: int
    allocated_to_id: int

class AllocationCreate(AllocationBase):
    pass

class AllocationOut(BaseModel):
    id: int
    asset_id: int
    allocated_to_id: int
    allocated_by_id: int
    allocated_at: datetime
    returned_at: Optional[datetime] = None
    status: str
    asset: Optional[AssetOut] = None
    allocated_to: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ----------------- TRANSFER -----------------
class TransferBase(BaseModel):
    asset_id: int
    target_employee_id: int

class TransferCreate(TransferBase):
    pass

class TransferUpdate(BaseModel):
    status: str  # Approved, Rejected

class TransferOut(BaseModel):
    id: int
    asset_id: int
    requested_by_id: int
    target_employee_id: int
    status: str
    approved_by_id: Optional[int] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None
    asset: Optional[AssetOut] = None
    requested_by: Optional[UserOut] = None
    target_employee: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ----------------- BOOKING -----------------
class BookingBase(BaseModel):
    asset_id: int
    start_time: datetime
    end_time: datetime
    purpose: str

class BookingCreate(BookingBase):
    pass

class BookingOut(BaseModel):
    id: int
    asset_id: int
    booked_by_id: int
    start_time: datetime
    end_time: datetime
    purpose: str
    status: str
    asset: Optional[AssetOut] = None
    booked_by: Optional[UserOut] = None
    class Config:
        from_attributes = True

# ----------------- MAINTENANCE -----------------
class MaintenanceTaskBase(BaseModel):
    asset_id: int
    description: str
    priority: Optional[str] = "Medium"

class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass

class MaintenanceTaskUpdate(BaseModel):
    technician_name: Optional[str] = None
    status: Optional[str] = None
    cost: Optional[float] = None

class MaintenanceTaskOut(BaseModel):
    id: int
    asset_id: int
    reported_by_id: int
    technician_name: Optional[str] = None
    description: str
    priority: str
    cost: float
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    asset: Optional[AssetOut] = None
    class Config:
        from_attributes = True

# ----------------- AUDIT -----------------
class AuditSessionBase(BaseModel):
    title: str

class AuditSessionCreate(AuditSessionBase):
    pass

class AuditSessionOut(AuditSessionBase):
    id: int
    created_at: datetime
    status: str
    auditor_id: int
    auditor: Optional[UserOut] = None
    class Config:
        from_attributes = True

class AuditLogBase(BaseModel):
    asset_id: int
    verified: bool
    condition_match: str
    notes: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    id: int
    audit_session_id: int
    audited_at: datetime
    asset: Optional[AssetOut] = None
    class Config:
        from_attributes = True

# ----------------- NOTIFICATION -----------------
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ----------------- ACTIVITY LOG -----------------
class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    details: str
    created_at: datetime
    user: Optional[UserOut] = None
    class Config:
        from_attributes = True
