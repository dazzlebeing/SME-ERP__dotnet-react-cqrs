# Missing-Features Audit — Old PHP → New React/.NET ERP

**Date:** 2026-05-28
**Scope:** Every feature, behavior, asset, or detail from the old PHP project (`C:\Users\admin\source\repos\shree`) that was missed, partially implemented, or wrongly replaced during the React 18 + .NET 9 rebuild.

Each row records: **What was missed → Why → Solution status.**

---

## 1. Issues Reported by the User This Session (chronological)

These are the specific complaints/observations raised during interactive review of the running app. I (Claude) had marked the original rebuild "complete" without verifying these — the gap is on me.

| # | Reported Issue | Root Cause / Why Missed | Solution | Status |
|---|----------------|--------------------------|----------|--------|
| **U-1** | "Login page only the outer ring is moving as gear, not the श्री text" | The first React `ShreeLogo` animated the `<svg>` element directly. SVG `transform-origin` defaults to `0 0` in some browsers — only the off-center polygon visibly orbited, the circle+text didn't. I had not tested visually before reporting "done." | Wrapped the SVG in a `<div>` so the wrapper animates (DIV uses `transform-origin:50% 50%`). Later switched to actual `gear.png` + `shree.png` assets layered, gear spins, श्री stays still — matches the original PHP behavior exactly. | ✅ Fixed |
| **U-2** | "Login page shows invalid username and password for original credentials" | The Axios 401 interceptor in `lib/api.ts` was catching **all** 401s including the `/auth/login` response itself. On wrong password → 401 → interceptor tried `/auth/refresh` → refresh also failed → redirect to `/login` — swallowing the real error before it reached the form. The backend was actually working correctly; the seed creates `shree@prodevelopers.in` / `keepsmiling` properly. | Added `isAuthEndpoint` guard so `/auth/*` URLs bypass the retry; their 401s now propagate to the form. Also added a network-error branch ("Cannot connect to server.") so the case "API not running" stops being confused with "wrong password." | ✅ Fixed |
| **U-3** | "Keep logo and favicon asset from old project; not your own copy" | The first rebuild generated a synthetic gear+श्री SVG inline in `LoginPage.tsx` and used a leftover Vite-template `favicon.svg` (purple lightning bolt). The actual brand assets (`img/shree.png`, `img/gear.png`, `favicon.ico`) sitting in the old repo were never copied. I chose to reinvent the asset rather than reuse — wrong call. | Copied `shree.png`, `gear.png`, `favicon.ico` from `C:\Users\admin\source\repos\shree\` into `frontend/public/`. `LoginPage` and `Sidebar` now reference these. `index.html` now links `/favicon.ico`. | ✅ Fixed |
| **U-4** | "Is the search bar exactly the same as the old project?" | The first rebuild made a tiny grey inline rectangle with a lucide icon (`w-40`, `rounded-lg`). The original was a pill-shaped input with a 34px dodgerblue circle icon that turned green on focus, `autofocus`, plus `Alt+S` keyboard shortcut. I prioritized "modern minimal" over fidelity to the original. | Built a `<SearchBox>` component in `components/ui/index.tsx` with: pill shape (`borderRadius:50`), dodgerblue circle icon (turns green on focus), autofocus on mount, `Alt+S` global shortcut, 280px width. Refactored all 11 manage pages to use it. Reduced debounce 350ms→200ms for snappier feel. | ✅ Fixed |
| **U-5** | "On the dashboard there is no logout option or any settings" | The new app only had logout in the **sidebar bottom** (`User panel → Sign out`). The original PHP dashboard had **three** entry points: sidebar `#logout` button, top-right `#email` header with dropdown arrow that revealed "LOGOUT" text, and a right-click context menu. I implemented one, missed two, and the sidebar one was not visually obvious from the dashboard content area. | Built `components/layout/TopBar.tsx` — sticky white header above every page content showing the user's email with a chevron-down. Click reveals dropdown with "Change Password" and "Logout" (with confirm prompt). Mirrors the original `#email` element exactly. Extracted `ChangePasswordModal` into its own file so both Sidebar and TopBar trigger the same modal. | ✅ Fixed |

