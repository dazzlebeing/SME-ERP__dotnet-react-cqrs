# Shree ERP — Full Rebuild Master Plan
## React 18 + .NET 9 Web API | Two-Session Execution

---

## 1. Project Overview

**Original Stack:** Core PHP 7.4 + MySQL + Apache + Vanilla JS  
**New Stack:** React 18 (TypeScript) + ASP.NET Core 9 Web API + SQL Server + Redis  
**Pattern:** Clean Architecture + CQRS (MediatR) + Vertical Slices  
**Auth:** ASP.NET Core Identity + JWT + Refresh Tokens  
**Containerized:** Docker Compose (API + Frontend + DB + Redis + Seq)  
**Tests:** xUnit + Testcontainers (integration) + Vitest + RTL (component) + Playwright (E2E)

---

## 2. Repository Structure (Target)

```
shree-erp/
├── backend/
│   ├── Shree.sln
│   ├── src/
│   │   ├── Shree.API/                    # Controllers, Middleware, DI, Program.cs
│   │   ├── Shree.Application/            # CQRS Commands/Queries, DTOs, Interfaces, Validators
│   │   ├── Shree.Domain/                 # Entities, Enums, Value Objects, Domain Events
│   │   └── Shree.Infrastructure/         # EF Core, Repositories, Email, PDF, Excel
│   └── tests/
│       ├── Shree.UnitTests/              # Domain logic tests
│       └── Shree.IntegrationTests/       # API tests with Testcontainers
├── frontend/
│   ├── src/
│   │   ├── app/                          # Router, providers, layout
│   │   ├── features/                     # One folder per domain feature
│   │   │   ├── auth/
│   │   │   ├── companies/
│   │   │   ├── vendors/
│   │   │   ├── employees/
│   │   │   ├── gatepasses/
│   │   │   ├── chalans/
│   │   │   ├── bills/
│   │   │   ├── payments/
│   │   │   ├── expenses/
│   │   │   ├── vouchers/
│   │   │   ├── salary/
│   │   │   ├── advances/
│   │   │   ├── reports/
│   │   │   └── dashboard/
│   │   ├── components/                   # Shared: DataTable, Modal, Sidebar, PageHeader
│   │   ├── lib/                          # axios instance, auth utils, formatters
│   │   └── store/                        # Zustand: authStore, uiStore
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── master-plan.md                    # This file
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/ci.yml
```

---

## 3. Domain Entities (mapped from MySQL schema)

| Entity | Original Table | Key Fields | Relationships |
|--------|---------------|-----------|---------------|
| Company | companies | id, name, address, gstin, contactPerson1/2, contactNumber1/2 | HasMany Bills, Chalans, Gatepasses, Payments |
| Vendor | vendors | id, name, address, description, gstin | HasMany Expenses |
| Employee | employees | id, name, qualification, mobileNumber, aadhar, joiningDate, salary | HasMany Salary, Advance |
| Gatepass | gatepasses | id, companyId, gatepassNumber(unique), gatepassDate, rollsInfo(JSON), status | BelongsTo Company; HasMany Chalans, Bills |
| Chalan | chalans | number, date, companyId, gatepassNumber, vehicleNumber, rollsInfo(JSON) | BelongsTo Company, Gatepass |
| Bill | bills | id, billDate, billNumber(unique), hsnCode, companyId, gatepassNumber, vehicleNumber, billAmount, sgst, cgst, igst, billTotal, roundOff, billStatus, remarks, paymentStts, paymentRecieved | BelongsTo Company, Gatepass; HasMany Particulars |
| BillParticular | particulars | id, billNumber, description, quantity, price, total | BelongsTo Bill |
| Payment | payments | id, paymentDate, companyId, modeOfPayment, paymentAmount, paidBills(JSON), description | BelongsTo Company |
| Expense | expenses | id, invoiceNumber, date, amount, vendorId, taxPercentage, cgst, sgst, igst, total, description | BelongsTo Vendor |
| Voucher | vouchers | id, date, amount, paidTo, description | Standalone |
| Salary | salary | id, employeeId, workingDays, date, amount | BelongsTo Employee |
| Advance | advance | id, employeeId, date, takenAmt, returnedAmt, totalDue | BelongsTo Employee |
| AuditLog | audit_logs *(new)* | id, tableName, recordId, action, oldValues(JSON), newValues(JSON), userId, timestamp | Replaces `trash` table |
| User | AspNetUsers *(new)* | (Identity managed) | Auth |

### Schema Improvements Over Original

