# AssetFlow — Enterprise Asset & Resource Management ERP

AssetFlow is a responsive, offline-ready Enterprise Resource Planning (ERP) platform designed to track corporate physical assets, manage custodian allocations, facilitate resource bookings, coordinate maintenance, and conduct physical inventory audits. 

Built using a highly modular architecture, it enforces strict **Role-Based Access Control (RBAC)** across four specific user roles: **Admin, Asset Manager, Department Head, and Employee**.

---

## 🚀 Key Features

* **Executive Dashboard:** Real-time KPI summary counts, a Category Utilization Bar Chart, and a Maintenance Expense Area Chart pulling dynamic records queryable directly from the local database.
* **Role-Based Access Control (RBAC):** Navigation links, page views, and API operations are strictly scoped based on the logged-in user's role (Admin, Asset Manager, Department Head, Employee).
* **Asset Directory & Passport:** Complete asset inventory index with search and category filters. Features an **Asset Passport** detailing the chronological timeline of allocations, transfers, maintenance logs, and audit checks for each item, including custom-rendered standard QR Code symbols.
* **Allocation & Transfer Workflows:** Direct allocation of available assets to users. Includes request workflows for peer-to-peer transfers, with multi-level approval restrictions scoped to department lines.
* **Conflict-Free Resource Booking:** Reservation system for shared resources (fleet cars, conference bays, projectors) that checks for start/end time overlaps to prevent double-booking.
* **Maintenance State Machine:** Progression tracker (`Requested → In Progress → Awaiting Parts → Done`) that automatically synchronizes the asset's availability status (e.g. marking it "Under Maintenance" during servicing and returning it to "Available" when done).
* **Physical Asset Audits:** Admin/Manager led audit sessions to verify physical asset presence, log condition updates, highlight discrepancy flags, and generate progress analytics.
* **Reports & PDF Exports:** Summarized fleet cost indicators, top idle resources, frequent maintenance targets, and CSV/PDF export helpers.
* **Inbox Notifications & Activity Trails:** Dedicated inbox for allocation updates, booking approvals, and transfer requests, with an admin-facing activity trail audit log.

---

## 🛠️ Technology Stack

* **Backend:** FastAPI (Python), SQLAlchemy ORM, Pydantic (data parsing/validation), SQLite (Local database).
* **Frontend:** React (TypeScript), Vite (build runner), Tailwind CSS (Aesthetics), Recharts (data visualizations), Framer Motion (page transitions).
* **Development & Tooling:** Git (version control).

---

## 📂 Project Structure

```text
AssetFlow/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── core/             # DB setup, security, RBAC dependencies
│   │   ├── models/           # SQLAlchemy DB Models
│   │   ├── routers/          # API Route controllers (assets, bookings, audits, etc.)
│   │   ├── schemas/          # Pydantic request/response validation schemas
│   │   └── main.py           # FastAPI initialization & seeding
│   ├── requirements.txt      # Python dependencies
│   └── seed_real_data.py     # Database seeding script (realistic mock data)
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # Reusable layout parts (Sidebar, Header, QR Visualizer)
│   │   ├── context/          # Auth Context, Toast notifications
│   │   ├── pages/            # View components (Dashboard, Assets, Bookings, Audits, etc.)
│   │   ├── utils/            # Helper utils (PDF generation, date formatters)
│   │   └── App.tsx           # Route definitions & guards
│   ├── vite.config.ts        # Vite configuration (Port 3000)
│   └── package.json          # Node dependencies
└── README.md                 # This overview file
```

---

## 📦 Installation & Setup

### Prerequisites
* Python 3.10 or higher
* Node.js 18 or higher (with `npm`)

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   * The API documentation will be available at `http://127.0.0.1:8000/docs` (Swagger UI).
   * A local database file `assetflow.db` is auto-created and populated with default categories.

5. **(Recommended) Seed realistic mock data:**
   Open a separate terminal window (with the backend virtual environment active) and run:
   ```bash
   python seed_real_data.py
   ```
   This will populate the database with realistic assets, allocations, repair records, and bookings to populate the dashboard analytics.

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   * The app opens at `http://localhost:3000`.

---

## 🔒 Security & Data Scoping

AssetFlow enforces security across both stack layers:

1. **Request Verification:** All protected FastAPI endpoints validate requests using JWT authentication Bearer tokens parsed from request headers.
2. **Access Scoping:**
   * **Admin & Asset Manager:** Full API access to manage inventory, register assets, configure parameters, and audit catalogs.
   * **Department Head:** Restricted to viewing and approving transfers or allocations involving users belonging to their department.
   * **Employee:** Can only fetch their own allocations, bookings, and submitted maintenance logs.
3. **Route Guards:** The frontend React router uses a custom `RoleRoute` wrapper to block unauthorized navigation and redirect clients to the Dashboard.

---

## 📄 License & Standards
This project is configured as a fully offline-capable workspace requiring no external cloud connections. Code syntax matches PEP8 styling conventions on python modules and TypeScript standard declarations on frontend files.