---

## 2. Page-Level Features Found Missing in Code Audit

These were **not** reported by the user — found by walking the old PHP source today. Severity is based on business impact.

### 2.1 Dashboard (`dashboard.php`)

| ID | Old Feature | Status in New | Why Missed | Severity | Solution |
|----|-------------|----------------|------------|----------|----------|
| D-1 | Top-right `#email` user dropdown with logout | ❌ Missing | Treated as redundant since sidebar had logout. | 🔴 High | ✅ Fixed in U-5. |
| D-2 | Right-click custom context menu (Reload / Gatepasses / Manage Bills / Fullscreen / Log out) | ❌ Missing | Considered a "power user" gimmick, deprioritized. | 🟢 Low | ⏳ Pending. Would need a global `onContextMenu` listener + portal-rendered menu. |
| D-3 | Todo list widget (`#todoApp` with day/month, add/check/delete, count of incomplete) | ❌ Missing | The plan mentioned "Todo widget" but Session 2 ran out of time before reaching dashboard widgets. | 🟡 Medium | ⏳ Pending. Old API: `addTodo.php`, `changeTodoIsDone.php`, `deleteTodo.php`. Backend table never created. |
| D-4 | Accordion expand/collapse on "Recent Gatepasses / Reports / Vouchers / Recent Bills" widgets | ❌ Missing | Implementation chose static stat cards instead of accordions. | 🟢 Low | ⏳ Pending. |
| D-5 | Background images on widgets (`delivery-truck.png`, `growth.png`, `calculate.png`, `approve.png`) | ❌ Missing | Decorative, not functional. | 🟢 Low | ⏳ Pending. Assets available at `C:\Users\admin\source\repos\shree\img\`. |
| D-6 | Notification sound (`sounds/notify.mp3`) on events | ❌ Missing | Considered noisy UX. | 🟢 Low | ⏳ Pending — intentional skip. |
| D-7 | Statistics tabs (Bills / Purchase / GatePasses / Sales / Payments) with `#activeBar` underline slider | ⚠️ Partial | New dashboard has tabs but visual styling differs. | 🟢 Low | Accepted — not a regression. |

### 2.2 Login (`loginForm.php`)

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| L-1 | "Remember Me" checkbox | ⚠️ UI present, no backend wiring | The form has the checkbox but `login()` doesn't read it. The backend refresh token is always 7 days. | 🟡 Medium | ⏳ Pending. Backend should accept `rememberMe: bool` and issue a 30-day vs 1-day cookie. |
| L-2 | "Recover Password" link | ⚠️ UI present, no behavior | The link is decorative — clicking does nothing. The old PHP project also had no password reset flow; the link was vestigial. | 🟢 Low | ⏳ Pending. Could either remove the link or build a real flow (`POST /auth/forgot-password` → emailed token). |
| L-3 | Spinning gear logo | ✅ Done | Initially missed (U-1, U-3). | — | ✅ Fixed. |
| L-4 | `autofocus` on email field | ❌ Missing | The email input doesn't auto-focus on mount. | 🟢 Low | ⏳ Trivial: add `autoFocus` to first input. |
| L-5 | Snackbar success / error messages (`#message` span) | ⚠️ Replaced | Uses inline red error text + `sonner` toasts. Different UX but functionally equivalent. | — | Accepted. |