| Original | New |
|----------|-----|
| `trash` table (only deleted rows) | `audit_logs` (old+new values, userId, action type, every write) |
| All monetary columns as `INT` | `DECIMAL(12,2)` |
| `rollsInfo TEXT` (raw JSON) | EF Core owned entity collection (typed) |
| `paidBills TEXT` (raw JSON) | `PaymentAllocation` owned collection (typed) |
| No timestamps on any table | `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy` on all entities |
| Hard deletes | `IsDeleted`, `DeletedAt`, `DeletedBy` soft delete on all entities |
| No FK constraints in DB | Explicit FK constraints via EF Core `HasForeignKey()` |

---

## 4. Business Configuration (migrated from config.php)

Store in `appsettings.json` (secrets via `dotnet user-secrets` in dev, Key Vault in prod):

```json
{
  "Company": {
    "Name": "Shree Engineering Works",
    "Subtitle": "C-I, Chilled Roll Grinding, Grooving & Manufacturing Works",
    "WorkAddress": "7/1B Industrial Area No. 2, A.B. Road Dewas(M.P.)455001",
    "OfficeAddress": "27, Gomti Nagar, Dewas (M.P.) 455001",
    "Gstin": "23AAOPJ2936N1ZC",
    "BankName": "BANK OF INDIA INDUSTRIAL AREA NO.2",
    "AccountNumber": "890120110000464",
    "IfscCode": "BKID0008901"
  },
  "Tax": {
    "CgstRate": 9,
    "SgstRate": 9,
    "IgstRate": 18
  }
}
```

---

## 5. Core Business Flow

```
Gatepass (Pending)
    ↓  material sent to customer
Chalan (delivery note with roll details)
    ↓  goods confirmed received
Bill (invoice with HSN, tax calc: CGST+SGST or IGST)
    ↓  invoice sent
Payment (covers one or more bills, updates paymentStts)
    ↓
GST Reports (GSTR-1 outward / GSTR-2 inward / GSTR-3B summary)
```

**Tax Rule:**
- Same state (intra-state): CGST 9% + SGST 9% = 18% total
- Different state (inter-state): IGST 18%

---

## 6. API Contracts (all endpoints)

### Auth
```
POST   /api/v1/auth/login          Body: {email, password}      → {accessToken, expiresIn}
POST   /api/v1/auth/refresh        Cookie: refreshToken         → {accessToken}
POST   /api/v1/auth/logout
GET    /api/v1/auth/me             → {id, email, roles[]}
```

### Companies
```
GET    /api/v1/companies           ?page&pageSize&search        → paginated list
POST   /api/v1/companies                                        → 201 + id
GET    /api/v1/companies/{id}
PUT    /api/v1/companies/{id}
DELETE /api/v1/companies/{id}      (soft delete)
GET    /api/v1/companies/list      (id+name only, for dropdowns)
```

### Vendors
```
GET    /api/v1/vendors             ?page&pageSize&search
POST   /api/v1/vendors
GET    /api/v1/vendors/{id}
PUT    /api/v1/vendors/{id}
DELETE /api/v1/vendors/{id}
GET    /api/v1/vendors/list
```

### Employees
```
GET    /api/v1/employees           ?page&pageSize&search
POST   /api/v1/employees
GET    /api/v1/employees/{id}
PUT    /api/v1/employees/{id}
DELETE /api/v1/employees/{id}
GET    /api/v1/employees/{id}/due  → {loanDue, advanceDue, totalDue}
GET    /api/v1/employees/list
```

### Gatepasses
```
GET    /api/v1/gatepasses          ?page&pageSize&status&companyId
POST   /api/v1/gatepasses
GET    /api/v1/gatepasses/{id}
PATCH  /api/v1/gatepasses/{id}/status   Body: {status}          (Admin only)
GET    /api/v1/gatepasses/check/{number}        → {exists: bool}
GET    /api/v1/gatepasses/details/{number}      → full detail (for chalan pre-fill)
```

### Chalans
```
GET    /api/v1/chalans             ?page&pageSize&companyId
POST   /api/v1/chalans
GET    /api/v1/chalans/{id}
PUT    /api/v1/chalans/{id}
DELETE /api/v1/chalans/{id}
```

### Bills
```
GET    /api/v1/bills               ?page&pageSize&companyId&status&paymentStatus
POST   /api/v1/bills
GET    /api/v1/bills/{id}
PUT    /api/v1/bills/{id}
PATCH  /api/v1/bills/{id}/status
PATCH  /api/v1/bills/{id}/date
GET    /api/v1/bills/check/{number}     → {exists: bool}
GET    /api/v1/bills/pending            → unpaid bills list
```

### Payments
```
GET    /api/v1/payments            ?page&pageSize&companyId&month&year
POST   /api/v1/payments
GET    /api/v1/payments/{id}
DELETE /api/v1/payments/{id}
```

