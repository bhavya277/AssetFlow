from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity
from app.models.models import User, Employee, Department
from app.schemas.schemas import UserOut, UserUpdate, EmployeeOut, EmployeeCreate

router = APIRouter(prefix="/users", tags=["users"])

# Admin and Asset Manager can view users
@router.get("/", response_model=List[UserOut])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    return db.query(User).all()

# Admin can assign roles
@router.put("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from demoting themselves
    if user.id == current_user.id and user_update.role and user_update.role != "Admin":
        raise HTTPException(status_code=400, detail="You cannot change your own admin role")

    old_role = user.role
    if user_update.role:
        if user_update.role not in ["Admin", "Asset Manager", "Department Head", "Employee"]:
            raise HTTPException(status_code=400, detail="Invalid role name")
        user.role = user_update.role
        
    if user_update.department_id is not None:
        dept = db.query(Department).filter(Department.id == user_update.department_id).first()
        if not dept and user_update.department_id != 0:
            raise HTTPException(status_code=404, detail="Department not found")
        user.department_id = user_update.department_id if user_update.department_id != 0 else None

    db.commit()
    db.refresh(user)
    log_activity(db, current_user.id, "User Role Update", f"Updated user {user.email} role from {old_role} to {user.role}")
    return user

# List employees
@router.get("/employees", response_model=List[EmployeeOut])
def get_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Employee).all()

# Create employee (Admin, Asset Manager)
@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    # Check if employee email already exists
    existing = db.query(Employee).filter(Employee.email == employee_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this email already exists")

    # Verify department
    dept = db.query(Department).filter(Department.id == employee_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Try to link to a User with the same email if exists
    linked_user = db.query(User).filter(User.email == employee_in.email).first()
    user_id = linked_user.id if linked_user else None

    employee = Employee(
        email=employee_in.email,
        full_name=employee_in.full_name,
        department_id=employee_in.department_id,
        user_id=user_id
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    log_activity(db, current_user.id, "Create Employee", f"Created employee profile for {employee.email}")
    return employee