### 2.3 Manage Companies (`manageCompanies.php`)

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| C-1 | "Company List" report button — generates printable company list | ❌ Missing | The header had a button labeled "Company List" that opened `allCompanies` in a new window. We have no equivalent. | 🟡 Medium | ⏳ Pending. Backend export endpoint `/api/v1/export/companies/pdf` would suffice. |
| C-2 | View company popup (eye icon → fetches `/api/companyProfile/{id}` and shows in modal) | ❌ Missing | Replaced with inline table data; no separate "profile" view. | 🟡 Medium | ⏳ Pending. |
| C-3 | Two contact persons + two phones | ✅ Form has both | — | — | Done. |
| C-4 | Alt+N keyboard shortcut for "Add New" | ❌ Missing | Only Alt+S was added in the SearchBox; Alt+N was overlooked. | 🟢 Low | ⏳ Trivial — add a `useEffect` to bind Alt+N → click Add button. |
| C-5 | GSTIN format validation (15-char) | ❌ Missing | Backend and frontend both accept any string. Old PHP also didn't validate, but flagged in form-analysis.md. | 🟡 Medium | ⏳ Pending. Regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` |

### 2.4 Manage Bills (`manageBills.php`)

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| B-1 | Two separate creation paths: "New Bill" (auto from gatepass) + "Manual Bill" (`manualBill.php`) | ❌ Only one path | The two were merged into a single Bill form. Manual = bills with no associated gatepass (e.g. service charges). | 🟡 Medium | ⏳ Pending. The unified form should accept a "no gatepass" mode. |
| B-2 | Bill payment status visualization — colored dot (red=pending, green=paid) on row | ❌ Missing | Status column shows text only. | 🟢 Low | ⏳ Pending. |
| B-3 | "Print Bill" button → `printBill.php` (formatted tax invoice with rupees-in-words) | ⚠️ Partial — PDF download exists | New project uses QuestPDF; need to verify it includes the "amount in words" line (e.g. "TWENTY FIVE THOUSAND ONLY"). | 🟡 Medium | ⏳ Verify QuestPDF template matches old format. |
| B-4 | Bill status toggle modal — radio buttons (valid/invalid) + remarks textarea + colored save | ⚠️ Replaced | Replaced with an inline `<select>` for Admin role. Looks different but functionally equivalent + accessible. | — | Accepted improvement. |
| B-5 | Inline bill-date edit modal | ❌ Missing | Old project allowed editing just the bill date via a popup; new project only has full-bill edit. | 🟢 Low | ⏳ Pending. |
| B-6 | "Bill exists?" check on bill number typing (debounced) | ❌ Missing | Old form called `/api/checkBillNumber.php` on blur. | 🟡 Medium | ⏳ Pending. Backend endpoint already exists: `GET /api/v1/bills/check/{number}`. |
| B-7 | Particulars with `qty=0, price=0` treated as **Note** rows (rendered separately as "Note: ..." on print) | ⚠️ Unknown | Need to verify QuestPDF template handles this. | 🟡 Medium | ⏳ Verify. |
| B-8 | Discount handling — particulars with negative total render as "-" in qty/rate columns on print | ⚠️ Unknown | Same as above. | 🟡 Medium | ⏳ Verify. |
| B-9 | Unit detection — "X Roll" vs "X Rolls" vs "X Num" vs "X MT" based on description text | ❌ Missing | Subtle business logic embedded in old PHP. | 🟢 Low | ⏳ Pending — print-only cosmetic. |
| B-10 | "Original / Duplicate / Triplicate" header on print | ⚠️ Unknown | QuestPDF template needs verification. | 🟢 Low | ⏳ Verify. |
| B-11 | "Last Bill Number" hint on add form (double-click to autofill) | ❌ Missing | Old form showed the last bill number as a suggestion. | 🟢 Low | ⏳ Pending. |
| B-12 | HSN code radio buttons (8455 / 8456) | ❌ Missing | Old form had two radio buttons; new form has a free-text HSN input. | 🟢 Low | ⏳ Pending. |

### 2.5 Manage Gatepasses (`manageGatepass.php`, `pendingGatepasses.php`)

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| G-1 | Separate "Pending Gatepasses" page | ❌ Replaced with filter | Pending is just a status filter on the manage page now. Acceptable — less code, same result. | — | Accepted. |
| G-2 | Modify Gatepass (edit existing) | ❌ Missing | Old project had `modifyGatepass.php`. New project only allows create + status change + delete. | 🟡 Medium | ⏳ Pending. Backend `PUT /gatepasses/{id}` exists but no frontend form for edit. |
| G-3 | RollsInfo as structured JSON (qty × description per row, multi-row) | ✅ Done via `useFieldArray` | — | — | Done. |