### Expenses
```
GET    /api/v1/expenses            ?page&pageSize&vendorId&month&year
POST   /api/v1/expenses
GET    /api/v1/expenses/{id}
PUT    /api/v1/expenses/{id}
DELETE /api/v1/expenses/{id}
```

### Vouchers
```
GET    /api/v1/vouchers            ?page&pageSize&month&year
POST   /api/v1/vouchers
GET    /api/v1/vouchers/{id}
PUT    /api/v1/vouchers/{id}
DELETE /api/v1/vouchers/{id}
```

### Salary
```
GET    /api/v1/salary              ?employeeId&month&year
POST   /api/v1/salary
DELETE /api/v1/salary/{id}
GET    /api/v1/salary/months       ?employeeId
```

### Advances
```
GET    /api/v1/advances            ?employeeId
POST   /api/v1/advances
DELETE /api/v1/advances/{id}
```

### Reports
```
GET    /api/v1/reports/gst/gstr1           ?month&year
GET    /api/v1/reports/gst/gstr2           ?month&year
GET    /api/v1/reports/gst/3b              ?month&year
GET    /api/v1/reports/sales               ?month&year
GET    /api/v1/reports/purchase            ?month&year
GET    /api/v1/reports/statistics          ?month&year
GET    /api/v1/reports/company/{id}/bills      ?month&year
GET    /api/v1/reports/company/{id}/payments   ?month&year
GET    /api/v1/reports/company/{id}/chalans    ?month&year
GET    /api/v1/reports/company/{id}/gatepasses ?month&year

# Export
GET    /api/v1/reports/gst/gstr1/pdf       ?month&year   → file download
GET    /api/v1/reports/gst/gstr1/excel     ?month&year   → file download
GET    /api/v1/reports/sales/pdf           ?month&year
GET    /api/v1/reports/sales/excel         ?month&year
GET    /api/v1/reports/purchase/pdf        ?month&year
GET    /api/v1/reports/purchase/excel      ?month&year
```

### Dashboard
```
GET    /api/v1/dashboard/stats              → {billsThisMonth, pendingGatepasses, totalEmployees, totalVendors}
GET    /api/v1/dashboard/graph             ?year   → [{month, salesAmount, expenseAmount}]
GET    /api/v1/dashboard/recent-gatepasses → last 5 gatepasses
```

### Audit Logs (Admin only)
```
GET    /api/v1/audit-logs          ?entity&recordId&userId&page&pageSize
```

### Health
```
GET    /health
GET    /health/ready
```

---

## 7. MediatR CQRS Structure

Pattern per feature (example: Bills — repeat for all 11 modules):

```
Application/Features/Bills/
├── Commands/
│   ├── CreateBill/
│   │   ├── CreateBillCommand.cs
│   │   ├── CreateBillCommandHandler.cs
│   │   └── CreateBillCommandValidator.cs
│   ├── UpdateBill/
│   ├── UpdateBillStatus/
│   └── DeleteBill/
└── Queries/
    ├── GetBills/
    │   ├── GetBillsQuery.cs
    │   ├── GetBillsQueryHandler.cs
    │   └── BillDto.cs
    ├── GetBillById/
    ├── GetPendingBills/
    └── CheckBillNumber/
```

Apply to: Companies, Vendors, Employees, Gatepasses, Chalans, Bills, Payments, Expenses, Vouchers, Salary, Advances, Reports, Dashboard.

---

## 8. EF Core Infrastructure

### DbContext: `ShreeDbContext`
- Inherits `IdentityDbContext<ApplicationUser>`
- DbSets for all 14 entities + AuditLog
- Override `SaveChangesAsync`:
  1. Auto-set `CreatedAt/By`, `UpdatedAt/By` via `ICurrentUserService`
  2. Handle soft delete (set `IsDeleted = true`, never `Remove()`)
  3. Write to `AuditLogs` capturing old + new values (JSON) before committing

### EF Core Pipeline Behaviors (MediatR)

```csharp
// Registration order in DI:
1. ValidationBehavior<TRequest, TResponse>    // FluentValidation on every command
2. LoggingBehavior<TRequest, TResponse>        // Serilog structured logs
3. CachingBehavior<TRequest, TResponse>        // Redis for reports + dashboard stats
```

### Migrations
- `Initial_Auth`       — AspNetUsers, Roles
- `Initial_MasterData` — Company, Vendor, Employee
- `Initial_Operations` — Gatepass, Chalan, Bill, BillParticular, Payment
- `Initial_Finance`    — Expense, Voucher, Salary, Advance
- `Initial_AuditLog`   — AuditLog table
- `Seed_AdminUser`     — Default admin + company config

