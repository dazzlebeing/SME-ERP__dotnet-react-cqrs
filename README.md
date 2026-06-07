# Shree Engineering Works — ERP System

A full-stack ERP application built to replace the legacy PHP system with React 18 + ASP.NET Core 9.

> ### 👋 Reviewing this repo?
> **Run it:** `cp .env.example .env` → `docker compose up -d` → `cd frontend && npm install && npm run dev` → open **http://localhost:3000** (login `shree@prodevelopers.in` / `keepsmiling`).
>
> **New here? Read [SETUP.md](./SETUP.md) first** — it has the full step-by-step setup, a **guided code tour ("where to look first")**, and a **"where to change things"** table.
>
> **No Docker on your machine?** Use [RUN-WITHOUT-DOCKER.md](./RUN-WITHOUT-DOCKER.md) — runs the whole app with just .NET, Node, and the SQL that ships with Visual Studio.
>
> **Architecture & feature docs** live in [`docs/`](./docs): the [page inventory](./docs/old-project-page-inventory.md), the [feature audit](./docs/missing-features-audit.md), and the [master plan](./docs/master-plan.md).

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4 |
| State | Zustand (auth), TanStack Query v5 (server state) |
| Forms | React Hook Form + Zod |
| Backend | ASP.NET Core 9 Web API, Clean Architecture |
| Pattern | Vertical Slice CQRS via MediatR 14 |
| ORM | Entity Framework Core 9 (SQL Server) |
| Auth | ASP.NET Core Identity + JWT Bearer |
| Export | QuestPDF (bills PDF), ClosedXML (Excel reports) |
| Database | SQL Server 2022 (Docker) |
| Cache | Redis 7 (Docker) |

---

## Prerequisites