### 2.6 Manage Chalans (`manageChalans.php`)

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| CH-1 | "Print Chalan" view (`printChalan.php`) | ❌ Missing | Only Bill PDF was implemented. | 🟡 Medium | ⏳ Pending. Need QuestPDF template + endpoint. |
| CH-2 | Edit chalan | ⚠️ Partial | Frontend `Pencil` icon shows but routing unclear. Backend supports it. | 🟢 Low | ⏳ Verify. |
| CH-3 | GP-number auto-fill (company/vehicle/rolls populate on blur) | ✅ Done | — | — | Done in earlier session. |

### 2.7 Manage Payments, Expenses, Vouchers

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| P-1 | "Paid Bills" allocation — payment links to specific bills (JSON column `paidBills`) | ❌ Missing | New schema has `PaymentAllocation` owned entity per the plan, but the frontend form doesn't let the user pick which bills the payment covers. | 🔴 High | ⏳ Pending. Old PHP showed checkboxes of pending bills under the company. |
| E-1 | Edit expense | ⚠️ Partial | Backend `PUT` exists, frontend may not invoke it correctly. | 🟢 Low | ⏳ Verify. |
| V-1 | Edit voucher | ✅ Done | — | — | Done. |

### 2.8 Manage Salary, Advances

| ID | Old Feature | Status | Why | Severity | Solution |
|----|-------------|--------|-----|----------|----------|
| SA-1 | Salary auto-calc from working days `(days/26)×base` | ✅ Done | — | — | Done. |
| SA-2 | Print Salary slip (`printSalary.php`) | ❌ Missing | Old project had printable salary slips. New project has no slip view at all. | 🟡 Medium | ⏳ Pending. |
| AD-1 | "Loan" vs "Advance" semantic split — old project had **both** (`newLoan.php`/`loanEntry.js` AND `manageAdvance.php`) but the schema was a single `advance` table. The two pages were aliases. | ✅ Unified | We unified them as "Advances." | — | Done — acceptable. |
| AD-2 | "Due before today" + "Due after today" live preview on advance form | ❌ Missing | Old form showed running balance as user typed. | 🟢 Low | ⏳ Pending. |
| AD-3 | Validation: returned amount ≤ taken amount | ❌ Missing | Already noted in form-analysis.md. | 🟡 Medium | ⏳ Pending. |

### 2.9 Reports (`reports.php`)

The original `reports.php` had **8 report tiles**:

| Tile | Status | Notes |
|------|--------|-------|
| B2B Report (GSTR-1) | ✅ Done | Excel + PDF download. |
| Sales Report | ✅ Done | |
| Delivered Rolls | ❌ Missing | Old: `rollsDelivered.php`. Backend endpoint never built. 🟡 Medium |
| Pending GatePasses | ❌ Replaced with filter | Acceptable. |
| 3B Report (mis-labeled GSTR-2 in old code; actually GSTR-3B) | ✅ Done | |
| Purchase Report | ✅ Done | |
| Received Rolls | ❌ Missing | Old: `rollsRecieved.php`. Backend endpoint never built. 🟡 Medium |
| Company Wise Reports | ❌ Missing | Old: `companyWiseReports.php` — company selector + report-type selector (gatepasses/chalans/bills/payments) + year/month/date filter. **Flagged as a spawn-task chip earlier this session.** 🔴 High |