### Repository Pattern
```csharp
// Generic base (all entities)
IRepository<T> — AddAsync, UpdateAsync, DeleteAsync, GetByIdAsync, Query()

// Specialized (complex query needs)
IBillRepository   → GetBillsWithParticularsAsync(filter), GetPendingBillsAsync()
IGatepassRepository → GetByNumberAsync(gatepassNumber)
IReportRepository → GetGstr1DataAsync(month, year), GetSalesDataAsync(month, year)
```

---

## 9. Frontend Feature Structure

Pattern per feature (example: Bills — repeat for all 11 modules):

```
features/bills/
├── api/
│   ├── useBills.ts              # useQuery  → GET /api/v1/bills
│   ├── useBill.ts               # useQuery  → GET /api/v1/bills/{id}
│   ├── useCreateBill.ts         # useMutation → POST
│   ├── useUpdateBill.ts         # useMutation → PUT
│   └── useDeleteBill.ts         # useMutation → DELETE
├── components/
│   ├── BillTable.tsx            # TanStack Table: search, filter, pagination
│   ├── BillForm.tsx             # React Hook Form + Zod
│   ├── BillDetail.tsx           # Detail drawer/modal
│   ├── BillStatusBadge.tsx      # Draft/Submitted/Paid/Cancelled chip
│   └── ParticularsTable.tsx     # Dynamic add/remove line items
├── pages/
│   ├── ManageBillsPage.tsx
│   └── AddBillPage.tsx
├── schemas/
│   └── billSchema.ts            # Zod schema
└── types.ts                     # TypeScript types
```

---

## 10. Shared Components

```
components/
├── layout/
│   ├── Sidebar.tsx              # Role-aware nav (replaces PHP iframe sidebar)
│   ├── TopBar.tsx               # User info, logout, notification bell
│   └── AppLayout.tsx
├── data-display/
│   ├── DataTable.tsx            # Generic TanStack Table (all list pages use this)
│   ├── StatCard.tsx             # Dashboard stat boxes
│   └── AuditLogTable.tsx
├── forms/
│   ├── FormField.tsx            # Label + Input + inline error
│   ├── CompanySelector.tsx      # Async searchable select (companies)
│   ├── VendorSelector.tsx
│   ├── EmployeeSelector.tsx
│   └── MonthYearPicker.tsx      # Shared by reports, salary, payments
├── feedback/
│   ├── DeleteConfirmDialog.tsx
│   ├── PageLoader.tsx
│   └── ErrorBoundary.tsx
└── export/
    ├── PdfDownloadButton.tsx
    └── ExcelDownloadButton.tsx
```

---

## 11. Auth Store (Zustand)

```typescript
// store/authStore.ts
interface AuthState {
  user: { id: string; email: string; roles: string[] } | null;
  accessToken: string | null;        // in memory ONLY — never localStorage
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;      // called by Axios 401 interceptor
  hasRole: (role: string) => boolean;
}
```

**Axios interceptor flow:**  
`401 received` → call `POST /api/v1/auth/refresh` (HttpOnly cookie) → retry original request → if refresh fails → `logout()`

---

## 12. Docker Compose

```yaml
# docker-compose.yml
services:
  api:
    build: ./backend
    ports: ["5000:8080"]
    environment:
      - ConnectionStrings__Default=Server=db;Database=ShreeERP;User=sa;Password=${DB_PASSWORD};TrustServerCertificate=True
      - Jwt__Secret=${JWT_SECRET}
      - Jwt__Issuer=shree-erp
      - Redis__Connection=redis:6379
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_started }

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [api]

  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - SA_PASSWORD=${DB_PASSWORD}
      - ACCEPT_EULA=Y
    volumes: [db_data:/var/opt/mssql]
    healthcheck:
      test: ["CMD", "/opt/mssql-tools/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-P", "${DB_PASSWORD}", "-Q", "SELECT 1"]
      interval: 10s
      retries: 10

  redis:
    image: redis:7-alpine

  seq:
    image: datalust/seq:latest        # structured log viewer (dev only)
    ports: ["5341:80"]
    environment:
      - ACCEPT_EULA=Y

volumes:
  db_data:
```

---

