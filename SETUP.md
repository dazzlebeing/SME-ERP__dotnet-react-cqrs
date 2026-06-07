# Setup & Reviewer Guide — Shree ERP

> **Audience:** anyone cloning this repo for the first time (especially an interviewer/reviewer).
> This file gets you from `git clone` to a running app, then shows you **where to look first**
> and **where to change things**.

---

## 0. TL;DR — fastest path to a running app

You need **Docker Desktop** running and **Node.js 20+**. (You do *not* need the .NET SDK for this path — Docker builds the API.)

```bash
git clone https://gitlab.com/kumar_sandeep_group/Shree-project.git
cd Shree-project

# 1. Create your local env file from the template
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env

# 2. Bring up database + redis + API (all containerized)
docker compose up -d            # first run builds the API image (~2-4 min)

# 3. Wait until the API is healthy
#    (Windows PowerShell)  curl.exe http://localhost:5050/health
curl http://localhost:5050/health      # → Healthy

# 4. Start the frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** and log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | `shree@prodevelopers.in` | `keepsmiling` |
| Accountant | `admin@prodevelopers.in` | `keepsmiling` |

On first boot the API automatically **applies all EF Core migrations** and **seeds** the roles + the two users above. No manual DB step needed.

---

## 1. Prerequisites

| Tool | Version | Needed for | Check |
|------|---------|-----------|-------|
| **Docker Desktop** | latest | SQL Server, Redis, (and the API in Mode A) | `docker --version` |
| **Node.js** | 20+ | Frontend (Vite dev server) | `node --version` |
| **.NET SDK** | 9.0 | *Only* for Mode B (running the API without Docker) | `dotnet --version` |

- Docker Desktop: https://www.docker.com/products/docker-desktop
- Node.js: https://nodejs.org
- .NET 9 SDK: https://dotnet.microsoft.com/download/dotnet/9.0

---

## 2. Two ways to run

### Mode A — Everything in Docker (recommended for reviewers)

Best if you just want to see it work and may not have the .NET SDK installed.

```bash
cp .env.example .env
docker compose up -d          # db + redis + api
cd frontend && npm install && npm run dev
```

- API → http://localhost:5050 (container port 8080 mapped to host 5050)
- Frontend → http://localhost:3000
- Stop everything: `docker compose down` (add `-v` to also wipe the database volume)

### Mode B — Infra in Docker, API + frontend on the host (for active development)

Best if you want hot-reload on the backend and to step through C# in a debugger.

```bash
cp .env.example .env

# 1. Only the database + redis from compose
docker compose up -d shree-db shree-redis

# 2. API on the host (needs .NET 9 SDK)
cd backend
dotnet run --project src/Shree.API/Shree.API.csproj --urls "http://localhost:5050"

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

> **Why the difference?** In Mode A the API reads its DB connection from the
> `ConnectionStrings__DefaultConnection` env var in `docker-compose.yml` and talks to the
> `shree-db` container by name. In Mode B the API reads `appsettings.json` and talks to
> `localhost,1434` (the published port of the DB container). Both are pre-configured — you
> don't have to change anything to switch modes.

---

## 3. Where to look first (guided code tour)

If you have ~15 minutes to evaluate the codebase, read these in order. The architecture is
**Clean Architecture + Vertical-Slice CQRS** on the backend and a **feature-per-page** React app
on the frontend.

### Backend (`backend/src/`)

| # | Start here | Why |
|---|-----------|-----|
| 1 | `Shree.API/Program.cs` | Composition root — DI, JWT auth, CORS, rate limiting, health checks, the migrate-and-seed-on-startup block, and the middleware pipeline order. |
| 2 | `Shree.Application/Features/Auth/AuthFeatures.cs` | One file = the whole auth slice: DTOs + Login/Refresh/Logout/ChangePassword commands + their FluentValidation validators + MediatR handlers. This is the **vertical-slice pattern** — read one feature top to bottom. |
| 3 | `Shree.Infrastructure/Services/JwtTokenService.cs` | How a JWT is built (claims, HS256 signing, 15-min expiry) and how opaque refresh tokens are generated + stored. |
| 4 | `Shree.API/Controllers/AuthController.cs` | Thin controller — note `SetRefreshTokenCookie` (HttpOnly + Secure + SameSite=Strict) and that controllers only `_mediator.Send(...)`, never touch the DB. |
| 5 | `Shree.Application/Features/Bills/BillFeatures.cs` | The richest business slice — GST tax math (CGST/SGST vs IGST), particulars, bill totals. Mirror this pattern across every other feature folder. |
| 6 | `Shree.Infrastructure/Persistence/ShreeDbContext.cs` | EF Core model + the `SaveChangesAsync` override that auto-stamps audit columns and writes the `AuditLog` rows. |
| 7 | `Shree.Infrastructure/Persistence/DatabaseSeeder.cs` | Roles + default users seeded on startup. |
| 8 | `Shree.API/Middleware/GlobalExceptionMiddleware.cs` | Centralized exception → RFC 7807 ProblemDetails mapping (validation → 422, not-found → 404, etc.). |

### Frontend (`frontend/src/`)