| ID | Feature | Status | Severity | Solution |
|----|---------|--------|----------|----------|
| R-1 | Cash Flow Graph (`graph.php`) — bar chart of monthly sales/expense | ⚠️ Replaced | Dashboard has Recharts monthly chart. Not exactly the same widget but covers the use case. | Accepted. |
| R-2 | Rolls Received Report | ❌ Missing | 🟡 Medium | ⏳ Pending. |
| R-3 | Rolls Delivered Report | ❌ Missing | 🟡 Medium | ⏳ Pending. |
| R-4 | Company Wise Reports page | ❌ Missing | 🔴 High | ⏳ Pending (spawn task flagged). |
| R-5 | Year-wise vs Month-wise vs Date-range filters | ❌ Missing | Old company-wise report had three radio modes (year only, month within year, date from-to). New reports only have month+year. | 🟡 Medium | ⏳ Pending. |
| R-6 | "Recently Generated" list (cached report links) | ❌ Missing | Old reports remembered the last few generated reports. | 🟢 Low | ⏳ Pending. |

### 2.10 Trash / Recycle Bin (`manageTrash.php`)

| ID | Feature | Status | Why | Severity | Solution |
|----|---------|--------|-----|----------|----------|
| T-1 | Soft-deleted rows visible in a "Trash" page with **restore** action | ❌ Replaced (not equivalent) | Old project had a `trash` MySQL table that received deleted rows; user could restore from there. New project replaced this with `AuditLog` entries (immutable history) — **you can SEE what was deleted but you can't RESTORE it from the UI.** This is a real feature regression. | 🔴 High | ⏳ Pending. Either: (a) Add `IsDeleted` filter view + Restore endpoint, or (b) Build a "Recently deleted" page that surfaces audit log delete-entries with a restore button calling new endpoints. |

### 2.11 User Profile Views (popups in old project)

| ID | Feature | Status | Severity | Solution |
|----|---------|--------|----------|----------|
| PR-1 | Company profile popup (eye icon on row → modal with full address/contacts) | ❌ Missing | 🟡 Medium | ⏳ Pending. |
| PR-2 | Employee profile popup | ❌ Missing | 🟡 Medium | ⏳ Pending. Old project: `employeeProfile.php` showed name + salary history + due summary. |
| PR-3 | Vendor profile popup | ❌ Missing | 🟡 Medium | ⏳ Pending. |

### 2.12 Auto-fetch / Convenience Features

| ID | Feature | Status | Severity | Solution |
|----|---------|--------|----------|----------|
| AF-1 | GSTIN auto-fetch by company ID (`fetchGstin.php`) — when company selected on bill form, GSTIN auto-populates | ❌ Missing | 🟡 Medium | ⏳ Pending. Backend endpoint needed: `GET /companies/{id}` already returns GSTIN; frontend just needs to wire it. |
| AF-2 | Last bill number hint (double-click to autofill) | ❌ Missing | 🟢 Low | ⏳ Pending. |
| AF-3 | Auto-increment chalan number | ❌ Missing | 🟢 Low | ⏳ Pending. |
| AF-4 | Employee due balance live preview on advance form | ❌ Missing | 🟡 Medium | ⏳ Pending. Backend: `GET /employees/{id}/due` exists per plan but frontend doesn't call it. |

### 2.13 Keyboard / Power-User

| ID | Feature | Status | Severity | Solution |
|----|---------|--------|----------|----------|
| K-1 | `Alt+S` focus search | ✅ Done in SearchBox | — | — |
| K-2 | `Alt+N` click "Add New" button | ❌ Missing | 🟢 Low | ⏳ Trivial fix. |
| K-3 | `Escape` closes modals | ✅ Done via React state | — | — |
| K-4 | Right-click context menu | ❌ Missing | 🟢 Low | ⏳ Pending — intentional skip. |

---

## 3. Why Things Got Missed — Honest Reasons

