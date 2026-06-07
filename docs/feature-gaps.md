# Feature Gaps — PHP vs React/dotnet Project

> **Purpose:** Every nuance, field, and behaviour present in the original PHP ERP (2018) that
> is missing, different, or incomplete in the new React + ASP.NET Core 9 project. Items are
> grouped by module and rated by priority (🔴 High / 🟡 Medium / 🟢 Low).

---

## 1. Bills Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| B-1 | **Invoice Number column visible** | Bills list showed Invoice/Bill Number as first column in bold | Shown correctly as `billNumber` | ✅ Done |
| B-2 | **Round-off field** | PHP had a `roundOff` row in the bill total section (typically ±0.xx) | Field exists in DB and payload but not rendered in form total breakdown | 🟡 Medium |
| B-3 | **Payment received amount** | Bills list showed "Received: ₹X,XXX" below the payment status badge | `paymentReceived` shown in table under Payment column | ✅ Done |
| B-4 | **Bill status — Active / Inactive** | PHP called them Active/Inactive (not Draft/Submitted); changing status was via a separate "Update Status" form | New project uses Draft/Submitted/Paid/Cancelled; status patch endpoint exists but no UI button to change status | 🔴 High |
| B-5 | **Printable bill view / PDF** | PHP had a dedicated printable HTML page at `generatebill.php`; separate PDF download | PDF download via `/export/bills/{id}/pdf` is wired in BillsPage | ✅ Done |
| B-6 | **HSN Code on bill** | HSN code field visible in bill form | Included in form | ✅ Done |
| B-7 | **Company filter dropdown on Bills list** | PHP bills page had a company filter | Bills page has status + payment filters only — **company filter missing** | 🔴 High |
| B-8 | **Gatepass number lookup** | Entering GP number auto-fetched company name and vehicle number | No auto-fill on GP number in bill form | 🟡 Medium |
| B-9 | **Bill date update** | Admin could change a bill's date via a dedicated form | No UI for `PATCH /bills/{id}/date` | 🟢 Low |
| B-10 | **Remarks / Notes field** | Remarks textarea at bottom of bill form | Present in form and payload | ✅ Done |

---

## 2. Gatepasses Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| G-1 | **Approve / Deliver button** | Admin could click "Deliver" to mark GP as Delivered | `CheckCircle` button visible for Admin on Pending GPs | ✅ Done |
| G-2 | **GP number uniqueness check** | PHP showed error if GP number already existed | Backend returns 409; frontend shows toast error | ✅ Done |
| G-3 | **Rolls info structured table** | PHP form had a dynamic table: `#`, `Quantity`, `Description`, `Remove` rows | Implemented with `useFieldArray` matching PHP layout | ✅ Done |
| G-4 | **Company filter on Gatepasses list** | PHP had a company dropdown filter on the gatepasses list | **Company filter missing** from PageHeader actions | 🟡 Medium |
| G-5 | **GP → Chalan pre-fill** | When creating a Chalan, entering the GP number auto-filled: company, date, vehicle, rolls | ChalansPage has a single-line `rollsInfo` field — **no GP lookup / auto-fill** | 🔴 High |

---

## 3. Chalans Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| C-1 | **Chalan Number (sequential)** | PHP auto-generated a sequential chalan number (separate from GP number) | New project has no `chalanNumber` column — chalans are identified by DB `id` | 🟡 Medium |
| C-2 | **Rolls Info from GP** | PHP chalan form fetched rolls from the linked gatepass | Chalan form has a plain text `rollsInfo` field | 🔴 High |
| C-3 | **Vehicle number pre-fill** | Pulled from linked gatepass | Not pre-filled | 🟡 Medium |
| C-4 | **Chalan date filter** | PHP chalans list had month/year filter | **Month/year filter missing** from ChalansPage | 🟡 Medium |

---

## 4. Payments Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| P-1 | **Paid Bills field** | Textarea showing which bill numbers this payment covers | `paidBills` field in form as Textarea | ✅ Done |
| P-2 | **Payment links to bill** | PHP marked linked bills as "Paid" or "Partial" automatically | No automatic bill-status update when payment recorded | 🟡 Medium |
| P-3 | **Outstanding balance** | PHP showed company outstanding = sum(billTotals) - sum(payments) | Not present in new UI; would need a new API endpoint | 🟡 Medium |

---

## 5. Expenses Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| E-1 | **Invoice Number as first column** | PHP expense list showed Invoice No prominently | Shown with `font-mono text-xs` class | ✅ Done |
| E-2 | **Tax type — IGST only option** | PHP had IGST 18% as separate option | Included as 6th TAX_OPTIONS entry | ✅ Done |
| E-3 | **Vendor filter on list** | PHP had vendor dropdown filter | Present in PageHeader | ✅ Done |

---

## 6. Salary Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| S-1 | **Salary date field** | PHP stored a specific date for the salary payment | New project stores `month` + `year` but also stores a `date` — the date field is not exposed in form | 🟢 Low |
| S-2 | **Duplicate month protection** | PHP prevented entering salary for the same employee+month twice | Backend returns 409; toast shown | ✅ Done |
| S-3 | **Net salary calculation** | PHP showed: `working days / 26 × base salary` | Working days and amount are separate fields; formula shown via employee salary hint | 🟡 Medium — add auto-calc |

---

