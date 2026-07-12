<p align="center">
  <img src="https://img.shields.io/badge/AssetFlow-Enterprise%20Asset%20Management-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01eiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDUgMTAtNSIvPjxwYXRoIGQ9Ik0yIDEybDEwIDUgMTAtNSIvPjwvc3ZnPg==&labelColor=1e1b4b" alt="AssetFlow" />
</p>

<h1 align="center">AssetFlow</h1>

<p align="center">
  <strong>Enterprise-Grade Asset Lifecycle Management Platform</strong><br />
  Track, allocate, maintain, audit, and report on every asset across your organization — from procurement to retirement.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20RBAC-f59e0b?style=flat-square&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Build-Vite-646cff?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Users & Employees](#users--employees)
  - [Departments](#departments)
  - [Asset Categories](#asset-categories)
  - [Assets](#assets)
  - [Allocations & Transfers](#allocations--transfers)
  - [Bookings](#bookings)
  - [Maintenance](#maintenance)
  - [Audits](#audits)
  - [Notifications & Activity Logs](#notifications--activity-logs)
  - [Reports](#reports)
  - [Dashboard](#dashboard)
- [Frontend Application](#frontend-application)
  - [Pages](#pages)
  - [Components](#components)
  - [Context Providers](#context-providers)
  - [Utility Functions](#utility-functions)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**AssetFlow** is a full-stack, enterprise-grade asset lifecycle management platform built for organizations that need to track, allocate, maintain, and audit physical and digital assets at scale.

It provides a modern, responsive dashboard with real-time analytics, role-based access control (RBAC) supporting four organizational roles, QR-code-based asset identification, approval workflows for transfers and bookings, a full audit trail, and client-side PDF report generation — all wrapped in a premium, dark-mode-ready UI.

---

## Key Features

| Category | Capabilities |
|---|---|
| **Asset Registry** | Register assets with serial numbers, auto-generated QR codes, health scores, warranty tracking, and category classification. |
| **Asset Passport** | Detailed per-asset view with lifecycle timeline, allocation history, maintenance records, and downloadable verification documents (Warranty Certificate, Operational Manual). |
| **Allocation Management** | Allocate assets to employees, process returns, and maintain a complete chain-of-custody audit trail. |
| **Transfer Workflows** | Request, approve, or reject asset transfers between employees with multi-level approval routing and automatic re-allocation. |
| **Resource Booking** | Schedule shared resources with overlap detection, manager approval workflows, and automatic allocation on confirmation. |
| **Maintenance Tracking** | Report issues, assign technicians, track repair costs, manage priority levels (Low → Critical), and auto-update asset status on resolution. |
| **Audit Sessions** | Create audit sessions, verify assets individually, flag condition discrepancies, track progress percentages, and prevent duplicate audits. |
| **Analytics & Reports** | Utilization rates, category breakdowns (via Recharts), maintenance cost trends, idle asset reports, and frequently-maintained asset rankings. |
| **Notifications** | Real-time, categorized notifications (Alerts, Approvals, Bookings, Returns) with read/unread state management. |
| **Organization Management** | Manage departments, asset categories, employee directory, and user role assignments. Admin-only user account management panel. |
| **QR Code System** | Auto-generated, theme-aware QR codes for every asset. Scannable codes display full asset information. |
| **PDF Generation** | Client-side warranty certificate and operational manual PDF generation via `jspdf`. |
| **Dark Mode** | Full dark/light theme support across every page and component. |
| **Command Palette** | Keyboard-driven navigation (`Ctrl+K`) for power users. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                     │
│  Vite · TypeScript · Tailwind CSS · Framer Motion · Recharts│
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Pages   │ │Components│ │ Context  │ │   Utilities   │  │
│  │ (12 pgs) │ │(Sidebar, │ │(Auth,    │ │(PDF Gen,      │  │
│  │          │ │ Header,  │ │ Toast)   │ │ QR Codes)     │  │
│  │          │ │ CmdPlt)  │ │          │ │               │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│                         ▼ Axios HTTP                        │
├─────────────────────────────────────────────────────────────┤
│                   Backend (FastAPI)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Routers  │ │  Models  │ │ Schemas  │ │     Core      │  │
│  │(12 mods) │ │(SQLAlch.)│ │(Pydantic)│ │(Auth, DB,     │  │
│  │          │ │          │ │          │ │ RBAC, Config)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│                         ▼ SQLAlchemy ORM                    │
├─────────────────────────────────────────────────────────────┤
│              Database (SQLite / PostgreSQL)                  │
│           12 tables · Auto-migration on startup             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | High-performance async Python web framework |
| **SQLAlchemy** | ORM for database models and queries |
| **Pydantic v2** | Request/response validation and serialization |
| **python-jose** | JWT token creation and verification |
| **passlib + bcrypt** | Password hashing |
| **Uvicorn** | ASGI server |
| **SQLite** | Default embedded database (zero-config) |
| **PostgreSQL** | Production-ready database (optional) |

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI component library |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Lightning-fast build tooling and HMR |
| **Tailwind CSS 3** | Utility-first styling with dark mode |
| **Framer Motion** | Page transitions and micro-animations |
| **Recharts** | Interactive data visualization charts |
| **React Router v7** | Client-side routing |
| **React Hook Form + Zod** | Form validation |
| **Axios** | HTTP client for API communication |
| **Lucide React** | Icon system |
| **qrcode** | QR code generation |
| **jspdf + jspdf-autotable** | Client-side PDF generation |

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git**

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/AssetFlow.git
cd AssetFlow

# 2. Create and activate a virtual environment
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`.  
Interactive API documentation (Swagger UI) is available at `http://127.0.0.1:8000/docs`.

> **Note:** On first launch, the database is auto-created (`assetflow.db`) and seeded with 5 default departments and 5 default asset categories. The first registered user automatically receives the **Admin** role.

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Role-Based Access Control (RBAC)

AssetFlow implements a four-tier RBAC model. Each role has progressively broader permissions:

| Role | Permissions |
|---|---|
| **Admin** | Full system access. Manage users, roles, departments, categories, assets, allocations, transfers, bookings, maintenance, audits, reports, and notifications. Can promote/demote any user except themselves. |
| **Asset Manager** | Manage assets, allocations, transfers, bookings, maintenance, audits, and reports. Cannot manage user roles. |
| **Department Head** | View and approve transfers/bookings within their department. View department-scoped allocations and maintenance tasks. |
| **Employee** | View own allocations, transfers, and bookings. Request transfers for self-held assets. Submit maintenance requests for allocated assets. Book shared resources (pending approval). |

> The first user to register is automatically granted the **Admin** role. All subsequent users receive the **Employee** role by default. Admins can change roles from the **Organization → User Accounts** tab.

---

## Database Schema

AssetFlow uses **12 relational tables** managed by SQLAlchemy ORM:

| Table | Description | Key Fields |
|---|---|---|
| `departments` | Organizational units | `name`, `description` |
| `users` | Authenticated accounts | `email`, `hashed_password`, `full_name`, `role`, `is_active`, `department_id` |
| `employees` | Employee directory (synced from users) | `email`, `full_name`, `department_id`, `user_id` |
| `asset_categories` | Taxonomy for assets | `name`, `description` |
| `assets` | Physical/digital asset registry | `name`, `serial_number`, `qr_code_key`, `condition`, `health_score`, `location`, `status`, `warranty_expiry`, `category_id`, `current_holder_id` |
| `allocations` | Asset assignment records | `asset_id`, `allocated_to_id`, `allocated_by_id`, `allocated_at`, `returned_at`, `status` |
| `transfers` | Asset transfer requests | `asset_id`, `requested_by_id`, `target_employee_id`, `status`, `approved_by_id`, `requested_at`, `processed_at` |
| `bookings` | Resource reservations | `asset_id`, `booked_by_id`, `start_time`, `end_time`, `purpose`, `status` |
| `maintenance_tasks` | Repair and maintenance tracking | `asset_id`, `reported_by_id`, `technician_name`, `description`, `priority`, `cost`, `status`, `created_at`, `resolved_at` |
| `audit_sessions` | Audit campaign containers | `title`, `status`, `auditor_id`, `created_at` |
| `audit_logs` | Per-asset verification records | `audit_session_id`, `asset_id`, `verified`, `condition_match`, `notes`, `audited_at` |
| `notifications` | User notifications | `user_id`, `title`, `message`, `category`, `is_read`, `created_at` |
| `activity_logs` | Global activity audit trail | `user_id`, `action`, `details`, `created_at` |

---

## API Reference

All endpoints are prefixed with `/api/v1`. Authentication is via Bearer JWT tokens obtained from the login endpoint.

### Authentication

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `POST` | `/auth/signup` | Register a new user account | ✗ | Public |
| `POST` | `/auth/login` | Authenticate and receive a JWT token | ✗ | Public |
| `GET` | `/auth/me` | Retrieve the currently authenticated user | ✓ | All |

**`POST /auth/signup`** — Creates a new user. The first registered user is automatically assigned the `Admin` role; all others default to `Employee`. If a `department_id` is provided and the role is `Employee` or `Department Head`, a corresponding entry is auto-created in the `employees` table.

**`POST /auth/login`** — Accepts OAuth2 `username` (email) and `password` form fields. Returns `{ access_token, token_type }`. Rejects inactive accounts.

**`GET /auth/me`** — Returns the full user profile of the authenticated caller.

---

### Users & Employees

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/users/` | List all user accounts | ✓ | Admin, Asset Manager |
| `PUT` | `/users/{user_id}/role` | Update a user's role and/or department | ✓ | Admin |
| `GET` | `/users/employees` | List all employees (auto-synced from users) | ✓ | All |
| `POST` | `/users/employees` | Create a new employee record | ✓ | Admin, Asset Manager |

**`PUT /users/{user_id}/role`** — Accepts `{ role, department_id }`. Validates role against the allowed set (`Admin`, `Asset Manager`, `Department Head`, `Employee`). Prevents self-demotion by admins. Logs role changes to the activity trail.

**`GET /users/employees`** — For Admin/Asset Manager callers, this endpoint first synchronizes the `employees` table with the `users` table (creating missing employee records and updating existing ones).

**`POST /users/employees`** — Creates a standalone employee record. Automatically links to an existing `User` if one with the same email exists.

---

### Departments

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/departments/` | List all departments | ✗ | Public |
| `POST` | `/departments/` | Create a new department | ✓ | Admin, Asset Manager |

**`POST /departments/`** — Accepts `{ name, description }`. Enforces unique department names.

---

### Asset Categories

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/categories/` | List all asset categories | ✓ | All |
| `POST` | `/categories/` | Create a new asset category | ✓ | Admin, Asset Manager |

**`POST /categories/`** — Accepts `{ name, description }`. Enforces unique category names.

---

### Assets

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/assets/` | List all registered assets | ✓ | All |
| `GET` | `/assets/{id}` | Get a single asset by ID | ✓ | All |
| `POST` | `/assets/` | Register a new asset | ✓ | Admin, Asset Manager |
| `GET` | `/assets/{id}/timeline` | Get the full lifecycle timeline for an asset | ✓ | All |

**`POST /assets/`** — Accepts `{ name, serial_number, qr_code_key, condition, health_score, location, status, warranty_expiry, category_id, current_holder_id }`. Auto-generates a QR code key (format `AF-XXXXXXXXXX`) if not provided. Enforces unique serial numbers.

**`GET /assets/{id}/timeline`** — Returns a chronologically sorted array of all lifecycle events (Allocations, Returns, Transfers, Bookings, Maintenance Tasks, Audits) for a given asset, each with `type`, `date`, `title`, `description`, and `status` fields.

---

### Allocations & Transfers

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/allocations/` | List allocations (role-scoped) | ✓ | All |
| `POST` | `/allocations/` | Allocate an asset to a user | ✓ | Admin, Asset Manager |
| `POST` | `/allocations/{id}/return` | Return an allocated asset | ✓ | Admin, Asset Manager |
| `GET` | `/allocations/transfers` | List transfer requests (role-scoped) | ✓ | All |
| `POST` | `/allocations/transfers` | Request an asset transfer | ✓ | All |
| `POST` | `/allocations/transfers/{id}/process` | Approve or reject a transfer | ✓ | Admin, Asset Manager, Dept Head |

**Role Scoping:**
- **Admin / Asset Manager:** See all allocations and transfers.
- **Department Head:** See allocations/transfers within their department.
- **Employee:** See only their own allocations and transfers they initiated or are the target of.

**`POST /allocations/`** — Validates that the asset is `Available` and the recipient is an active user. Updates the asset's `status` to `Allocated` and sets `current_holder_id`. Sends a notification to the recipient and logs the activity.

**`POST /allocations/{id}/return`** — Marks the allocation as `Returned`, sets `returned_at`, and resets the asset status to `Available`.

**`POST /allocations/transfers`** — Employees can only request transfers for assets currently allocated to them. Creates a `Pending` transfer and notifies all Admin/Asset Manager users for approval.

**`POST /allocations/transfers/{id}/process`** — Accepts `{ status: "Approved" | "Rejected" }`. On approval: marks the previous allocation as `Returned`, creates a new `Active` allocation for the target employee, updates the asset's `current_holder_id`, and sends notifications to both parties. Department Heads are scoped to transfers involving members of their department.

---

### Bookings

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/bookings/` | List bookings (role-scoped) | ✓ | All |
| `POST` | `/bookings/` | Create a resource booking | ✓ | All |
| `POST` | `/bookings/{id}/process` | Approve or reject a pending booking | ✓ | Admin, Asset Manager |
| `POST` | `/bookings/{id}/cancel` | Cancel a booking | ✓ | All |

**Booking Logic:**
- **Admin / Asset Manager bookings** are auto-confirmed and the asset is immediately allocated.
- **Employee / Department Head bookings** are created as `Pending` and require manager approval.
- **Overlap detection** prevents double-booking of assets for the same time period.

**`POST /bookings/{id}/process`** — Accepts `{ status: "Confirmed" | "Rejected" }`. On confirmation, the asset is auto-allocated to the booker. Re-validates overlap before approving.

**`POST /bookings/{id}/cancel`** — Users can cancel their own bookings; Admins/Managers can cancel any booking. If the booking was `Confirmed`, the asset is automatically deallocated (returned to `Available`).

---

### Maintenance

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/maintenance/` | List maintenance tasks (role-scoped) | ✓ | All |
| `POST` | `/maintenance/` | Create a maintenance request | ✓ | All |
| `PUT` | `/maintenance/{id}` | Update a maintenance task | ✓ | Admin, Asset Manager |

**`POST /maintenance/`** — Employees can only create requests for assets currently allocated to them. Notifies all Admin/Asset Manager users. Asset status is **not** changed on creation — only on task status update.

**`PUT /maintenance/{id}`** — Accepts `{ status, technician_name, cost }`. Status transitions:
- `In Progress` / `Awaiting Parts` → Sets asset status to `Under Maintenance`.
- `Done` → Sets `resolved_at`, restores asset status to `Available`, and notifies the reporter.

---

### Audits

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/audits/sessions` | List all audit sessions | ✓ | Admin, Asset Manager |
| `GET` | `/audits/sessions/{id}` | Get session details with progress, completed logs, and pending assets | ✓ | Admin, Asset Manager |
| `POST` | `/audits/sessions` | Start a new audit session | ✓ | Admin, Asset Manager |
| `POST` | `/audits/sessions/{session_id}/logs` | Submit an audit log entry for an asset | ✓ | Admin, Asset Manager |
| `POST` | `/audits/sessions/{id}/complete` | Mark an audit session as completed | ✓ | Admin, Asset Manager |

**`POST /audits/sessions`** — Only one `In Progress` session can exist at a time. Creates a session tied to the authenticated auditor.

**`POST /audits/sessions/{session_id}/logs`** — Verifies the session is active, the asset exists, and the asset hasn't already been audited in this session. Accepts `{ asset_id, verified, condition_match, notes }`. Flags discrepancies via notifications.

**`GET /audits/sessions/{id}`** — Returns a rich response including completion percentage, list of already-audited assets, and list of pending (un-audited) assets.

---

### Notifications & Activity Logs

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/notifications/` | List notifications for the current user | ✓ | All |
| `PUT` | `/notifications/{id}/read` | Mark a notification as read | ✓ | All |
| `GET` | `/notifications/activity-logs` | List the last 100 global activity logs | ✓ | Admin, Asset Manager |

**Notification Categories:** `alerts`, `approvals`, `bookings`, `returns`. Notifications are auto-generated by business events (allocations, transfers, maintenance, bookings, audits).

---

### Reports

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/reports/summary` | Generate a comprehensive analytics report | ✓ | Admin, Asset Manager |

**Response includes:**
- `total_assets_count` — Total number of assets in the system.
- `utilization_rate` — Percentage of assets currently allocated.
- `total_maintenance_cost` — Sum of all maintenance task costs.
- `categories_utilization` — Per-category breakdown of total vs. allocated assets.
- `idle_assets` — Top 5 available assets ordered by health score.
- `frequently_maintained` — Top 5 assets by repair count, with total cost.
- `maintenance_trends` — Monthly maintenance task counts (12-month rolling).

---

### Dashboard

| Method | Endpoint | Description | Auth | Roles |
|---|---|---|---|---|
| `GET` | `/dashboard/` | Get role-scoped dashboard data | ✓ | All |

**Response includes:**
- `stats` — `total_assets` (role-scoped count), `utilization_rate`, `pending_transfers`, `active_maintenance`.
- `categories_utilization` — Per-category asset allocation breakdown.
- `maintenance_trends` — Monthly maintenance volume (12-month rolling).
- `recent_activity` — Last 5 activity log entries (Admin/Manager only).

---

## Frontend Application

### Pages

| Page | File | Description |
|---|---|---|
| **Login** | `Login.tsx` | Email + password authentication form with branded hero panel. |
| **Signup** | `Signup.tsx` | Multi-field registration form with department selection and role assignment rules. |
| **Dashboard** | `Dashboard.tsx` | KPI stat cards, category utilization pie chart, maintenance trend area chart, and recent activity feed. |
| **Asset Directory** | `AssetDirectory.tsx` | Searchable, filterable asset table with status badges, health bars, QR code visualizer, and detailed drawer panel. |
| **Asset Passport** | `AssetPassport.tsx` | Deep-dive asset profile with lifecycle timeline, allocation chain, and downloadable verification documents (Warranty PDF, Manual PDF). |
| **Allocations** | `Allocations.tsx` | Manage asset assignments and returns. View/create/approve/reject transfer requests. |
| **Bookings** | `Bookings.tsx` | Schedule shared resources. Approval workflow for non-manager roles. Cancel bookings. |
| **Maintenance** | `Maintenance.tsx` | Report issues, update task status, assign technicians, and track costs. |
| **Audits** | `Audits.tsx` | Start audit sessions, verify assets individually, track progress, and complete sessions. |
| **Reports** | `Reports.tsx` | Utilization analytics, category breakdowns, idle asset lists, frequently-maintained rankings, and monthly trends. |
| **Organization** | `Organization.tsx` | Manage departments, categories, employee directory. Admin-only User Accounts tab for role management. |
| **Notifications** | `Notifications.tsx` | Categorized notification center with read/unread state management and filtering. |

### Components

| Component | File | Description |
|---|---|---|
| **Sidebar** | `Sidebar.tsx` | Collapsible navigation sidebar with route links, role-based menu filtering, theme toggle, and user profile section. |
| **Header** | `Header.tsx` | Top bar with page title, notification bell with unread badge, search trigger, and mobile menu toggle. |
| **CommandPalette** | `CommandPalette.tsx` | `Ctrl+K` keyboard-driven command palette for quick navigation across all pages. |

### Context Providers

| Provider | File | Description |
|---|---|---|
| **AuthContext** | `AuthContext.tsx` | Manages JWT token storage, login/logout state, user profile hydration from `/auth/me`, and provides the `useAuth()` hook for global auth state access. |
| **ToastContext** | `ToastContext.tsx` | Animated toast notification system with auto-dismissal, success/error/info variants, and the `useToast()` hook. |

### Utility Functions

| Function | File | Description |
|---|---|---|
| `generateAssetReportPdf(assets)` | `pdf.ts` | Generates a multi-page PDF report of all assets with a table layout including Name, Serial Number, Category, Status, Location, Health Score, and Condition. |
| `generateWarrantyPdf(asset)` | `pdf.ts` | Generates a branded Warranty Certificate PDF for a specific asset, including serial number, warranty expiry, coverage terms, and organizational stamp. |
| `generateManualPdf(asset)` | `pdf.ts` | Generates an Operational Manual PDF for a specific asset, including safety guidelines, maintenance schedule, and operating procedures. |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `supersecretkeyforassetflowhackathon2026` | JWT signing secret. **Change in production.** |
| `DATABASE_URL` | `sqlite:///./assetflow.db` | Database connection string. Set to a PostgreSQL URL for production (e.g., `postgresql://user:pass@host:5432/assetflow`). |

---

## Project Structure

```
AssetFlow/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Application settings (API prefix, secrets, DB URL)
│   │   │   ├── database.py        # SQLAlchemy engine, session, and Base
│   │   │   ├── dependencies.py    # Auth dependencies (get_current_user, RoleChecker, log_activity, create_notification)
│   │   │   └── security.py        # Password hashing (bcrypt) and JWT token utilities
│   │   ├── models/
│   │   │   └── models.py          # SQLAlchemy ORM models (12 tables)
│   │   ├── routers/
│   │   │   ├── allocations.py     # Allocation CRUD + Transfer workflow
│   │   │   ├── assets.py          # Asset CRUD + Timeline
│   │   │   ├── audits.py          # Audit session + log management
│   │   │   ├── auth.py            # Signup, Login, Me
│   │   │   ├── bookings.py        # Booking CRUD + Approval + Cancellation
│   │   │   ├── categories.py      # Asset category CRUD
│   │   │   ├── dashboard.py       # Role-scoped dashboard aggregations
│   │   │   ├── departments.py     # Department CRUD
│   │   │   ├── maintenance.py     # Maintenance task lifecycle
│   │   │   ├── notifications.py   # Notification + Activity log retrieval
│   │   │   ├── reports.py         # Analytics and report generation
│   │   │   └── users.py           # User list, role update, employee CRUD
│   │   ├── schemas/
│   │   │   └── schemas.py         # Pydantic v2 request/response models
│   │   ├── analytics.py           # Category utilization + maintenance trend queries
│   │   └── main.py                # FastAPI app init, CORS, router registration, seed data
│   └── requirements.txt           # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandPalette.tsx  # Ctrl+K command palette
│   │   │   ├── Header.tsx         # Top navigation bar
│   │   │   └── Sidebar.tsx        # Collapsible sidebar navigation
│   │   ├── context/
│   │   │   ├── AuthContext.tsx     # JWT auth state management
│   │   │   └── ToastContext.tsx    # Toast notification system
│   │   ├── pages/
│   │   │   ├── Allocations.tsx    # Asset allocation & transfers
│   │   │   ├── AssetDirectory.tsx # Asset registry with QR codes
│   │   │   ├── AssetPassport.tsx  # Detailed asset profile
│   │   │   ├── Audits.tsx         # Audit session management
│   │   │   ├── Bookings.tsx       # Resource reservation system
│   │   │   ├── Dashboard.tsx      # Analytics dashboard
│   │   │   ├── Login.tsx          # Authentication - login
│   │   │   ├── Maintenance.tsx    # Maintenance task management
│   │   │   ├── Notifications.tsx  # Notification center
│   │   │   ├── Organization.tsx   # Org settings & user management
│   │   │   ├── Reports.tsx        # Analytics reports
│   │   │   └── Signup.tsx         # Authentication - registration
│   │   ├── utils/
│   │   │   └── pdf.ts             # PDF generation utilities
│   │   ├── App.tsx                # Root component with routing & RBAC guards
│   │   ├── App.css                # Global styles
│   │   ├── index.css              # Tailwind directives & base styles
│   │   └── main.tsx               # React DOM entry point
│   ├── package.json               # NPM dependencies & scripts
│   └── index.html                 # HTML entry point
│
└── README.md                      # This file
```

---

## Contributing

1. **Fork** the repository.
2. Create a **feature branch** (`git checkout -b feature/your-feature-name`).
3. **Commit** your changes (`git commit -m 'feat: add your feature'`).
4. **Push** to your branch (`git push origin feature/your-feature-name`).
5. Open a **Pull Request**.

Please ensure all existing tests pass before submitting a PR.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the AssetFlow Team
</p>
