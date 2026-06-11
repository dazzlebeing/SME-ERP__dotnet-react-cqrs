# Running This Project Without Docker

Cloned this repo but don't have Docker (or don't want to use it)? No problem.
This guide gets the whole app running on your PC using just **.NET, Node, and the SQL
that already comes with Visual Studio**. Plain steps, no Docker anywhere.

> If you *do* have Docker, use [SETUP.md](./SETUP.md) instead — it's the one-command path.
> This file is the **Docker-free** alternative.

---

## First, what was Docker even doing?

In the normal setup, Docker runs just two things for us: a **SQL Server** database and a
**Redis** cache. The website (React) and the API (.NET) already run directly on your machine —
Docker never touched those. So to go Docker-free we only need to replace **the database**.

### What is Redis, and why you can ignore it

Redis is an in-memory cache — a fast place to temporarily hold data so the app doesn't ask the
database the same thing over and over. In this project it was wired in for *future* speed-ups and
is currently only touched by the `/health` status page — **no actual feature uses it**. So if
Redis isn't running, nothing breaks: login, bills, reports, everything works the same. **Just
ignore it.** The app runs smooth without it.

---

## The only change you need to make

You're swapping the Docker database for **SQL Server LocalDB**, which is already installed on
your PC if you have **Visual Studio 2022**. It's a small local database that needs zero setup.

**File:** `backend/src/Shree.API/appsettings.json`

Find the `DefaultConnection` line (near the top, under `ConnectionStrings`):

**Replace this** (points at the Docker database):
```json
"DefaultConnection": "Server=localhost,1434;Database=ShreeERP;User Id=sa;Password=ShreeErp@Str0ng!;TrustServerCertificate=True;",
```

**With this** (points at LocalDB on your PC):
```json
"DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=ShreeERP;Trusted_Connection=True;TrustServerCertificate=True;",
```

That's the whole change. On first run the app **creates the database, applies all migrations, and
adds the login users automatically** — same as it did in Docker.

> **Optional (only if you want the `/health` page fully green):**
> In `backend/src/Shree.API/Program.cs`, delete the small `.AddRedis( ... )` block inside
> `AddHealthChecks()`. Skip this if you don't care — the app works either way.

---

## What you need installed (no Docker)

| Tool | Why | Note |
|------|-----|------|
| **.NET 9 SDK** | runs the API | https://dotnet.microsoft.com/download/dotnet/9.0 |
| **Node.js 20+** | runs the website | https://nodejs.org |
| **SQL Server LocalDB** | the database | already included with Visual Studio 2022 |

No Docker. No SQL install. No Redis.

---

## How to run it

Open **two terminals**.

**Terminal 1 — the API (backend):**
```
cd backend
dotnet run --project src/Shree.API/Shree.API.csproj --urls "http://localhost:5050"
```
Wait until it prints `Now listening on: http://localhost:5050`.
*(In Visual Studio 2022 you can instead just pick the **http** profile and press Run — same result.)*

**Terminal 2 — the website (frontend):**
```
cd frontend
npm install        # first time only
npm run dev
```

Now open **http://localhost:3000** and log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | `shree@prodevelopers.in` | `keepsmiling` |

---

## How to stop it (cleanly, without breaking anything)

- **Website:** click the `npm run dev` terminal and press **Ctrl + C**.
- **API:** click its terminal and press **Ctrl + C** (or **Shift + F5** in Visual Studio).

Don't just close the terminal window mid-run — Ctrl + C lets it release the port properly.
Nothing gets deleted. Your `node_modules` and your LocalDB data stay exactly where they are.

---

## How to run it again next time (fast)

Once it's been set up once, daily startup is quick — **no re-install, no re-setup**:

1. **API:** `dotnet run --project src/Shree.API/Shree.API.csproj --urls "http://localhost:5050"`
   *(or press Run in Visual Studio)*
2. **Website:** `cd frontend` then `npm run dev` *(no `npm install` needed again)*
3. Open http://localhost:3000

LocalDB keeps your data between runs automatically, so it won't re-seed or wipe anything.

---

## The ports (so you know what's what)

| Part | Address |
|------|---------|
| Website | http://localhost:3000 |
| API | http://localhost:5050 |
| Health check | http://localhost:5050/health |
| Swagger (API docs) | http://localhost:5050/swagger |
| Database | LocalDB (`(localdb)\MSSQLLocalDB`) |

---

## Quick recap — what this project is

A full-stack **ERP for a manufacturing/job-work business**, rebuilt from an old PHP system into:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind
- **Backend:** ASP.NET Core 9 Web API — Clean Architecture, CQRS (MediatR), EF Core, JWT login + roles
- **Modules:** GST billing & invoices, gatepass → chalan → bill inventory flow, payments, expenses,
  vouchers, employees, salary, advances, and GST reports (GSTR-1/2/3B)
- **Extras:** debounced search + sortable tables on every list, PDF invoices, Excel report export,
  audit logging, and a spinning Shree logo on the login screen.

It runs three ways: **full Docker**, **Docker for the database only**, or — with this guide —
**no Docker at all**.

---

## Where this fits with the other docs

| Doc | Use it for |
|-----|-----------|
| **This file** | running **without Docker** (LocalDB) |
| [SETUP.md](./SETUP.md) | running **with Docker** + a guided code tour ("where to look first") |
| [README.md](./README.md) | project overview + full manual testing walkthrough |