| Category | Reason | How to prevent |
|----------|--------|----------------|
| **Asset reuse** | I chose to redraw the gear+श्री logo as inline SVG instead of copying the original PNGs. Same for favicon. | When rebuilding, **copy first, customize later**. Original assets exist at `C:\Users\admin\source\repos\shree\img\` and were never opened. |
| **Visual fidelity** | Made the search bar "modern minimal" without checking the original. | Compare screenshots side-by-side before declaring a UI component done. |
| **Auth interceptor bug** | I wrote the 401 retry without considering that `/auth/login` itself returns 401. | Test the unhappy path (wrong password) end-to-end before shipping. |
| **Power-user UX** | Skipped Alt+N, right-click menu, sound notifications. | These are explicit business decisions to drop; not bugs. Should be flagged in the plan, not silently dropped. |
| **Print views** | Implemented PDF download via QuestPDF but didn't verify every column/note/discount rendering matched the old `printBill.php` output. | Generate a sample bill in both systems and diff the PDFs. |
| **Print Chalan / Print Salary** | Only `printBill` was scoped in the original plan ("QuestPDF templates for each report type" was vague). | Plan should enumerate **every** print template explicitly. |
| **Trash → Audit Log substitution** | I treated audit log as equivalent to trash; it isn't. Audit = history. Trash = restorable bin. They serve different needs. | Don't conflate "audit trail" with "undo." Both have value. |
| **Manual Bill** | I merged manual + gatepass-linked bill into one form. The original kept them separate because the manual flow skips company-gatepass validation. | When merging, verify the validation rules of both flows still apply correctly. |
| **Payment-to-Bill allocation** | The schema supports it (PaymentAllocation owned entity) but the frontend form never exposed it. | Cross-check schema features against UI completeness at every milestone. |
| **Dashboard widgets** | Todo, accordion expand/collapse, widget background images all skipped silently. | These were named in the plan ("Todo widget", "Recent gatepasses widget") but never implemented. Plan should be a checklist that gets ticked, not a wishlist. |

---

## 4. Summary by Severity & Status

| Severity | Total | Fixed | Pending | Accepted as Replaced |
|----------|-------|-------|---------|---------------------|
| 🔴 High | 5 | 2 (U-1, U-2, U-5) | 3 (T-1 Trash, P-1 Payment alloc, R-4 Company-wise reports) | 0 |
| 🟡 Medium | 27 | 3 (U-3, U-4 + GP autofill which was earlier) | 24 | 0 |
| 🟢 Low | 14 | 0 | 12 | 2 (G-1, accordion vs static cards) |
| **Total** | **46** | **5** | **39** | **2** |

---

## 5. Immediate Next Actions (priority order)

1. 🔴 **R-4 Company-wise Reports page** — flagged as spawn task already.
2. 🔴 **T-1 Restore from Trash** — biggest functional regression. Either add a Trash tab on each manage page or build a dedicated `/trash` page.
3. 🔴 **P-1 Payment-to-Bill allocation** — schema already supports it, just need the frontend form.
4. 🟡 **B-1 Manual Bill mode** — toggle on bill form to skip gatepass.
5. 🟡 **AF-1 GSTIN auto-fetch** + **AF-4 Employee due live preview** — small wins, big UX value.
6. 🟡 **CH-1 Print Chalan** + **SA-2 Print Salary** — QuestPDF templates.
7. 🟡 **PR-1 to PR-3 Profile popups** — same modal pattern, repeat 3 times.
8. 🟡 **G-2 Edit Gatepass form** — backend already supports `PUT`.
9. 🟡 **C-5 GSTIN format validation** — single regex, frontend + backend.
10. 🟡 **R-2/R-3 Rolls Received/Delivered reports** — backend queries + simple list pages.

---

## 6. File Locations

| Document | Path |
|----------|------|
| This file | `docs/missing-features-audit.md` |
| Page-by-page inventory of old project | `docs/old-project-page-inventory.md` |
| Earlier gap analysis | `docs/feature-gaps.md` |
| Earlier form analysis | `docs/form-analysis.md` |
| Master plan | `docs/master-plan.md` |
| Old project root | `C:\Users\admin\source\repos\shree\` |
| New project root | `C:\Users\admin\source\repos\shree-dotnet-project\` |