## 7. Advances Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| A-1 | **Loan vs Advance** | PHP tracked "Loan" (long-term) and "Advance" (short-term) separately in the same table via a type field | New project has a single `advances` table with no type distinction | 🟢 Low |
| A-2 | **Running total due** | PHP showed cumulative due per employee across all records | Summary shown per row; no employee-level running total widget | 🟡 Medium |
| A-3 | **Employee due widget** | PHP employee profile showed a "Total Due" badge at the top | `/employees/{id}/due` API exists but no frontend widget | 🟡 Medium |

---

## 8. Dashboard Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| D-1 | **Statistics tabs** | PHP dashboard had 5 tabs: Bills, Purchase, GatePasses, Sales, Payments — each with amounts and counts for the current month | Implemented as `DonutStat` cards with tab selector | ✅ Done |
| D-2 | **Quick access links** | PHP had icon+label grid linking to each module | Implemented as `QuickLink` grid | ✅ Done |
| D-3 | **Monthly bar chart** | Revenue vs Expense bar chart | Implemented with Recharts BarChart | ✅ Done |
| D-4 | **Recent gatepasses widget** | PHP listed last 5 gatepasses | Present | ✅ Done |
| D-5 | **Live SignalR update** | Not in PHP (new feature) | Backend hub registered; frontend not wired | 🟢 Low |

---

## 9. Reports Module

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| R-1 | **GSTR-1 (outward supplies)** | PHP `gstr1.php` listed B2B invoices with GSTIN, taxable value, CGST/SGST/IGST | Present in ReportsPage tab | ✅ Done |
| R-2 | **GSTR-2 (inward supplies)** | PHP `gstr2.php` listed purchase invoices from expenses | Present | ✅ Done |
| R-3 | **GSTR-3B summary** | PHP `gstr3b.php` showed consolidated liability | Present | ✅ Done |
| R-4 | **Sales report** | Month/year filtered list of bills | Present | ✅ Done |
| R-5 | **Purchase report** | Month/year filtered list of expenses | Present | ✅ Done |
| R-6 | **Company-wise reports** | PHP had dedicated pages: company bills, payments, chalans, GPs | **Not implemented** in new UI | 🔴 High |
| R-7 | **PDF download** | Each report had a "Print" button | Excel download present; PDF not wired in UI | 🟡 Medium |
| R-8 | **Excel download** | PHP `exportexcel.php` | Excel download button present | ✅ Done |

---

## 10. Companies / Vendors / Employees

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| CV-1 | **Contact Person 2** | PHP company form had two contact person+phone pairs | Both shown in form; table shows only Person 1 | 🟢 Low |
| CV-2 | **GSTIN format validation** | PHP validated 15-char GSTIN pattern `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]` | **No validation** in new form — just a plain text input | 🟡 Medium |
| CV-3 | **Employee Aadhar** | 12-digit Aadhar number field | Present in form; **not shown in table** | 🟢 Low |
| CV-4 | **Employee Due badge** | Employee list showed outstanding advance/loan due | Not present in EmployeesPage table | 🟡 Medium |

---

## 11. Auth / User Management

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| AU-1 | **User management UI** | PHP had a basic `adduser.php` page | `/api/v1/auth/me` exists; **no admin UI for user list/create** | 🔴 High |
| AU-2 | **Password change** | PHP had `changepassword.php` | **Not implemented** | 🔴 High |
| AU-3 | **Forgot password / recovery** | PHP had a "Recover Password" link (sent email) | Login page shows the link; endpoint not implemented | 🟡 Medium |
| AU-4 | **Remember me** | PHP stored credentials in localStorage | New project uses `sessionStorage` access token + HttpOnly refresh cookie; Remember Me checkbox maps to longer-lived refresh token (not yet wired) | 🟡 Medium |

---

## 12. General UX

| # | Gap | PHP behaviour | New project | Priority |
|---|-----|--------------|-------------|----------|
| UX-1 | **Trash / Undo delete** | PHP stored deleted records in a `trash` table; there was a Trash page to restore | New project uses soft-delete (IsDeleted flag); **no Trash UI page** | 🟡 Medium |
| UX-2 | **Audit log page** | No equivalent in PHP | New: AuditLogPage (Admin only) — entity/action filter, old/new values | ✅ New feature |
| UX-3 | **Pagination page size** | PHP default was 10 rows | New project defaults to 20 rows | 🟢 Low — adjust if needed |
| UX-4 | **Print preview styling** | PHP pages had `@media print` CSS so the browser print dialog rendered correctly | No print styles in new project | 🟢 Low |
| UX-5 | **Date input locale** | PHP showed dates in `DD-Mon-YYYY` format (e.g., 15-Jan-2024) | New project uses `fmt.date` → locale-based (e.g., 15/01/2024) | 🟢 Low |

---

## Summary — High Priority Gaps To Fix Next

| ID | Item | Effort |
|----|------|--------|
| B-4 | Bill status change UI button | 30 min |
| B-7 | Company filter on Bills page | 15 min |
| G-4 | Company filter on Gatepasses page | 15 min |
| G-5 / C-2 | GP lookup auto-fill in Chalan form | 2 hrs |
| C-4 | Month/year filter on Chalans page | 15 min |
| R-6 | Company-wise reports page | 3 hrs |
| AU-1 | Admin user management UI | 2 hrs |
| AU-2 | Change password page | 1 hr |
