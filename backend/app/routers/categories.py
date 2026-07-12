from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker, log_activity
from app.models.models import AssetCategory, User
from app.schemas.schemas import AssetCategoryOut, AssetCategoryCreate

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[AssetCategoryOut])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AssetCategory).all()

@router.post("/", response_model=AssetCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: AssetCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Asset Manager"]))
):
    existing = db.query(AssetCategory).filter(AssetCategory.name == cat_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    cat = AssetCategory(name=cat_in.name, description=cat_in.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_activity(db, current_user.id, "Create Category", f"Created asset category {cat.name}")
    return cat