## 13. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '9.0.x' }
      - run: dotnet build backend/Shree.sln
      - run: dotnet test backend/Shree.sln --filter "Category!=E2E"
      - run: docker build ./backend

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd frontend && npm ci
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run test
      - run: cd frontend && npm run build

  e2e:
    needs: [backend, frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose up -d --wait
      - run: cd frontend && npx playwright install --with-deps
      - run: cd frontend && npx playwright test
      - run: docker compose down
```

---

## 14. Security Gaps Closed

| PHP Gap | .NET Solution |
|---------|--------------|
| SQL Injection (51+ raw query files) | EF Core — always parameterized, never string interpolation |
| MD5 passwords (unsalted, broken) | ASP.NET Core Identity — PBKDF2 with salt |
| No CSRF protection | JWT stateless — no cookie-based CSRF attack surface |
| XSS via direct echo to HTML | React JSX auto-escapes all output |
| Credentials stored in localStorage | Access token in memory; refresh token in HttpOnly cookie |
| Session fixation risk | No sessions — pure JWT stateless |
| No rate limiting | `AspNetCoreRateLimit`: 5 req/s per user, 100/min global |
| Error message disclosure (raw SQL echoed) | `ProblemDetails` RFC 7807 — generic error to client, full detail in Serilog |
| Missing input validation | `FluentValidation` on every MediatR Command — no handler runs on invalid input |
| Hardcoded `super-secret` DB password | `dotnet user-secrets` (dev) / Azure Key Vault (prod) |
| No audit trail | `AuditLog` via EF Core `SaveChangesAsync` interceptor — every write logged |
| No RBAC | Identity Roles: `Admin`, `Accountant`, `Viewer` on every endpoint |

---

## 15. Roles & Permissions Matrix

| Action | Admin | Accountant | Viewer |
|--------|:-----:|:----------:|:------:|
| View all pages | ✅ | ✅ | ✅ |
| Create / Edit records | ✅ | ✅ | ❌ |
| Approve gatepass status | ✅ | ❌ | ❌ |
| Delete records | ✅ | ❌ | ❌ |
| View reports + export | ✅ | ✅ | ✅ |
| View audit log | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

---

## 16. Test Strategy — 99 Test Cases

### Tools by Type

| Type | Tool | Session |
|------|------|---------|
| Unit (domain logic) | xUnit + FluentAssertions | Session 1 |
| Integration (API + real DB) | xUnit + Testcontainers.MsSql | Session 1 |
| Component (React) | Vitest + React Testing Library | Session 2 |
| E2E (full journeys) | Playwright | Session 2 |

### Auth — 9 tests (T-01 to T-09)
- T-01: Valid credentials → 200 + JWT
- T-02: Wrong password → 401
- T-03: Expired access token + valid refresh → new access token
- T-04: Revoked refresh token → 401
- T-05: `Admin` role can access admin-only endpoint
- T-06: `Viewer` role blocked from write endpoints (403)
- T-07: Login form — empty fields show inline validation errors
- T-08: Unauthenticated user redirected to `/login`
- T-09: 5 failed logins trigger account lockout

### Companies — 9 tests (T-10 to T-18)
- T-10: Create company with valid GSTIN → 201
- T-11: Create company with invalid GSTIN format → 422
- T-12: Duplicate company name → 409
- T-13: Soft delete sets `IsDeleted=true`, row still in DB
- T-14: `CreatedAt` and `CreatedBy` populated on create
- T-15: `UpdatedAt` and `UpdatedBy` updated on edit
- T-16: `GET /companies?page=2&pageSize=10` returns correct slice
- T-17: Company form — GSTIN validates on blur
- T-18: Delete confirmation dialog blocks accidental delete

### Employees — 5 tests (T-19 to T-23)
- T-19: Create employee with all required fields → 201
- T-20: Missing required field returns 422 with field-level errors
- T-21: Search by name filters correctly
- T-22: Employee profile returns salary history
- T-23: Employee due aggregates loans + advances correctly

### Gatepasses — 7 tests (T-24 to T-30)
- T-24: Create gatepass with valid company → 201
- T-25: Duplicate gatepass number → 409
- T-26: `Viewer` role cannot approve/reject (403)
- T-27: Status filter returns only matching records
- T-28: Approve gatepass → status becomes "Delivered"
- T-29: `GatepassStatusChangedEvent` domain event fired on status change
- T-30: Approve button hidden in UI for `Viewer` role

### Chalans — 4 tests (T-31 to T-34)
- T-31: Create chalan with line items → all items persisted
- T-32: Chalan linked to non-existent gatepass → 404
- T-33: Chalan number auto-increments and is unique
- T-34: Dynamic line item row — add/remove works in UI

### Bills — 7 tests (T-35 to T-41)
- T-35: Bill tax calculation: CGST+SGST for intra-state, IGST for inter-state (Unit)
- T-36: Duplicate bill number → 409
- T-37: Valid status transition: `Draft` → `Submitted` allowed
- T-38: Invalid status transition: `Paid` → `Draft` rejected
- T-39: Pending bills list excludes paid/cancelled bills
- T-40: Tax fields auto-populate on HSN code selection (Component)
- T-41: Total amount updates live as particulars are added/changed (Component)

### Payments — 4 tests (T-42 to T-45)
- T-42: Payment with invalid mode → 422
- T-43: Payment linked to non-existent company → 404
- T-44: Filter by company + month returns correct records
- T-45: Soft delete preserves record for audit trail

### Expenses + Vouchers — 3 tests (T-46 to T-48)
- T-46: Expense with future date → 422
- T-47: Expense category filter returns only matching records
- T-48: Voucher CRUD persists correctly

### Salary — 4 tests (T-49 to T-52)
- T-49: Duplicate salary entry for same employee + month → 409
- T-50: Net salary = `employees.salary × workingDays` (Unit)
- T-51: Employee due aggregates loan + advance balances correctly
- T-52: Salary months dropdown only shows months with entries

### Dashboard + SignalR — 6 tests (T-53 to T-58)
- T-53: Stats endpoint returns correct live counts
- T-54: Graph data covers all 12 months (zeros for months with no data)
- T-55: SignalR hub delivers gatepass update to connected clients
- T-56: Todo CRUD — create/complete/delete all persist
- T-57: Dashboard graph renders with correct data points (Component)
- T-58: SignalR disconnect shows reconnecting indicator (Component)

### GST Reports — 6 tests (T-59 to T-64)
- T-59: GSTR-1 includes only outward (sales) supplies
- T-60: GSTR-3B tax totals = sum of GSTR-1 output tax − GSTR-2 input credit
- T-61: PDF generated has correct page layout and all required fields
- T-62: Excel export has column headers matching GST specification
- T-63: Empty month → report returns zero values, not error
- T-64: Report table groups rows by HSN code (Component)

### Sales / Purchase Reports — 4 tests (T-65 to T-68)
- T-65: Sales report excludes cancelled bills
- T-66: Company-wise report returns only that company's data
- T-67: Year filter returns correct 12-month window
- T-68: Company picker populates all active companies (Component)

### RBAC + Audit — 5 tests (T-69 to T-73)
- T-69: Every write operation creates an audit log entry
- T-70: Audit log captures old values AND new values on update
- T-71: `Viewer` role → 403 on every POST/PUT/DELETE endpoint (full matrix)
- T-72: Rate limiter returns 429 after threshold exceeded
- T-73: Admin-only UI elements hidden for `Accountant` role (Component)

### Performance + Security — 4 tests (T-74 to T-77)
- T-74: Cached dashboard stats — second response < 50ms
- T-75: All API responses include required security headers (HSTS, CSP, X-Frame-Options)
- T-76: IDOR test — user A cannot access user B's resources
- T-77: Frontend bundle — no route chunk exceeds 200KB

### E2E Journeys via Playwright — 9 journeys (E2E-01 to E2E-09)
- E2E-01: Login → Dashboard shows 4 stat cards
- E2E-02: Create company → Edit → Soft delete → Confirm gone from list
- E2E-03: Create gatepass → Approve → Verify "Delivered" status on dashboard widget
- E2E-04: Create bill → link to chalan → mark as paid → verify payment status updated
- E2E-05: Add employee → Create salary → Verify month appears in salary history
- E2E-06: Generate GSTR-1 for current month → Download PDF → Verify file opens
- E2E-07: Login as `Viewer` → Attempt to create company → See 403 / action hidden in UI
- E2E-08: Wait for access token to expire → Auto-refresh → Continue using app without re-login
- E2E-09: Perform several write operations → Open audit log → Verify all changes recorded

---

## 17. Session Execution Plan

### Session 1: Backend — Days 1–3
**Goal: Complete, tested .NET 9 API running in Docker. `dotnet test` all green.**

#### Step 1.1 — Solution Scaffold
```bash
mkdir backend && cd backend
dotnet new sln -n Shree
dotnet new webapi -n src/Shree.API --framework net9.0
dotnet new classlib -n src/Shree.Application
dotnet new classlib -n src/Shree.Domain
dotnet new classlib -n src/Shree.Infrastructure
dotnet new xunit -n tests/Shree.UnitTests
dotnet new xunit -n tests/Shree.IntegrationTests
dotnet sln add src/**/*.csproj tests/**/*.csproj
```

#### Step 1.2 — NuGet Packages

**Shree.Application:**
```
MediatR, FluentValidation.DependencyInjectionExtensions, AutoMapper
```

**Shree.Infrastructure:**
```
Microsoft.EntityFrameworkCore.SqlServer
Microsoft.EntityFrameworkCore.Tools
Microsoft.AspNetCore.Identity.EntityFrameworkCore
Serilog.AspNetCore, Serilog.Sinks.Seq
StackExchange.Redis
QuestPDF
ClosedXML
Microsoft.AspNetCore.SignalR
```

**Shree.API:**
```
Microsoft.AspNetCore.Authentication.JwtBearer
Scalar.AspNetCore
AspNetCoreRateLimit
```

**Tests:**
```
Testcontainers.MsSql, FluentAssertions, Microsoft.AspNetCore.Mvc.Testing
```

#### Step 1.3 — Domain Entities (`Shree.Domain/Entities/`)

Create all 12 business entities + BaseEntity + enums:

```csharp
// BaseEntity.cs
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}

