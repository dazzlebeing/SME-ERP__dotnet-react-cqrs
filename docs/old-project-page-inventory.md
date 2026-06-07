# Old PHP Project — Complete Page-by-Page Inventory

**Source:** `C:\Users\admin\source\repos\shree`
**Date:** 2026-05-28
**Purpose:** Authoritative reference for every page, API endpoint, and behavior in the legacy PHP ERP, so the React/.NET rebuild can be verified against the original 1-to-1.

---

## Quick Navigation

- [Authentication & Layout](#1-authentication--layout)
- [Dashboard](#2-dashboard)
- [Companies](#3-companies)
- [Vendors](#4-vendors)
- [Employees](#5-employees)
- [Gatepasses](#6-gatepasses)
- [Chalans](#7-chalans)
- [Bills](#8-bills)
- [Payments](#9-payments)
- [Expenses](#10-expenses)
- [Vouchers](#11-vouchers)
- [Salary](#12-salary)
- [Advances / Loans](#13-advances--loans)
- [Reports](#14-reports)
- [Trash](#15-trash)
- [Todo](#16-todo)
- [Print Views](#17-print-views)
- [Backend API Endpoints](#18-backend-api-endpoints)

---

## 1. Authentication & Layout

### `loginForm.php`
- **URL:** `/loginForm` (also accessible via redirect from `/`)
- **Layout:** Centered card on gradient background.
- **Elements:**
  - `#logoSection` — `<img id="logoImg" src="logo">` (Shree circle) + `<img id="gearImg" src="gear">` (gear ring spinning at 1.7s/180°)
  - `<form>`:
    - `input[type=email name=email required autocomplete=email autofocus]`
    - `input[type=password name=password required]`
    - `<img id="show" src="icon/eye">` — toggle password visibility
    - `<input type=checkbox id=remember checked>` Remember Me
    - `<a id=frgtPWD>Recover Password</a>` (no-op)
    - `<input type=submit id=proceed value="Login">`
  - `<span id="message">` — error message snackbar
- **JS:** `js/main.js`
- **Auth flow:** Session-based with MD5(password) lookup via `api/login.php` → sets `$_SESSION['email']` and `$_SESSION['userId']`.

### `index.php`
- Lightweight redirect: `if isLoggedin() → dashboard else → loginForm`.

### `error.php`
- Custom 404/error page.

### `dashboard.php` (Shell layout)
- **Sidebar `#sidebarMenu`** with buttons:
  - Home (active by default), Gatepasses, Chalans, Bills, Payments, Expenses, Reports, `<hr>`, Employees, Vouchers, More (disabled, expands to Companies/Vendors/Trash), Logout
- **Header** `<header>` inside `#dashboard`:
  - `<h1 id="headerHeading">Dashboard</h1>`
  - `<span id="email">` — shows lowercased user email + down-arrow + hidden "LOGOUT" text (click email = toggle arrow + reveal logout)
- **Content area `#dashboard`** loads other pages via `<iframe>` (`#mainWrapper innerHTML = "<iframe src='X'>"`).
- **Right-click context menu** `#contextMenu` items: Reload / Gatepasses / Manage Bills / Fullscreen / Log out.

---

## 2. Dashboard (`dashboard.php`)

### Layout

```
┌───────────────────────────────────────────────────────────────┐
│ #headerHeading                            #email ▼ LOGOUT     │
├───────────────────────────────────────────────────────────────┤
│ ┌─Statistics──────────────────────────┐  ┌─Todo App─────────┐ │
│ │ [Bills][Purchase][Gatepasses][Sales]│  │ Day  N Tasks Mon │ │
│ │ Donut + Numbers                     │  │ + add task       │ │
│ └─────────────────────────────────────┘  │ ─── list ────    │ │
│ ┌─Recent Gatepasses────┐                 │                  │ │
│ │ accordion list       │                 │                  │ │
│ └──────────────────────┘                 │                  │ │
│ ┌─Generate Reports─────┐                 │                  │ │
│ │ Sales / Purchase /CW │                 │                  │ │
│ └──────────────────────┘                 │                  │ │
│ ┌─Vouchers──────────┐                    │                  │ │
│ └───────────────────┘                    │                  │ │
│ ┌─Recent Bills──────┐                    │                  │ │
│ └───────────────────┘                    └──────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Backend data preloaded by PHP:
- `$billsThisMonth` = `COUNT(*) FROM bills WHERE MONTH(billDate)=NOW AND YEAR=NOW`
- `$pendingGatepasses` = `COUNT(*) FROM gatepasses WHERE status='Pending'`
- `$totalEmployees` = `COUNT(*) FROM employees`
- `$totalVendors` = `COUNT(*) FROM vendors`
- `$recentGatepasses` = `SELECT ... LIMIT 3 ORDER BY gatepassDate DESC` — colored yellow if Pending, green if Delivered

### JS behaviors (`js/dashboard.js`):
- Sidebar buttons load pages into iframe
- `logout()` → POST `/api/checkAuth.php?action=logout` → redirect to login
- `#email` click → toggle dropdown arrow rotation + show/hide LOGOUT text
- Right-click → show context menu at cursor
- Todo widget — fetch tasks, add, mark done, delete
- Stat tabs (Bills/Purchase/GatePasses/Sales/Payments) — switching tabs slides `#activeBar` underline

---

## 3. Companies

### `manageCompanies.php`
- **Header:** `[Add New] [Company List] [Search]`
- **Table:** `#` | Name | GSTIN | Contact (person + mobile) | Action (View / Edit / Delete)
- **JS:** `js/manageCompany.js`
  - Client-side filter: hide rows where Name doesn't contain query (falls back to GSTIN match)
  - `Alt+S` focus search, `Alt+N` click Add
  - Delete → confirm() → POST `/api/delete.php` with id+tableName
  - View → popup `<div id="popupBox">` with `fetchCompany/{id}` content
  - Edit → `editCompany/{id}`

### `addCompany.php` / `editCompany.php`
- Form fields:
  - Name (required)
  - Address (textarea)
  - GSTIN
  - Contact Person 1 + Mobile 1
  - Contact Person 2 + Mobile 2 (optional second contact)
- Submit → POST `/api/insertCompany.php` or `/api/updateCompany.php`

---

## 4. Vendors

### `manageVendors.php`
- Same table pattern as Companies: Name | GSTIN | Description | Action
- **JS:** `js/manageVendors.js`

### `addVendor.php` / `editVendor.php`
- Fields: Name, Address, GSTIN, Description
- Backend: `/api/insertVendor.php`, `/api/updateVendor.php`

---

## 5. Employees

### `manageEmployees.php`
- Table: Name | Mobile | Aadhar | Joining Date | Monthly Salary | Action

### `addEmployee.php` / `editEmployee.php`
- Fields: Name, Qualification, Mobile, Aadhar, Joining Date, Monthly Salary
- Backend: `/api/saveEmployee.php`, `/api/updateEmployee.php`

### `api/employeeProfile.php`
- Returns: employee details + salary history + advance history + total due
- Used in: not in main UI directly, but available via API

---

## 6. Gatepasses

### `manageGatepass.php`
- Header: `[Add New] [Pending Gatepasses] [Search]`
- Table: GP Number | Company | Date | Rolls Info (JSON parsed) | Status | Action

### `addGatepass.php`
- Fields:
  - Company (select dropdown)
  - Gatepass Number (text, validates uniqueness via `checkGatepass.php`)
  - Date
  - Rolls Info — dynamic rows: `[quantity] × [description]` add/remove
- Status defaults to "Pending"

### `modifyGatepass.php`
- Edit existing gatepass

### `pendingGatepasses.php`
- Same table as `manageGatepass.php`, filtered to `status='Pending'`
- Has an "Approve" button that PATCHes status → 'Delivered'

---

## 7. Chalans

### `manageChalans.php`
- Table: Chalan No | Date | Company | GP Number | Vehicle

### `addChalan.php`
- Fields:
  - GP Number (text) — on blur calls `getChalanInfo.php`/`fetchGatepass.php` → auto-fills:
    - Company
    - Vehicle Number
    - Rolls Info
  - Vehicle Number
  - Rolls
- Backend: `/api/saveChalan.php`

### Print Chalan
- `printChalan.php` — printable view (need to inspect for exact layout)

---

## 8. Bills

### `manageBills.php`
- Header: `[New Bill] [Manual Bill] [Search]`
- Table: Invoice Number (+ payment status dot) | Company | Gatepass Number (or "Manual Bill") | Date | Total | Actions
- Actions per row:
  - **Edit** → opens date-only modal (`updateBillDate`) or full-edit `editBill/{billNumber}`
  - **Print** → opens `printBill.php?billNumber=X` in new window
  - **Status toggle** → modal with radio (valid=green / invalid=red) + remarks textarea + Save

### `addBill.php`
- Form fields:
  - HSN Code (radio: 8455 / 8456)
  - Bill Number (text + autofocus) + hint showing "Last Bill Number" double-click to fill
  - Bill Date
  - Company (select)
  - Gatepass Number (select, populated after company chosen via `fetchGatepasses.php`)
  - Vehicle Number
  - Particulars table — dynamic rows: Description | Qty | Rate | Total
  - Special row types:
    - Normal row: qty>0, price>0
    - Note row: qty=0 AND price=0 → rendered as "Note: ..." on print
    - Discount row: total<0 → rendered as "-" qty/rate on print
  - Tax: CGST+SGST (intra-state) or IGST (inter-state)
  - Round-off (auto-calculated)
  - Bill Total (auto-calculated)
- Backend: `/api/createBill.php`

### `manualBill.php`
- Same as addBill but skips company-gatepass validation (used for service charges, miscellaneous billing)

### `updateBill.php` / `editBill`
- Full-bill edit
- Backend: `/api/updateBill.php`

### `pendingBills.php`
- List of bills where payment status = unpaid

### `api/checkBillNumber.php`
- Returns `{exists: bool}` for duplicate-number check on input

---

## 9. Payments

### `managePayment.php`
- Table: Date | Company | Mode | Amount | Description | Action

### `addPayment.php`
- Fields:
  - Date
  - Company (select)
  - Mode of Payment (Cash / Cheque / RTGS / NEFT / UPI)
  - Amount
  - **Paid Bills checkboxes** — list of pending bills for selected company; user checks which bills this payment covers (stored as JSON `paidBills` array)
  - Description
- Backend: `/api/savePayment.php`

---

## 10. Expenses

### `manageExpenses.php`
- Table: Date | Vendor | Invoice Number | Base Amount | Tax | Total | Action

### `addExpenses.php` / `updateExpenses.php`
- Fields:
  - Invoice Number
  - Date
  - Vendor (select)
  - Tax type (6 options: GST 5%, GST 12%, GST 18%, GST 28%, GST 0% (Exempt), Reverse Charge)
  - Base Amount
  - CGST, SGST, IGST (auto-calculated)
  - Total (auto)
  - Description
- Backend: `/api/saveExpenses.php`, `/api/updateExpenses.php`

---

## 11. Vouchers

### `manageVouchers.php`
- Table: Date | Paid To | Amount | Description | Action

### `addVoucher.php` / `editVoucher.php`
- Fields: Date, Paid To, Amount, Description
- Backend: `/api/saveVoucher.php`, `/api/updateVoucher.php`

Vouchers represent cash-out for misc expenses (chai, stationery, repairs) that aren't tied to a vendor.

---

## 12. Salary

### `manageSalary.php`
- Table: Employee | Month/Year | Working Days | Amount | Action

### `createSalary.php`
- Fields:
  - Employee (select) — on change, fetches salary months via `getSalaryMonths.php` to block duplicate-month entries
  - Month + Year
  - Working Days (number, default 26)
  - Amount — **auto-calculated as `(workingDays / 26) × baseSalary`** as user types
- Backend: `/api/saveSalaryDetails.php`

### `printSalary.php`
- Printable salary slip

### `api/fetchMonths.php`
- Used to enforce "one salary per employee per month"

---

## 13. Advances / Loans

The old project had **TWO PAGES referencing the same `advance` table:**
- `manageAdvance.php` — table view
- `newLoan.php` + `loanEntry.js` — entry form (labeled "Loan Entry")
- The page title flips between "Loans" and "Advance" — semantic duplication.

### `manageAdvance.php`
- Header label says "Loans"
- Table: # | Date | Employee | Loan Taken | Loan Returned | Due Till Date | Delete

### `newLoan.php`
- Fields:
  - Date
  - Employee (select) — on change, fetches due balance via `getEmployeeDue.php`
  - Due Before Today (disabled, shows running total)
  - Loan Taken
  - Loan Returned
  - Due After Today (disabled, live-computed)
- Backend: `/api/saveLoan.php`

---

## 14. Reports

### `reports.php`
8 report tiles in a grid:

| Tile | Subtitle | Description |
|------|----------|-------------|
| **B2B Report (GSTR1)** | Click to Generate | Outward supplies, B2B invoices, CGST/SGST/IGST breakdown |
| **Sales Report** | N Bills This Month / Worth Rs. X | Monthly sales statistics |
| **Delivered Rolls** | N Chalans Generated | Rolls dispatched in chosen period |
| **Pending GatePasses** | N pending | Quick link to pending list |
| **3B Report (mislabeled GSTR2)** | Click to Generate | GSTR-3B summary |
| **Purchase Report** | Spent Rs. X | Monthly purchase statistics |
| **Received Rolls** | N Gatepasses Received | Rolls received in chosen period |
| **Company Wise** | Bills/Gatepasses/Chalans/Payments | Single company, all data |

### Cash Flow Graph
- Below report tiles
- 5 vertical bar pairs — Sales (green) vs Expenses (red) per month
- `js/graph.js` animates bars

### `genrateGSTR1.php` (typo in old code: "genrate")
- B2B invoice list with company, GSTIN, billing details, CGST/SGST/IGST per row

### `genrateGSTR2.php`
- 3B summary — actually GSTR-3B output despite filename

### `salesReport.php`
- Year + Month dropdown → POST → table of bills for that period

### `purchaseReport.php`
- Year + Month dropdown → POST → table of expenses for that period

### `companyWiseReports.php`
- Company dropdown
- Report type (gatepasses / chalans / bills / payments)
- Filter mode (radio):
  - Year Wise (April-March financial year)
  - Month Wise (year + month)
  - Date Wise (from date + to date)
- "Recently Generated" list of last few reports

### `rollsRecieved.php`
- Year + Month → list of gatepasses received with rolls info

### `rollsDelivered.php`
- Year + Month → list of chalans dispatched with rolls info

---

## 15. Trash

### `manageTrash.php`
- Shows soft-deleted rows from a `trash` MySQL table
- Each row has **Restore** action that moves the row back to its original table
- This is **NOT** an audit log — it's an undo bin

The new project has audit logs (immutable history) but no restore functionality. This is a feature regression flagged as T-1 in `missing-features-audit.md`.

---

## 16. Todo

### `todo.php`
- Standalone todo app
- Fields: New task input (max 500 chars) + Add button
- Tasks shown in a list with checkbox (mark done) and delete button
- Persists to `tasksToDo.json` file via `addTodo.php`, `changeTodoIsDone.php`, `deleteTodo.php`

The dashboard embeds this as the right-hand widget.

---

## 17. Print Views

All print views render HTML formatted for print, then call `window.print()` and close on `afterprint`.

### `printBill.php`
- Tax Invoice layout:
  - Header: "Original / Duplicate / Triplicate"
  - Company logo (`img/TransparentLogo.png`) + title + addresses + GSTIN
  - HSN Code
  - Invoice No, Date, RGP No (gatepass), Vehicle
  - Particulars table with description, qty (with unit detection), rate, amount
  - Note rows (qty=0 price=0) rendered as "Note: ..."
  - Discount rows (total<0) rendered with "-" placeholders
  - Tax summary: CGST + SGST OR IGST (based on intra/inter-state)
  - Round-off
  - **Amount in words** ("TWENTY FIVE THOUSAND ONLY")
  - Bank details
  - Signature line

### `printChalan.php`
- Similar template for delivery chalan

### `printSalary.php`
- Salary slip with employee details, working days, amount

---

## 18. Backend API Endpoints (PHP)

All in `api/` folder. Listed with the new project's mapped endpoint where applicable.

### Authentication
| Old PHP | New .NET |
|---------|----------|
| `api/login.php` | `POST /api/v1/auth/login` |
| `api/checkAuth.php` | `GET /api/v1/auth/me` |
| `api/rememberMe.php` | ⏳ Not implemented |
| `api/middleware.php` (session check) | JWT bearer middleware |
| `api/getHash.php` (MD5 utility) | Replaced by ASP.NET Identity PBKDF2 |

### Companies
| Old | New |
|-----|-----|
| `api/fetchCompanies.php` | `GET /api/v1/companies` |
| `api/companyList.php` | `GET /api/v1/companies/list` |
| `api/companyProfile.php` | ⏳ Not implemented (PR-1) |
| `api/insertCompany.php` | `POST /api/v1/companies` |
| `api/updateCompany.php` | `PUT /api/v1/companies/{id}` |
| `api/deleteCompany.php` | `DELETE /api/v1/companies/{id}` |
| `api/fetchGstin.php` | ⏳ Not implemented (AF-1) |

### Vendors
| Old | New |
|-----|-----|
| `api/vendorList.php` | `GET /api/v1/vendors/list` |
| `api/vendorProfile.php` | ⏳ Not implemented (PR-3) |
| `api/insertVendor.php` | `POST /api/v1/vendors` |
| `api/updateVendor.php` | `PUT /api/v1/vendors/{id}` |

### Employees
| Old | New |
|-----|-----|
| `api/saveEmployee.php` | `POST /api/v1/employees` |
| `api/updateEmployee.php` | `PUT /api/v1/employees/{id}` |
| `api/employeeProfile.php` | ⏳ Not implemented (PR-2) |
| `api/getEmployeeDue.php` | ⏳ Backend exists per plan, frontend doesn't wire (AF-4) |

### Gatepasses
| Old | New |
|-----|-----|
| `api/addGatepass.php` | `POST /api/v1/gatepasses` |
| `api/modifyGatepass.php` | ⚠️ Backend supports `PUT`, frontend missing form (G-2) |
| `api/checkGatepass.php` | `GET /api/v1/gatepasses/check/{number}` |
| `api/gatepassDetails.php` | `GET /api/v1/gatepasses/details/{number}` |
| `api/fetchGatepass.php` | (same) |
| `api/fetchGatepasses.php` | `GET /api/v1/gatepasses` |

### Chalans
| Old | New |
|-----|-----|
| `api/saveChalan.php` | `POST /api/v1/chalans` |
| `api/fetchChalan.php` | `GET /api/v1/chalans/{id}` |
| `api/getChalanInfo.php` | (combined into gatepass details) |

### Bills
| Old | New |
|-----|-----|
| `api/createBill.php` | `POST /api/v1/bills` |
| `api/updateBill.php` | `PUT /api/v1/bills/{id}` |
| `api/updateBillDate.php` | ⏳ Missing inline date-only edit (B-5) |
| `api/updateBillStatus.php` | `PATCH /api/v1/bills/{id}/status` |
| `api/checkBillNumber.php` | `GET /api/v1/bills/check/{number}` |
| `api/pendingBills.php` | `GET /api/v1/bills/pending` (per plan) |

### Payments / Expenses / Vouchers
| Old | New |
|-----|-----|
| `api/savePayment.php` | `POST /api/v1/payments` |
| `api/fetchPayment.php` | `GET /api/v1/payments` |
| `api/deletePayment.php` | `DELETE /api/v1/payments/{id}` |
| `api/saveExpenses.php` | `POST /api/v1/expenses` |
| `api/updateExpenses.php` | `PUT /api/v1/expenses/{id}` |
| `api/fetchExpenses.php` | `GET /api/v1/expenses` |
| `api/saveVoucher.php` | `POST /api/v1/vouchers` |
| `api/updateVoucher.php` | `PUT /api/v1/vouchers/{id}` |

### Salary / Advances
| Old | New |
|-----|-----|
| `api/saveSalaryDetails.php` | `POST /api/v1/salary` |
| `api/deleteSalary.php` | `DELETE /api/v1/salary/{id}` |
| `api/getSalaryMonths.php` | `GET /api/v1/salary/months` (per plan) |
| `api/saveLoan.php` | `POST /api/v1/advances` |
| `api/deleteLoan.php` | `DELETE /api/v1/advances/{id}` |

### Reports
| Old | New |
|-----|-----|
| `api/generateReportB2B.php` | `GET /api/v1/reports/gst/gstr1` |
| `api/generateReport3B.php` | `GET /api/v1/reports/gst/3b` |
| `api/generateSalesReport.php` | `GET /api/v1/reports/sales` |
| `api/generatePurchaseReport.php` | `GET /api/v1/reports/purchase` |
| `api/companyWiseReports/*` | ⏳ Not implemented (R-4) |
| `api/reportStatistics.php` | (mapped to dashboard stats) |

### Dashboard
| Old | New |
|-----|-----|
| `api/getGraphData.php` | `GET /api/v1/dashboard/graph` |
| `api/fetchYears.php` / `api/fetchMonths.php` | (frontend-generated) |
| `api/fetchYearsByCompanyId.php` / `api/fetchMonthsByCompanyId.php` | ⏳ Not implemented (needed for R-4) |

### Todo
| Old | New |
|-----|-----|
| `api/addTodo.php` / `changeTodoIsDone.php` / `deleteTodo.php` | ❌ No backend table built (D-3) |

---

## 19. Database Schema Summary (MySQL → SQL Server)

14 MySQL tables in original → 14 EF Core entities + 1 AuditLog table:

| Table | New Entity | Notes |
|-------|-----------|-------|
| `login` | `AspNetUsers` (Identity) | MD5 → PBKDF2 |
| `companies` | `Company` | Added timestamps + soft delete |
| `vendors` | `Vendor` | Same |
| `employees` | `Employee` | Same |
| `gatepasses` | `Gatepass` | `rollsInfo` JSON → typed |
| `chalans` | `Chalan` | Same |
| `bills` | `Bill` | INT amounts → DECIMAL(12,2) |
| `particulars` | `BillParticular` | Owned by Bill |
| `payments` | `Payment` | `paidBills` JSON → `PaymentAllocation` owned collection |
| `expenses` | `Expense` | Same |
| `vouchers` | `Voucher` | Same |
| `salary` | `Salary` | Same |
| `advance` | `Advance` | Same (Loan + Advance unified) |
| `trash` | ❌ Dropped — replaced by `AuditLog` (regression, see T-1) |
| — | `AuditLog` (new) | id, table, recordId, action, oldValues JSON, newValues JSON, userId, timestamp |

---

## 20. CSS / Visual Style Inventory

Files in `css/`:
- `style.css` — login + general
- `dashboard.css` — dashboard shell
- `manageCompany.css` — shared list-page styling (also used by trash, payments, etc.)
- `addBill.css`, `addCompany.css`, `addGatepass.css`, `addInvoice.css` — form pages
- `companyWiseReports.css` — report page
- `customContext.css` — right-click context menu
- `graph.css` — bar chart
- `gstReport1.css` — GST report styling
- `manageReports.css` — reports page tiles
- `montserrat.css` — font import (Montserrat)
- `popup.css` — modal styling
- `snackbar.css` — toast messages
- `todo.css` — todo widget

Original color palette:
- Primary: `dodgerblue` (#1e90ff)
- Success green: `#58e870`, `#02d1a4`
- Warning amber: `#f7ad00`
- Error red: `red`, `orangered`, `#ba0000`
- Sidebar dark: `#1a237e` → `#283593` → `#3949ab` (gradient, replicated in new sidebar)

---

## 21. Key Business Rules Encoded in Old PHP

These rules need to be preserved in the .NET backend:

1. **Bill total = subtotal + CGST + SGST + round-off** (intra-state) OR **subtotal + IGST + round-off** (inter-state)
2. **CGST = SGST = 9%, IGST = 18%** (config in `config.php` → migrated to `appsettings.json`)
3. **Salary auto-calc:** `amount = round((workingDays / 26) × baseSalary, 2)`
4. **Round-off:** `roundOff = round(billTotalRaw) - billTotalRaw` (to nearest rupee)
5. **One salary per employee per month** — blocked at insert
6. **Gatepass number is unique** across all gatepasses
7. **Bill number is unique** across all bills
8. **Advance total due:** `totalDue = sum(taken) - sum(returned)`
9. **Bill payment status:** `paid` if sum of payments allocated to this bill ≥ billTotal; else `unpaid` or `partial`
10. **Particulars with qty=0 AND price=0** are treated as Notes, not line items
11. **Particulars with total < 0** are treated as Discounts on print
12. **Unit on print:** "Roll(s)" if description contains "roll", "MT" if "carbon", else "Num"
13. **Inter-state vs intra-state detection:** based on first 2 digits of company GSTIN (state code) — if matches business state code (`23` for MP), use CGST+SGST; else IGST
14. **Amount in words** generated by recursive Indian numbering (lakhs, crores) for print
15. **Soft delete:** removed rows moved to `trash` table (now: `IsDeleted=true` + audit log)

---

## 22. File Layout Map (Old → New)

| Old PHP file | New React/.NET equivalent |
|--------------|---------------------------|
| `loginForm.php` | `frontend/src/pages/LoginPage.tsx` |
| `dashboard.php` | `frontend/src/pages/DashboardPage.tsx` + `AppLayout.tsx` + `Sidebar.tsx` + `TopBar.tsx` |
| `manageCompanies.php` | `frontend/src/pages/CompaniesPage.tsx` |
| `addCompany.php`/`editCompany.php` | (inline modal inside CompaniesPage) |
| `manageVendors.php` | `frontend/src/pages/VendorsPage.tsx` |
| `manageEmployees.php` | `frontend/src/pages/EmployeesPage.tsx` |
| `manageGatepass.php`+`pendingGatepasses.php` | `frontend/src/pages/GatepassesPage.tsx` (unified via filter) |
| `addGatepass.php`/`modifyGatepass.php` | (create modal in GatepassesPage; edit modal ⏳ missing) |
| `manageChalans.php` | `frontend/src/pages/ChalansPage.tsx` |
| `manageBills.php`+`pendingBills.php` | `frontend/src/pages/BillsPage.tsx` (unified via filter) |
| `addBill.php`+`manualBill.php` | (single create modal — manual mode ⏳ missing) |
| `managePayment.php` | `frontend/src/pages/PaymentsPage.tsx` |
| `manageExpenses.php` | `frontend/src/pages/ExpensesPage.tsx` |
| `manageVouchers.php` | `frontend/src/pages/VouchersPage.tsx` |
| `manageSalary.php` | `frontend/src/pages/SalaryPage.tsx` |
| `manageAdvance.php`+`newLoan.php` | `frontend/src/pages/AdvancesPage.tsx` (unified) |
| `reports.php`+`genrateGSTR1.php`+`genrateGSTR2.php`+`salesReport.php`+`purchaseReport.php` | `frontend/src/pages/ReportsPage.tsx` |
| `companyWiseReports.php` | ⏳ `frontend/src/pages/CompanyReportsPage.tsx` (not yet built) |
| `rollsRecieved.php` | ⏳ Not built |
| `rollsDelivered.php` | ⏳ Not built |
| `manageTrash.php` | ⏳ Not built — replaced (regression) by `AuditLogsPage.tsx` |
| `todo.php` | ⏳ Not built |
| `printBill.php` | Backend QuestPDF → `GET /api/v1/export/bills/{id}/pdf` |
| `printChalan.php` | ⏳ Not built |
| `printSalary.php` | ⏳ Not built |
| `error.php` | `frontend/src/components/feedback/ErrorBoundary.tsx` (planned) |

---

## 23. Total Pages: 41 in Old PHP vs Status in New

| Status | Count |
|--------|-------|
| ✅ Implemented | 15 |
| ⚠️ Partially implemented | 6 |
| ❌ Missing | 8 |
| 🔀 Replaced (acceptable) | 7 |
| 🔀 Replaced (regression) | 1 (Trash) |
| 🟢 Intentionally skipped | 4 (right-click menu, sound, demo.php, decorative bg images) |

---

**End of inventory.**
