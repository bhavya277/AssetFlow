from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.models import Department, AssetCategory
from app.routers import auth, users, departments, categories, assets, allocations, bookings, maintenance, audits, notifications, reports

# Automatically create database tables
Base.metadata.create_all(bind=engine)

# Seed default data if empty
db = SessionLocal()
try:
    if db.query(Department).count() == 0:
        depts = [
            Department(name="IT & Infrastructure", description="Internal technology support, laptops, networks and servers"),
            Department(name="Operations", description="Core business execution and logistics"),
            Department(name="Sales & Marketing", description="Customer acquisition and branding"),
            Department(name="Human Resources", description="Employee relations and recruitment"),
            Department(name="Finance & Accounting", description="Budgeting, expenditures and financial tracking")
        ]
        db.add_all(depts)
        db.commit()

    if db.query(AssetCategory).count() == 0:
        cats = [
            AssetCategory(name="Laptops & Workstations", description="Development laptops, macbooks, monitors, and desktops"),
            AssetCategory(name="Mobile Devices", description="Company cellphones, tablets, and testing devices"),
            AssetCategory(name="Audiovisual & Meeting Room", description="Projectors, conference cams, speakers, and smartboards"),
            AssetCategory(name="Vehicles", description="Company cars, delivery vans, and shuttle services"),
            AssetCategory(name="Office Furniture", description="Desks, ergonomic chairs, and filling cabinets")
        ]
        db.add_all(cats)
        db.commit()
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(categories.router, prefix=settings.API_V1_STR)
app.include_router(assets.router, prefix=settings.API_V1_STR)
app.include_router(allocations.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(audits.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to AssetFlow API", "version": "1.0.0"}
