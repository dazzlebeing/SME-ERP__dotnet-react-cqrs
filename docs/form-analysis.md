# Form Analysis — Shree ERP

> **Purpose:** Every form in the application — all fields, data types, validations,
> relationships, and submission behaviour. Useful as a checklist for QA testing and
> for catching missing fields vs the original PHP project.

---

## 1. Login Form
**Location:** `/login` → `LoginPage.tsx`  
**Submit action:** `POST /api/v1/auth/login` → sets access token in sessionStorage, refresh token in HttpOnly cookie

| Field | Type | Validation | Default |
|-------|------|-----------|---------|
| Email / Username | text (email) | Required | — |
| Password | password (toggleable eye icon) | Required, min 6 chars | — |
| Remember Me | checkbox | — | unchecked |

**Notes:**
- On success → redirect to `/` (Dashboard)
- On error → toast "Invalid credentials"
- "Recover Password" link present (endpoint not yet implemented)
- Logo spins continuously (CSS `@keyframes spin-gear`, 12s linear infinite)

---

## 2. Company Form (Add / Edit)
**Location:** `CompaniesPage.tsx` → Modal  
**Submit action:** `POST /api/v1/companies` (add) or `PUT /api/v1/companies/{id}` (edit)

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Company Name * | text | Required | Must be unique |
| Address | text | — | Full address |
| GSTIN | text | — (format not validated yet) | Pattern: `23AAOPJ2936N1ZC` placeholder |
| Contact Person 1 | text | — | Primary contact |
| Phone 1 | text | — | |
| Contact Person 2 | text | — | Secondary contact |
| Phone 2 | text | — | |

**Missing vs PHP:** GSTIN format validation (15-char regex)

---

## 3. Vendor Form (Add / Edit)
**Location:** `VendorsPage.tsx` → Modal  
**Submit action:** `POST /api/v1/vendors` or `PUT /api/v1/vendors/{id}`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Vendor Name * | text | Required | |
| Address | text | — | |
| GSTIN | text | — | |
| Description | textarea | — | Business description / notes |

---

## 4. Employee Form (Add / Edit)
**Location:** `EmployeesPage.tsx` → Modal  
**Submit action:** `POST /api/v1/employees` or `PUT /api/v1/employees/{id}`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Full Name * | text | Required | |
| Qualification | text | — | e.g. B.Tech, ITI |
| Mobile Number | text | — | 10-digit mobile |
| Aadhar No | text | — | 12-digit Aadhar |
| Joining Date | date | — | ISO date |
| Monthly Salary (₹) | number | — | Base salary for auto-calc |

**Notes:**
- `salary` coerced to `Number` before submit
- Joining date formatted with `fmt.dateInput()` when editing

---

## 5. Gatepass Form (Add)
**Location:** `GatepassesPage.tsx` → Modal  
**Submit action:** `POST /api/v1/gatepasses`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Company Name * | select | Required | Dropdown from `/companies/list` |
| Gatepass Number * | text | Required | Must be unique |
| Gatepass Date * | date | Required | ISO date |
| Rolls Info (dynamic table) | fieldArray | — | |
| — Row #: Quantity | number (step 0.5) | — | e.g. 2.5 |
| — Row #: Description | text | — | e.g. "500mm CRS Roll" |
| + Add Roll / Remove | button | — | Min 0 rows allowed |

**Submit transform:** `formatRolls(rolls)` → JSON string  `[{"quantity":2,"description":"500mm"}]`  
**Status on create:** always `"Pending"`  
**Approve action:** separate PATCH button (Admin only) — no form, instant API call

---

## 6. Chalan Form (Add / Edit)
**Location:** `ChalansPage.tsx` → Modal  
**Submit action:** `POST /api/v1/chalans` or `PUT /api/v1/chalans/{id}`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Company * | select | Required | Dropdown from `/companies/list` |
| Date * | date | Required | |
| Gatepass Number * | text | Required | Should match an existing GP (no auto-lookup yet) |
| Vehicle Number | text | — | e.g. MP-09-AB-1234 |
| Rolls Info | text | — | Currently plain text; TODO: JSON array like Gatepasses |

**Gap:** No gatepass lookup — entering a GP number should auto-fill Company, Date, Vehicle, Rolls.

---

## 7. Bill Form (Add / Edit)
**Location:** `BillsPage.tsx` → Modal  
**Submit action:** `POST /api/v1/bills` or `PUT /api/v1/bills/{id}`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Bill Number * | text | Required | Must be unique |
| Bill Date * | date | Required | |
| Company * | select | Required | `/companies/list` |
| Gatepass Number | text | — | Links to GP |
| Vehicle Number | text | — | |
| HSN Code | text | — | e.g. 8455 |
| Tax Type | select | — | CGST/SGST or IGST |
| Particulars (dynamic table) | fieldArray | — | |
| — Description | text | — | |
| — Quantity | number (step 0.01) | — | |
| — Rate (₹) | number (step 0.01) | — | |
| — Amount | computed | — | Qty × Rate (read-only display) |
| + Add Row / Remove | button | — | |
| Subtotal | computed display | — | Sum of all particulars |
| CGST (9%) / SGST (9%) | computed display | — | If tax type = CGST/SGST |
| IGST (18%) | computed display | — | If tax type = IGST |
| Total | computed display | — | Subtotal + tax |
| Remarks | textarea | — | |

**Submit transform (`calcTotals`):**
```
billAmount = Σ(qty × price)
cgst = billAmount × 9% (if CGST/SGST)
sgst = cgst
igst = billAmount × 18% (if IGST)
billTotal = billAmount + cgst + sgst + igst
```

