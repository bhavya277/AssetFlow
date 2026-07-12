# AssetFlow — Features & Usage Tutorial

Welcome to **AssetFlow**, an Enterprise Asset & Resource Management ERP system. This guide walks you through every feature, who can use it, and how to get the most out of the platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles](#user-roles)
3. [Dashboard](#dashboard)
4. [Organization Setup](#organization-setup)
5. [Asset Directory](#asset-directory)
6. [Allocation & Transfer](#allocation--transfer)
7. [Resource Booking](#resource-booking)
8. [Maintenance Management](#maintenance-management)
9. [Asset Audit](#asset-audit)
10. [Reports & Analytics](#reports--analytics)
11. [Notifications & Logs](#notifications--logs)
12. [Common Workflows](#common-workflows)
13. [Role Permission Reference](#role-permission-reference)

---

## Getting Started

### First-Time Setup

1. **Start the backend server:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   The database is automatically created and seeded with default departments and asset categories.

2. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The app opens at `http://localhost:3000`.

3. **Register the first user** — this user automatically becomes the **Admin**.

4. All subsequent users who register receive the **Employee** role by default. Only an Admin can promote users to other roles.

### Signing Up

1. Navigate to `/signup`
2. Fill in: Full Name, Work Email, Department, Password
3. Click **Register**
4. You'll be redirected to the login page

### Logging In

1. Navigate to `/login`
2. Enter your email and password
3. Click **Sign In**
4. You'll land on the Dashboard

---

## User Roles

AssetFlow has four user roles with different levels of access:

| Role | Description | Can See |
|------|-------------|---------|
| **Admin** | Full control over the entire system | All pages |
| **Asset Manager** | Manages assets, allocations, maintenance, audits | All pages except user role management |
| **Department Head** | Oversees their department's assets and people | Dashboard, Assets, Allocations, Bookings, Maintenance, Notifications |
| **Employee** | Basic user | Dashboard, Assets, Bookings, Maintenance, Notifications |

> **Important:** Only Admins can change user roles. The first user to register becomes the Admin automatically.

---

## Dashboard

**Who can access:** Everyone (all roles)

The Dashboard is your home base. It shows:

- **Total Assets Owned** — Count of all registered company assets
- **Utilization Rate** — Percentage of assets currently allocated vs. available
- **Pending Transfers** — Number of asset transfer requests awaiting approval
- **Active Maintenance** — Count of maintenance tasks currently in progress

It also displays:
- **Category Utilization Chart** — Bar chart showing how allocated each asset category is (Laptops, Vehicles, etc.)
- **Maintenance Cost Trends** — Area chart showing monthly maintenance expenditure
- **Recent Activity** — Latest system actions (visible to managers/admins)

---

## Organization Setup

**Who can access:** Admin, Asset Manager only

This page has three tabs for managing your company structure:

### Departments Tab
- View all company departments (IT, Operations, HR, Finance, etc.)
- **Add Department:** Click the "+ Add" button, enter name and description

### Employees Tab
- View all employee profiles with their linked departments
- **Add Employee:** Click "+ Add Employee", enter email, full name, and select department
- Employees are automatically linked to user accounts if the email matches

### Asset Categories Tab
- View categories like "Laptops & Workstations", "Vehicles", etc.
- **Add Category:** Click "+ Add", enter name and description

> **Tip:** Departments and categories are pre-seeded when the app starts for the first time.

---

## Asset Directory

**Who can access:** Everyone can view | Admin & Asset Manager can create

Browse all company assets in a searchable, filterable grid.

### Viewing Assets
- Each asset card shows: name, serial number, category, status, condition, location
- Status badges: `Available` (green), `Allocated` (blue), `Under Maintenance` (orange), `Retired` (gray)
- Click any asset to open its **Asset Passport** — a detailed timeline of everything that's happened to it

### Registering New Assets (Admin/Manager only)
1. Click **"+ Register Asset"**
2. Fill in: Name, Serial Number, Category, Location, Condition, Warranty Expiry
3. A QR code key is auto-generated if not provided
4. Click **Submit**

### Asset Passport
Click on any asset to see its full lifecycle:
- Allocation history (who had it and when)
- Transfer requests
- Booking reservations
- Maintenance records
- Audit verifications

---

## Allocation & Transfer

**Who can access:** Admin, Asset Manager, Department Head

### Allocations Tab

**Allocating an asset (Admin/Manager only):**
1. Click **"Allocate Asset"**
2. Select the asset (must be "Available") and the recipient user
3. Click **Submit**
4. The asset status changes to "Allocated" and the recipient gets a notification

**Returning an asset (Admin/Manager only):**
1. Find the active allocation in the list
2. Click the **"Return"** button
3. The asset returns to "Available" status

**What each role sees:**
- Admin/Manager: All allocations across the company
- Department Head: Allocations for users in their department
- Employee: Only their own allocations (visible on Dashboard)

### Transfers Tab

**Requesting a transfer:**
1. Click **"Request Transfer"**
2. Select the asset and the person you want to transfer it to
3. Click **Submit**
4. Admins and Asset Managers are notified

**Rules:**
- Employees can only request transfers of assets currently allocated to them
- Admins/Managers can request transfers of any asset

**Approving/Rejecting transfers (Admin/Manager/Dept Head):**
1. Find the pending transfer in the list
2. Click **"Approve"** or **"Reject"**
3. If approved: the asset is reassigned, and both parties get notifications
4. Department Heads can only approve transfers involving their department members

---

## Resource Booking

**Who can access:** Everyone (all roles)

Book shared resources like meeting room projectors, company vehicles, or conference equipment.

### Making a Booking
1. Click **"Book Resource"**
2. Select the asset to reserve
3. Set the start and end date/time
4. Enter the purpose
5. Click **Submit**

### Rules
- The system **prevents double-booking** — if someone else has already reserved the same asset for an overlapping time, you'll get an error
- End time must be after start time

### Cancelling a Booking
- You can cancel your own bookings by clicking **"Cancel"**
- Admins and Asset Managers can cancel anyone's booking

### What each role sees:
- Admin/Manager: All bookings company-wide
- Department Head: Bookings from their department members
- Employee: Only their own bookings

---

## Maintenance Management

**Who can access:** Everyone can report issues | Admin & Asset Manager can manage tasks

### Reporting an Issue (Everyone)
1. Click **"Report Issue"**
2. Select the asset with the problem
3. Describe the issue
4. Set priority: Low, Medium, High, or Critical
5. Click **Submit**
6. Admins/Managers are automatically notified

> **Note:** Reporting an issue does NOT automatically change the asset's status. A manager must update the maintenance task to trigger status changes.

### Managing Tasks (Admin/Manager only)
1. Click the task to open it
2. Assign a **Technician**
3. Update **Status**: `Requested → In Progress → Awaiting Parts → Done`
4. Log the **Cost** of repairs
5. When marked **"Done"**, the asset automatically returns to "Available" status and the reporter is notified

### What each role sees:
- Admin/Manager: All maintenance tasks across the company
- Department Head: Tasks reported by their department members
- Employee: Only tasks they reported

---

## Asset Audit

**Who can access:** Admin & Asset Manager only

Conduct physical verification audits to confirm all company assets exist and are in expected condition.

### Starting an Audit
1. Navigate to **Asset Audit**
2. Click **"Start New Session"**
3. Enter a title (e.g., "Q3 2026 Asset Audit")
4. Only one session can be active at a time

### Auditing Assets
1. Open the active session
2. For each asset, record:
   - **Verified:** Yes/No (was the asset physically found?)
   - **Condition Match:** Does the physical condition match the database? (Match/Mismatch)
   - **Notes:** Any additional observations
3. Click **Submit** for each asset
4. An asset cannot be audited twice in the same session

### Completing an Audit
1. Once all assets are checked, click **"Complete Session"**
2. The session is marked as completed with a progress percentage
3. Any discrepancies generate notifications

---

## Reports & Analytics

**Who can access:** Admin & Asset Manager only

A comprehensive analytics dashboard showing:

- **Utilization Rate** — Percentage of assets in use vs. available
- **Total Maintenance Cost** — Sum of all maintenance expenditures
- **Category Utilization Breakdown** — How each asset category is being used
- **Top 5 Idle Assets** — Available assets ordered by health score
- **Frequently Maintained Assets** — Top 5 assets with the most repair tickets
- **Monthly Maintenance Trends** — Cost trends over recent months

---

## Notifications & Logs

**Who can access:** Notifications for everyone | Activity Logs for Admin & Asset Manager

### Notifications Tab (Everyone)
Your personal notification center. You'll receive notifications for:
- Asset allocations to you
- Booking confirmations
- Transfer request approvals/rejections
- Maintenance completion updates

Click a notification to mark it as read.

### Activity Logs Tab (Admin/Manager only)
A system-wide audit trail showing the last 100 actions:
- Who did what, when
- Login events, asset registrations, allocations, transfers, maintenance updates, etc.

---

## Common Workflows

### Workflow 1: Onboarding a New Employee

```
Step 1: New employee registers at /signup → gets "Employee" role
Step 2: Admin opens Organization → promotes them to correct role if needed
Step 3: Admin opens Organization → Employees tab → creates their employee profile
Step 4: Admin opens Allocations → allocates a laptop/phone to them
Step 5: Employee receives a notification confirming the allocation
```

### Workflow 2: Transferring an Asset

```
Step 1: Employee goes to Allocations → Transfers tab → "Request Transfer"
Step 2: Selects the asset (must be allocated to them) and the target person
Step 3: Admin/Manager/Dept Head gets a notification
Step 4: Approver opens Transfers tab → clicks "Approve" or "Reject"
Step 5: If approved, asset is reassigned automatically. Both parties notified.
```

### Workflow 3: Handling a Broken Asset

```
Step 1: User goes to Maintenance → "Report Issue"
Step 2: Selects asset, describes problem, sets priority
Step 3: Admin/Manager gets notification
Step 4: Manager assigns a technician, updates status as work progresses
Step 5: Manager marks task "Done" → asset returns to "Available"
Step 6: Reporter gets a "Maintenance Completed" notification
```

### Workflow 4: Running a Company-Wide Audit

```
Step 1: Admin/Manager goes to Audits → "Start New Session"
Step 2: Names the session (e.g., "Annual Audit 2026")
Step 3: Physically checks each asset and submits an audit log for each
Step 4: Flags any discrepancies (condition mismatches, missing items)
Step 5: Clicks "Complete Session" when finished
Step 6: Reviews the audit progress and discrepancy reports
```

### Workflow 5: Booking a Meeting Room Projector

```
Step 1: Any user goes to Resource Booking → "Book Resource"
Step 2: Selects the projector asset
Step 3: Sets date/time: e.g., July 15th, 2:00 PM to 4:00 PM
Step 4: Purpose: "Q3 Planning Meeting"
Step 5: System checks for conflicts → confirms booking
Step 6: User gets a confirmation notification
```

---

## Role Permission Reference

| Feature | Admin | Asset Manager | Dept Head | Employee |
|---------|:-----:|:------------:|:---------:|:--------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Organization Setup | ✅ | ✅ | ❌ | ❌ |
| View Assets | ✅ All | ✅ All | ✅ All | ✅ All |
| Create Assets | ✅ | ✅ | ❌ | ❌ |
| View Allocations | ✅ All | ✅ All | Own Dept | Own only |
| Allocate/Return | ✅ | ✅ | ❌ | ❌ |
| Request Transfer | ✅ Any | ✅ Any | ✅ Any | Own assets |
| Approve Transfer | ✅ | ✅ | Own Dept | ❌ |
| View Bookings | ✅ All | ✅ All | Own Dept | Own only |
| Create Booking | ✅ | ✅ | ✅ | ✅ |
| Cancel Booking | ✅ Any | ✅ Any | Own only | Own only |
| Report Maintenance | ✅ | ✅ | ✅ | ✅ |
| Manage Maintenance | ✅ | ✅ | ❌ | ❌ |
| View Maintenance | ✅ All | ✅ All | Own Dept | Own reports |
| Asset Audits | ✅ | ✅ | ❌ | ❌ |
| Reports & Analytics | ✅ | ✅ | ❌ | ❌ |
| Manage User Roles | ✅ | ❌ | ❌ | ❌ |
| Notifications | Own | Own | Own | Own |
| Activity Logs | ✅ | ✅ | ❌ | ❌ |

---

## Need Help?

- **API Docs:** Visit `http://localhost:8000/docs` for the interactive Swagger UI
- **Backend runs on:** `http://localhost:8000`
- **Frontend runs on:** `http://localhost:3000`