| # | Start here | Why |
|---|-----------|-----|
| 1 | `lib/api.ts` | Axios instance + the request interceptor (attach Bearer token) and the **401 → silent refresh → retry** response interceptor. |
| 2 | `store/authStore.ts` | Zustand auth store: `login`, `logout`, `loadUser`, `hasRole`, `isAdmin`, `canWrite`. |
| 3 | `App.tsx` | Route table + `RequireAuth` / `RequireAdmin` route guards. |
| 4 | `hooks/useCrud.ts` | The shared `usePaginatedList` / `useDelete` / `useSave` hooks (debounced search + sorting) reused by every manage page. |
| 5 | `pages/BillsPage.tsx` | A representative full CRUD page: list + filters + create/edit modal + PDF download. |
| 6 | `components/layout/` | `AppLayout` + `Sidebar` + `TopBar` (the logout/change-password menus live here). |
| 7 | `components/ui/index.tsx` | Design-system primitives: `Button`, `Modal`, `Table`, `SortableTh`, `SearchBox`, `ConfirmDialog`. |

For a complete feature inventory and how it maps to the legacy PHP app, see:
- `docs/old-project-page-inventory.md` — every page/endpoint in the original PHP system
- `docs/missing-features-audit.md` — what's done, what's pending, and why
- `docs/master-plan.md` — the original architecture plan

---

## 4. Where to change common things

| You want to change… | Edit this | Notes |
|---------------------|-----------|-------|
| **DB password / ports / JWT secret** (Docker run) | `.env` | Copied from `.env.example`. Used by `docker-compose.yml`. |
| **DB connection / JWT (local `dotnet run`)** | `backend/src/Shree.API/appsettings.json` | Used in Mode B. In real deployments use `dotnet user-secrets` or a vault instead of committing these. |
| **Default seeded users / roles** | `backend/src/Shree.Infrastructure/Persistence/DatabaseSeeder.cs` | Re-seeds on startup if the user doesn't exist. |
| **GST tax rates / company header / bank details** | `appsettings.json` → `Tax` and `Company` sections | Used by bill calculations and the PDF invoice. |
| **Allowed frontend origins (CORS)** | `appsettings.json` → `Cors:Origins` *and* `docker-compose.yml` | Defaults to `localhost:3000` + `localhost:5173`. |
| **API port** | `--urls` flag (Mode B) or the `ports:` mapping in `docker-compose.yml` (Mode A) | Frontend proxy target is set in `frontend/vite.config.ts`. |
| **Frontend → API proxy target** | `frontend/vite.config.ts` → `server.proxy['/api'].target` | Defaults to `http://localhost:5050`. |
| **Rate limits** | `appsettings.json` → `IpRateLimiting` | Defaults: 10 req/s, 300 req/min per IP. |

---

## 5. Verify it works (90-second smoke test)

```bash
# 1. API is up
curl http://localhost:5050/health                 # → Healthy

# 2. Login returns a JWT
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"shree@prodevelopers.in","password":"keepsmiling"}'
# → { "accessToken": "eyJ...", "expiresIn": 900, "tokenType": "Bearer" }
```

Then in the browser at http://localhost:3000: log in → create a Company → create a Gatepass →
create a Bill → download its PDF. That exercises the full Gatepass → Bill → PDF flow.
The step-by-step version is in the main [README](./README.md#manual-testing-guide).

Swagger / OpenAPI UI: **http://localhost:5050/swagger**

---

## 6. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `docker compose up` warns about missing variables | You skipped `cp .env.example .env`. Create the `.env` first. |
| API container restarts / can't reach DB | SQL Server takes ~30s to become healthy on first boot. `docker compose logs shree-db` and wait for the healthcheck, then `docker compose restart shree-api`. |
| Login page shows "Cannot connect to server" | The API isn't running on port 5050. Check `curl http://localhost:5050/health` and the API logs. |
| Login fails with "Invalid credentials" but creds are right | Confirm the seed ran — look for "Database seeded" in the API logs. In Mode B, the DB container must be up *before* you `dotnet run`. |
| Port `5050` / `1434` / `6380` / `3000` already in use | Change the port in `.env` (DB/Redis), the `--urls` flag or compose `ports:` (API), or stop the other process. Update `frontend/vite.config.ts` if you move the API port. |
| Frontend "Network Error" | The Vite proxy (`/api` → `localhost:5050`) can't reach the API. Make sure the API is running and on 5050. |
| Want a clean database | `docker compose down -v` removes the volumes, then `docker compose up -d` re-seeds from scratch. |

---

## 7. Project layout

```
Shree-project/
├── backend/
│   ├── Dockerfile
│   ├── Shree.sln
│   └── src/
│       ├── Shree.API/            # Controllers, middleware, Program.cs  ← entry point
│       ├── Shree.Application/    # CQRS commands/queries (MediatR), validators, DTOs
│       ├── Shree.Domain/         # Entities, enums (no external dependencies)
│       └── Shree.Infrastructure/ # EF Core, Identity, JWT, PDF, Excel
├── frontend/
│   └── src/
│       ├── pages/                # One component per screen
│       ├── components/           # layout + ui primitives
│       ├── hooks/                # useCrud (shared list/save/delete)
│       ├── store/                # Zustand auth store
│       └── lib/                  # axios instance, formatters
├── docs/                         # architecture plan, feature audit, page inventory
├── docker-compose.yml
├── .env.example                  # copy to .env
├── README.md                     # overview + manual testing guide
└── SETUP.md                      # this file
```