- **Docker Desktop** (for SQL Server + Redis)
- **.NET 9 SDK** — [download](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 20+** — [download](https://nodejs.org/)

---

## Quick Start (Development)

> For the full guide (Docker-only mode, code tour, where-to-change reference, troubleshooting) see **[SETUP.md](./SETUP.md)**.

### 0. Create your local env file

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

### 1. Start Infrastructure (Database + Redis)

```bash
# From project root
docker compose up -d shree-db shree-redis
```

Wait ~15 seconds for SQL Server to initialise, then verify:

```bash
docker ps | grep shree
# shree-erp-sql   Up (healthy)   0.0.0.0:1434->1433
# shree-erp-redis Up             0.0.0.0:6380->6379
```

### 2. Start the API

```bash
cd backend
dotnet run --project src/Shree.API/Shree.API.csproj --urls "http://localhost:5050"
```

On first run the API will:
1. Apply all EF Core migrations automatically
2. Seed the default Admin and Accountant users
3. Start listening on port 5050

Verify it's healthy:

```bash
curl http://localhost:5050/health
# → Healthy
```

### 3. Start the Frontend

```bash
cd frontend
npm install        # first time only
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | shree@prodevelopers.in | keepsmiling |
| Accountant | admin@prodevelopers.in | keepsmiling |

---

## Manual Testing Guide

Follow these steps in order to verify the full business flow works end-to-end.

### Step 1 — Login

1. Open http://localhost:3000
2. Enter `shree@prodevelopers.in` / `keepsmiling`
3. **Expected:** Redirected to Dashboard, showing stat cards

### Step 2 — Create a Company (Master Data)

1. Navigate to **Companies**
2. Click **Add Company**
3. Fill in:
   - Name: `Test Pvt Ltd`
   - GSTIN: `23AAOPJ2936N1ZC`
   - Address: `Dewas, MP`
4. Click **Save**
5. **Expected:** Company appears in table

### Step 3 — Create a Gatepass

1. Navigate to **Gatepasses**
2. Click **Add Gatepass**
3. Fill in:
   - Company: `Test Pvt Ltd`
   - Gatepass Number: `GP-2024-001`
   - Date: today
   - Rolls Info: `2 rolls, 500mm`
4. Click **Create**
5. **Expected:** Gatepass listed with **Pending** badge

### Step 4 — Approve Gatepass (Admin only)

1. In the Gatepasses list, click the green ✓ button on `GP-2024-001`
2. **Expected:** Status changes to **Delivered**

### Step 5 — Create a Chalan

1. Navigate to **Chalans**
2. Click **Add Chalan**
3. Fill in:
   - Company: `Test Pvt Ltd`
   - Gatepass Number: `GP-2024-001`
   - Vehicle Number: `MP09 AB 1234`
4. Click **Save**
5. **Expected:** Chalan appears in list

### Step 6 — Create a Bill

1. Navigate to **Bills**
2. Click **New Bill**
3. Fill in:
   - Bill Number: `BILL-2024-001`
   - Company: `Test Pvt Ltd`
   - Gatepass Number: `GP-2024-001`
   - Tax Type: `CGST + SGST (Intra-state)`
4. In Particulars, add a row:
   - Description: `Roll Grinding`
   - Qty: `2`
   - Rate: `5000`
5. **Expected:** Subtotal shows ₹10,000, CGST ₹900, SGST ₹900, **Total ₹11,800**
6. Click **Save Bill**
7. **Expected:** Bill appears in list with total ₹11,800

### Step 7 — Download Bill PDF

1. In the Bills list, click the blue download icon on `BILL-2024-001`
2. **Expected:** PDF file `Bill-BILL-2024-001.pdf` downloads to your computer
3. Open the PDF — should show company header, bill details, particulars table, tax summary, bank details

### Step 8 — Record a Payment

1. Navigate to **Payments**
2. Click **Add Payment**
3. Fill in:
   - Company: `Test Pvt Ltd`
   - Mode: `RTGS`
   - Amount: `11800`
   - Description: `Against Bill BILL-2024-001`
4. Click **Save Payment**
5. **Expected:** Payment recorded in list

### Step 9 — Add Vendor & Expense

1. Navigate to **Vendors** → **Add Vendor**
   - Name: `ABC Supplies Ltd`
   - GSTIN: `27AABCA1234A1ZC`
2. Navigate to **Expenses** → **Add Expense**
   - Vendor: `ABC Supplies Ltd`
   - Base Amount: `2000`
   - Tax: `GST 18% (CGST 9% + SGST 9%)`
   - **Expected:** CGST ₹180, SGST ₹180, Total ₹2,360

### Step 10 — Add Employee & Salary

1. Navigate to **Employees** → **Add Employee**
   - Name: `Ramesh Kumar`
   - Monthly Salary: `15000`
2. Navigate to **Salary** → **Add Salary**
   - Employee: `Ramesh Kumar`
   - Month/Year: current month
   - Working Days: `26`
   - Amount: `15000`
3. **Expected:** Salary record saved; duplicate month should be blocked

### Step 11 — GST Reports

1. Navigate to **Reports**
2. Select current month and year
3. Click **GSTR-1 (Outward)** tab
4. **Expected:** Bill from Step 6 appears with CGST/SGST breakdown
5. Click **GSTR-3B Summary** tab
6. **Expected:** Tax liability shown, ITC from expenses shown
7. Click **Excel** button on GSTR-1
8. **Expected:** `.xlsx` file downloads

### Step 12 — Audit Log (Admin only)

1. Navigate to **Audit Log**
2. **Expected:** All create/update/delete operations from Steps 2–10 are logged with timestamps, entity names, and user email

---

## API Testing (via Swagger)

Swagger UI is available at: **http://localhost:5050/swagger**

Or use curl:

```bash
# Login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"shree@prodevelopers.in","password":"keepsmiling"}'

# Use the token from above
TOKEN="<paste_access_token_here>"

# Dashboard stats
curl http://localhost:5050/api/v1/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Create company
curl -X POST http://localhost:5050/api/v1/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Co","address":"Dewas","gstin":"23AAOPJ2936N1ZC"}'

# Get GSTR-1 for May 2026
curl "http://localhost:5050/api/v1/reports/gst/gstr1?month=5&year=2026" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Role-Based Access Control

| Feature | Admin | Accountant | Viewer |
|---------|-------|-----------|--------|
| View all pages | ✅ | ✅ | ✅ |
| Create / Edit records | ✅ | ✅ | ❌ |
| Delete records | ✅ | ❌ | ❌ |
| Approve Gatepass | ✅ | ❌ | ❌ |
| Change bill status | ✅ | ✅ | ❌ |
| Change password (own) | ✅ | ✅ | ✅ |
| Download PDF / Excel | ✅ | ✅ | ✅ |
| View Audit Log | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |

---

## Project Structure

```
shree-dotnet-project/
├── backend/
│   ├── src/
│   │   ├── Shree.API/           # Controllers, Middleware, Program.cs
│   │   ├── Shree.Application/   # CQRS Commands/Queries (MediatR)
│   │   ├── Shree.Domain/        # Entities, Enums, Value Objects
│   │   └── Shree.Infrastructure/ # EF Core, Identity, JWT, PDF, Excel
│   └── tests/
│       ├── Shree.UnitTests/
│       └── Shree.IntegrationTests/
├── frontend/
│   └── src/
│       ├── pages/               # 15 page components
│       ├── components/          # Shared UI (layout, ui primitives)
│       ├── store/               # Zustand auth store
│       ├── hooks/               # useCrud (paginated list, delete, save)
│       └── lib/                 # axios instance, formatters
├── docker-compose.yml
└── docs/
    └── master-plan.md
```

---

## Available Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Stats tabs (Bills/Purchase/GatePasses/Sales/Payments), donut charts, monthly chart, recent gatepasses, quick links |
| Companies | `/companies` | Client company master data — search, sortable columns |
| Vendors | `/vendors` | Supplier/vendor master data — search, sortable columns |
| Employees | `/employees` | Employee records — search, sortable columns |
| Gatepasses | `/gatepasses` | Gate passes — company + status filter, search, sortable, approve action |
| Chalans | `/chalans` | Delivery challans — month/year filter, search, GP number auto-fill |
| Bills | `/bills` | GST invoices — company/status/payment filter, search, sortable, status change (Admin), PDF download |
| Payments | `/payments` | Payment receipts — company/month/year filter, search |
| Expenses | `/expenses` | Purchase invoices — vendor/month/year filter, search, 6 tax types, auto-calc |
| Vouchers | `/vouchers` | Cash payment vouchers — month/year filter, search |
| Salary | `/salary` | Employee salary — employee/month/year filter, search, auto-calc from working days |
| Advances | `/advances` | Employee advances — employee filter, search, auto-calc total due |
| Reports | `/reports` | GSTR-1, GSTR-2, GSTR-3B, Sales, Purchase — month/year picker, Excel download |
| Audit Log | `/audit-logs` | (Admin only) All data change history |
| Users | `/users` | (Admin only) User management — create, role change, reset password |

---

## UX Features (added this session)

| Feature | Where |
|---------|-------|
| **Debounced search** (350ms) | All pages with search bar — instant results |
| **Sortable column headers** | All tables — click header to sort ▲/▼/⇅ |
| **Company filter on Bills** | Bills page PageHeader |
| **Company filter on Gatepasses** | Gatepasses page PageHeader |
| **Month/Year filter on Chalans** | Chalans page PageHeader |
| **GP number auto-fill** | Chalan form — enter GP number, company/vehicle/rolls auto-populate on blur |
| **Bill status change (inline select)** | Bills table — Admin can change status without leaving the page |
| **Salary auto-calculation** | Salary form — changing working days recalculates amount (`days / 26 × base salary`) |
| **Change Password modal** | Sidebar → bottom of user panel — all roles |
| **Users page (Admin)** | `/users` — list users, create, change role, reset password, delete |
| **Spinning logo** | Login page — gear animates continuously |
| **Shree gear logo** | Sidebar header + favicon |

---

## Key API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/v1/auth/login` | Login → access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | Refresh access token via cookie |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Current user info |
| PUT | `/api/v1/auth/change-password` | Change own password |
| GET | `/api/v1/users` | List all users (Admin) |
| POST | `/api/v1/users` | Create user with role (Admin) |
| PATCH | `/api/v1/users/{id}/role` | Update user role (Admin) |
| PATCH | `/api/v1/users/{id}/password` | Reset user password (Admin) |
| DELETE | `/api/v1/users/{id}` | Delete user (Admin) |
| GET | `/api/v1/dashboard/stats` | Dashboard statistics |
| GET | `/api/v1/gatepasses/details/{number}` | Get gatepass by number (for chalan auto-fill) |
| PATCH | `/api/v1/bills/{id}/status` | Change bill status (Active/Inactive) |
| GET | `/api/v1/bills` | Paginated bills — supports `companyId`, `billStatus`, `paymentStatus`, `search` |
| GET | `/api/v1/chalans` | Paginated chalans — supports `month`, `year`, `search` |
| GET | `/api/v1/export/bills/{id}/pdf` | Download bill as PDF |
| GET | `/api/v1/reports/gst/gstr1?month=&year=` | GSTR-1 data |
| GET | `/api/v1/reports/gst/3b?month=&year=` | GSTR-3B summary |
| GET | `/api/v1/export/reports/gstr1/excel` | Download GSTR-1 Excel |

---

## Security Improvements Over Legacy PHP

| PHP Vulnerability | Solution in This Build |
|-------------------|----------------------|
| SQL injection (51+ files) | EF Core parameterized queries |
| MD5 password hashing | ASP.NET Core Identity (PBKDF2) |
| No CSRF protection | JWT stateless — no cookie CSRF |
| XSS via unescaped echo | React auto-escapes all JSX output |
| Credentials in localStorage | Access token in sessionStorage; refresh token in HttpOnly cookie |
| No rate limiting | 10 req/s per IP via AspNetCoreRateLimit |
| Error message disclosure | RFC 7807 ProblemDetails (no stack traces in production) |
| No input validation | FluentValidation on every MediatR command |
| No audit trail | Automatic AuditLog via EF Core SaveChangesAsync override |
| No RBAC | Admin / Accountant / Viewer roles via ASP.NET Core Identity |

---

## Troubleshooting

### API won't start — connection refused to SQL Server

```bash
# Check SQL Server container
docker ps | grep shree-erp-sql
# If not running:
docker-compose up -d shree-db
# Wait 15 seconds, then start API
```

### Port 5050 already in use

```bash
# Find and kill the process
lsof -i :5050 | grep LISTEN
kill -9 <PID>
```

Or in PowerShell:
```powershell
Get-NetTCPConnection -LocalPort 5050 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### Frontend shows "Network Error"

Verify the API is running on port 5050 (the Vite proxy forwards `/api` → `http://localhost:5050`).

### Login fails with 401

- Confirm API is running: `curl http://localhost:5050/health`
- Confirm DB seed ran: check the API startup logs for "Database seeded successfully"
- Try restarting the API — migrations run on startup

---

## Production Build

```bash
# Build frontend
cd frontend && npm run build
# Output → frontend/dist/

# Build API Docker image
cd backend && docker build -t shree-api .

# Run full stack
docker-compose up --build
```