// Enums
public enum GatepassStatus { Pending, Delivered }
public enum BillStatus { Draft, Submitted, Paid, Cancelled }
public enum PaymentStatus { Unpaid, Partial, Paid }
public enum PaymentMode { Cash, Cheque, RTGS, NEFT, UPI }
```

Entities: `Company`, `Vendor`, `Employee`, `Gatepass` (with `RollItem` owned collection), `Chalan`, `Bill`, `BillParticular`, `Payment` (with `PaymentAllocation` owned collection), `Expense`, `Voucher`, `Salary`, `Advance`, `AuditLog`

#### Step 1.4 — EF Core (`Shree.Infrastructure/Persistence/`)
- `ShreeDbContext : IdentityDbContext<ApplicationUser>`
- Entity configs in `Configurations/` (one per entity, Fluent API)
- Override `SaveChangesAsync`: timestamps + soft delete + audit write
- Migrations (5 groups listed above)
- Seed: admin user (email: `shree@prodevelopers.in`, PBKDF2 password), roles

#### Step 1.5 — Auth
- `AuthController`: Login, Refresh, Logout, Me
- `JwtTokenService`: 15-min access token + 7-day refresh token
- Refresh token stored as hash in DB with expiry
- HttpOnly cookie for refresh token

#### Step 1.6 — CRUD Endpoints (all 11 modules)
Per module: Commands + Queries + Validators + Controller.  
Order: Companies → Vendors → Employees → Gatepasses → Chalans → Bills → Payments → Expenses → Vouchers → Salary → Advances

#### Step 1.7 — Reports + Export
- `GstReportService`: GSTR-1 (outward B2B), GSTR-2 (inward), GSTR-3B (summary)
- `SalesReportService`, `PurchaseReportService`
- QuestPDF templates for bill print, GSTR-1, sales report
- ClosedXML for Excel export
- `ReportsController`, `ExportController`

#### Step 1.8 — Dashboard + SignalR
- `DashboardController`: stats, graph, recent gatepasses
- `GatewayHub : Hub` → broadcast `GatepassStatusChanged` event
- Register hub at `/hubs/gateway`

#### Step 1.9 — Cross-cutting
- `AspNetCoreRateLimit`: 5 req/s per user
- CORS policy locked to `http://localhost:3000`
- Security headers middleware (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Health checks: DB ping + Redis ping at `/health`

#### Step 1.10 — Tests
- Unit tests: tax calc, status transitions, audit interceptor, domain events
- Integration tests: all endpoints via `WebApplicationFactory` + `Testcontainers.MsSql`
- Run: `dotnet test` — all pass before Session 1 is declared complete

---

### Session 2: Frontend — Days 4–6
**Goal: Complete React app wired to live API. All 9 Playwright journeys green.**

#### Step 2.1 — Scaffold
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install @tanstack/react-query @tanstack/react-router @tanstack/react-table
npm install zustand react-hook-form @hookform/resolvers zod
npm install axios @microsoft/signalr
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
npm install recharts sonner date-fns
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
npm install -D @playwright/test
```

#### Step 2.2 — Core Infrastructure
- `lib/axios.ts`: instance, base URL, 401 interceptor → refresh → retry
- `store/authStore.ts`: Zustand auth (access token in memory)
- `app/router.tsx`: TanStack Router, all feature routes, protected layout
- `app/App.tsx`: QueryClientProvider + RouterProvider + Sonner
- `components/layout/AppLayout.tsx`, `Sidebar.tsx` (role-aware), `TopBar.tsx`
- `components/data-display/DataTable.tsx` (generic TanStack Table wrapper)

#### Step 2.3 — Auth Feature
- `features/auth/pages/LoginPage.tsx`
- Zod schema: `{ email: z.string().email(), password: z.string().min(6) }`
- Protected route HOC + role guard HOC

#### Step 2.4 — All Feature Pages
Build in business-flow order:

1. **Companies** — ManageCompaniesPage + CompanyForm + GSTIN validation
2. **Vendors** — ManageVendorsPage + VendorForm
3. **Employees** — ManageEmployeesPage + EmployeeForm + EmployeeProfilePage + DueSummary
4. **Gatepasses** — ManageGatepassesPage + AddGatepassPage + status update + RollItems editor
5. **Chalans** — ManageChalansPage + AddChalanPage (auto-fill from gatepass)
6. **Bills** — ManageBillsPage + AddBillPage + ParticularsTable (dynamic rows) + tax auto-calc
7. **Payments** — ManagePaymentsPage + AddPaymentPage (covers multiple bills)
8. **Expenses** — ManageExpensesPage + AddExpensePage
9. **Vouchers** — ManageVouchersPage + AddVoucherPage
10. **Salary** — ManageSalaryPage + CreateSalaryPage + month/year filter
11. **Advances** — ManageAdvancesPage + AddAdvancePage

#### Step 2.5 — Dashboard
- `features/dashboard/pages/DashboardPage.tsx`
- 4 StatCards: bills this month, pending gatepasses, employees, vendors
- Recharts `BarChart`: monthly sales vs expenses (year filter)
- Recent gatepasses widget — live update via `@microsoft/signalr`
- Todo widget: inline create/complete/delete

#### Step 2.6 — Reports
- `GstReportsPage`: tabs GSTR-1 / GSTR-2 / 3B + MonthYearPicker + DataTable + PDF + Excel
- `SalesReportPage`, `PurchaseReportPage`
- `CompanyWiseReportsPage`: company picker + 4 sub-tabs (bills/payments/chalans/gatepasses)

#### Step 2.7 — Audit Log (Admin only)
- `AuditLogPage`: filterable by entity, user, date range

#### Step 2.8 — OpenAPI Type Generation
```bash
npx openapi-typescript http://localhost:5000/swagger/v1/swagger.json -o src/api/schema.d.ts
```
All `useQuery`/`useMutation` hooks typed from generated schema.

#### Step 2.9 — Component Tests (Vitest + RTL)
- Auth: form validation, empty fields, protected redirect
- Companies: table renders rows, form validates GSTIN, delete dialog appears
- Bills: particulars add/remove, tax auto-calc on HSN change, status badge colors
- Gatepasses: approve button absent for Viewer role
- Dashboard: stat cards render, Recharts graph renders without crash

#### Step 2.10 — E2E Tests (Playwright)
Write and run all 9 journeys (E2E-01 to E2E-09) against `docker compose up` stack.  
All 9 green = **Session 2 complete**.

---

## 18. Verification Checklist (Definition of Done)

Run all steps to confirm the application is live and working:

```bash
# 1. Start everything
docker compose up --build

# 2. Backend health
curl http://localhost:5000/health  # → {"status":"Healthy"}

# 3. Auth smoke test
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"shree@prodevelopers.in","password":"keepsmiling"}'
# → { "accessToken": "eyJ..." }