**Gap:** `roundOff` field stored in DB but not shown in UI.

---

## 8. Payment Form (Add)
**Location:** `PaymentsPage.tsx` → Modal  
**Submit action:** `POST /api/v1/payments`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Company * | select | Required | `/companies/list` |
| Payment Date * | date | Required | |
| Mode of Payment * | select | Required | Cash / Cheque / RTGS / NEFT / UPI |
| Payment Amount (₹) * | number (step 0.01) | Required, > 0 | |
| Paid Bills | textarea | — | Bill numbers separated by commas |
| Description / Remarks | textarea | — | |

**Notes:**
- No edit (only Add + Delete for Admin)
- `companyId` and `paymentAmount` coerced to Number before submit

---

## 9. Expense Form (Add / Edit)
**Location:** `ExpensesPage.tsx` → Modal  
**Submit action:** `POST /api/v1/expenses` or `PUT /api/v1/expenses/{id}`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Invoice Number | text | — | Optional; shown in table |
| Date * | date | Required | |
| Vendor * | select | Required | `/vendors/list` |
| Base Amount (₹) * | number (step 0.01) | Required | Triggers tax recalc on change |
| Tax Type | select (uncontrolled) | — | 6 options (see below) |
| CGST (₹) | number | read-only | Auto-calculated |
| SGST (₹) | number | read-only | Auto-calculated |
| IGST (₹) | number | read-only | Auto-calculated |
| Total (₹) | number | read-only | Base + CGST + SGST + IGST |
| Description | textarea | — | |

**Tax Type Options:**
| Label | CGST% | SGST% | IGST% |
|-------|-------|-------|-------|
| None (0%) | 0 | 0 | 0 |
| GST 5% | 2.5 | 2.5 | 0 |
| GST 12% | 6 | 6 | 0 |
| GST 18% | 9 | 9 | 0 |
| GST 28% | 14 | 14 | 0 |
| IGST 18% | 0 | 0 | 18 |

**Auto-calc logic:** fires `onChange` on Amount field and `onChange` on Tax Type select — updates CGST/SGST/IGST/Total via `setValue`.

---

## 10. Voucher Form (Add / Edit)
**Location:** `VouchersPage.tsx` → Modal  
**Submit action:** `POST /api/v1/vouchers` or `PUT /api/v1/vouchers/{id}`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Date * | date | Required | Defaults to today |
| Amount (₹) * | number (step 0.01) | Required, > 0 | |
| Paid To * | text | Required | Name of recipient |
| Description / Remarks | textarea | — | |

---

## 11. Salary Form (Add)
**Location:** `SalaryPage.tsx` → Modal  
**Submit action:** `POST /api/v1/salary`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Employee * | select | Required | `/employees/list` |
| Monthly salary hint | display only | — | Shows selected employee's base salary |
| Month * | select (1–12) | Required | Defaults to current month |
| Year * | select (last 5 years) | Required | Defaults to current year |
| Working Days | number (step 0.5) | — | Defaults to 26 |
| Salary Amount (₹) * | number (step 0.01) | Required, > 0 | Manually entered |

**Notes:**
- No edit (Add + Delete for Admin only)
- `employeeId`, `workingDays`, `month`, `year`, `amount` all coerced to Number
- Backend enforces uniqueness: same employee + month + year → 409

**Gap:** No auto-calculation of salary from working days. PHP formula:
`amount = (workingDays / 26) × employee.salary`

---

## 12. Advance Form (Add)
**Location:** `AdvancesPage.tsx` → Modal  
**Submit action:** `POST /api/v1/advances`

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Employee * | select | Required | `/employees/list` |
| Date * | date | Required | Defaults to today |
| Taken Amount (₹) * | number (step 0.01) | Required | |
| Returned Amount (₹) | number (step 0.01) | — | Defaults to 0 |
| Total Due (₹) | number | read-only | `takenAmount - returnedAmount` |

**Auto-calc:** `recalcDue(taken, returned)` → `setValue('totalDue', taken - returned)` triggered on each change.

**Notes:**
- No edit (Add + Delete for Admin only)
- `totalDue` is stored in DB (not computed on read); can drift if records updated manually

---

## 13. Filter Controls (not forms, but UX patterns)

| Page | Filters available |
|------|------------------|
| Companies | Search (name) |
| Vendors | Search (name) |
| Employees | Search (name) |
| Gatepasses | Status dropdown, Search (GP no / company) |
| Chalans | Search (GP no / company) — **month/year filter missing** |
| Bills | Status dropdown, Payment status dropdown, Search (bill no / company) — **company filter missing** |
| Payments | Company dropdown, Month, Year, Search (company) |
| Expenses | Vendor dropdown, Month, Year, Search (invoice / vendor) |
| Vouchers | Month, Year, Search (paid to) |
| Salary | Employee dropdown, Month, Year, Search (employee) |
| Advances | Employee dropdown, Search (employee) |
| Reports | Month, Year (tab-specific) |
| Audit Logs | Entity type, Action type |

---

## Summary of Required Validations Not Yet Implemented

| Form | Missing Validation |
|------|--------------------|
| Company | GSTIN format (15-char regex) |
| Vendor | GSTIN format |
| Bill | Bill number uniqueness check (client-side pre-check) |
| Gatepass | GP number uniqueness check (client-side pre-check) |
| Employee | Mobile number format (10 digits), Aadhar format (12 digits) |
| Salary | Working days max = 31, positive only |
| Expense | Date not in future (optional) |
| Advance | Returned ≤ Taken |