# 4. Open frontend
open http://localhost:3000  # Login page loads

# 5. Test core flow manually
# Login → Dashboard → Create Company → Create Gatepass → Approve →
# Create Bill → Record Payment → Generate GSTR-1 → Download PDF

# 6. Run all backend tests
cd backend && dotnet test  # All pass

# 7. Run Playwright E2E
cd frontend && npx playwright test  # All 9 journeys green

# 8. Verify security
# Try POST as Viewer → 403
# Check DB: audit_logs table has entries for every write
# Inspect response headers: HSTS, CSP present
```

---

## 19. One-Paragraph Summary

This rebuild replaces a 2018-era PHP ERP (51 SQL-injection-vulnerable endpoints, MD5 passwords, 40+ scattered JS files loaded in iframes, no tests) with a production-grade React 18 + .NET 9 Web API application following Clean Architecture with CQRS via MediatR. The 14 original MySQL tables map directly to strongly-typed EF Core entities with migrations, audit columns, soft deletes, and explicit FK constraints. The entire original feature set — Gatepasses, Chalans, Bills, Payments, Expenses, Vouchers, Salary, Advances, GST Reports (GSTR-1/2/3B), and a live Dashboard — is rebuilt with RBAC (Admin/Accountant/Viewer), JWT auth (access token in memory, refresh in HttpOnly cookie), FluentValidation on every command, Serilog structured logging, PDF/Excel export via QuestPDF/ClosedXML, and real-time SignalR updates. Every one of the 12 PHP-era security gaps is closed by a specific named architectural decision. Ninety-nine test cases span unit, integration, component, and E2E layers, all runnable in CI via GitHub Actions and Docker Compose. The two-session plan compresses what would traditionally take 20 sprints (10 months) into two focused implementation sessions: Session 1 delivers a complete, tested .NET backend; Session 2 delivers a complete React frontend with all 9 Playwright E2E journeys passing.
