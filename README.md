# SBKT Loom Production & Efficiency Management System

Professional management platform for waterjet loom production, machine efficiency, fabric quality, yarn, beams, and factory analytics.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | HttpOnly cookie JWT (HS256) |
| Validation | Zod (server & client) |
| Testing | Vitest + Supertest |

### Authentication

- **JWT access tokens** stored in a `HttpOnly; SameSite=Lax/Strict` cookie — never in `localStorage`.
- Token lifetime is configured via `JWT_EXPIRES_IN` (default `15m`).
- Every authenticated request loads the user fresh from MongoDB so deactivated accounts are rejected immediately.
- Passwords hashed with bcrypt (12 rounds). Password hashes are never returned in any API response.

---

## User Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Full cross-factory access; manages factories and factory admins |
| `FACTORY_ADMIN` | Manages users within their own factory only |
| `MANAGER` | Authorised factory operations; cannot manage users |
| `OPERATOR` | Enters operational data; no user management |
| `VIEWER` | Read-only access to permitted data |

**Security rules enforced on the backend:**
- Public registration cannot choose a role.
- FACTORY_ADMIN cannot create SUPER_ADMIN accounts.
- Users cannot promote themselves.
- Factory data is isolated per factory.

---

## Environment Variables

### `server/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` / `production` / `test` |
| `PORT` | No | Backend port (default `5000`) |
| `CLIENT_URL` | Yes | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | ≥32 random chars for JWT signing |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `15m`) |
| `COOKIE_SECRET` | Yes | ≥32 random chars for cookie signing |
| `BOOTSTRAP_ENABLED` | No | `true` to enable one-time admin bootstrap (default `false`) |
| `BOOTSTRAP_SECRET` | When bootstrap enabled | ≥32 random chars, sent as `x-bootstrap-secret` header |

### `client/.env`

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base (default `http://localhost:5000/api/v1`) |

---

## Bootstrap — Creating the First Administrator

> Bootstrap is **disabled by default**. Enable it only once, then disable it immediately.

### Step 1 — Enable bootstrap

In `server/.env`:

```
BOOTSTRAP_ENABLED=true
BOOTSTRAP_SECRET=<your-strong-random-secret-min-32-chars>
```

Restart the server.

### Step 2 — Call the bootstrap endpoint

```bash
curl -X POST http://localhost:5000/api/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: <your-bootstrap-secret>" \
  -d '{
    "factoryName": "SBKT Factory",
    "factoryCode": "SBKT01",
    "adminName": "System Admin",
    "adminEmail": "admin@sbkt.com",
    "adminPassword": "YourStrongPassword123!"
  }'
```

### Step 3 — Disable bootstrap immediately

In `server/.env`:

```
BOOTSTRAP_ENABLED=false
```

Restart the server.

**Notes:**
- Bootstrap can only succeed once. Subsequent calls are rejected with 409.
- The secret is compared using a timing-safe comparison.
- When disabled, the endpoint returns 404 (same as any unknown route).

---

## User Creation Process

After bootstrap:
1. Log in as `SUPER_ADMIN`.
2. Use `POST /api/v1/users` to create `FACTORY_ADMIN` accounts.
3. `FACTORY_ADMIN` can then create users in their own factory.

Users cannot self-register. There is no public registration flow.

---

## API Endpoints (Phase 2)

### Authentication — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login; sets HttpOnly cookie |
| POST | `/auth/logout` | Public | Clears cookie |
| GET | `/auth/me` | Required | Current user profile |
| POST | `/auth/register` | SUPER_ADMIN / FACTORY_ADMIN | Create a user (OPERATOR role) |
| POST | `/auth/bootstrap` | Secret header | One-time admin setup |

### Users — `/api/v1/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | SUPER_ADMIN, FACTORY_ADMIN | List users (paginated) |
| GET | `/users/:id` | SUPER_ADMIN, FACTORY_ADMIN | Get user by ID |
| POST | `/users` | SUPER_ADMIN, FACTORY_ADMIN | Create user with role |
| PATCH | `/users/:id` | SUPER_ADMIN, FACTORY_ADMIN | Update name/email/factory |
| PATCH | `/users/:id/status` | SUPER_ADMIN, FACTORY_ADMIN | Activate / deactivate |

### Phase 1 — `/api/v1/health`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API health check |
| GET | `/health/db` | MongoDB connectivity check |

---

## Running Locally

### Prerequisites
- Node.js 18+
- MongoDB running on `127.0.0.1:27017`

### Start development servers

```bash
# From repo root — starts both frontend and backend concurrently
npm run dev

# Or individually:
npm run dev --workspace=server
npm run dev --workspace=client
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

---

## Seeding Dummy Data

To populate development factories and users across all 5 roles:

```bash
# From repo root
npm run seed

# Or directly in server/
npm run seed --workspace=server
```

### Pre-configured Accounts (Password: `Admin@123456789`)

| Role | Email | Password | Factory |
|------|-------|----------|---------|
| `SUPER_ADMIN` | `superadmin@sbkt.com` | `Admin@123456789` | SBKT Main Factory |
| `FACTORY_ADMIN` | `factoryadmin@sbkt.com` | `Admin@123456789` | SBKT Main Factory |
| `MANAGER` | `manager@sbkt.com` | `Admin@123456789` | SBKT Main Factory |
| `OPERATOR` | `operator@sbkt.com` | `Admin@123456789` | SBKT Main Factory |
| `VIEWER` | `viewer@sbkt.com` | `Admin@123456789` | SBKT Main Factory |

---

## Running Tests

```bash
# From repo root
npm run test --workspace=server

# With coverage
npm run test:coverage --workspace=server
```

> Tests use a dedicated database: `sbkt_loom_test`. All collections are cleaned between tests.  
> Never run tests against a production database.

---

## Security Notes

- Passwords are hashed with **bcrypt (12 rounds)**.
- JWT tokens are stored in **HttpOnly cookies** — not accessible to JavaScript.
- Login uses a **timing-safe password check** that does not reveal whether an email exists.
- CORS is restricted to the configured `CLIENT_URL`.
- Bootstrap uses **timing-safe secret comparison**.
- All passwords and tokens are excluded from logs.
- Rate limiting is applied to login (10 req/15 min), register (5 req/hr), and bootstrap (5 req/hr).

## Known Limitations

- No refresh token — when the 15-minute access token expires, the user is redirected to login.
- No email verification flow (Phase 2 scope does not include email sending).
- No password reset flow yet.
- MongoDB replica set is not required; bootstrap uses sequential checks instead of multi-document transactions.

---

## Phase 3 — Yarn Master Module

The **Yarn Master** module manages yarn specifications used across loom weaving, fabric master references, and beam warping.

### Backend Endpoints (`/api/v1/yarn`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/yarn` | All Authenticated | List yarns with pagination, search, yarnType, and isActive filter |
| `GET` | `/api/v1/yarn/:id` | All Authenticated | View single yarn details (factory-scoped) |
| `POST` | `/api/v1/yarn` | `SUPER_ADMIN`, `FACTORY_ADMIN` | Create new yarn specification |
| `PATCH` | `/api/v1/yarn/:id` | `SUPER_ADMIN`, `FACTORY_ADMIN` | Update yarn name, denier, type, rate, unit, description |
| `PATCH` | `/api/v1/yarn/:id/status` | `SUPER_ADMIN`, `FACTORY_ADMIN` | Soft activate / deactivate yarn record |

### Duplicate Prevention Rule
- A unique compound index enforces uniqueness under concurrent requests:
  `{ factoryId: 1, normalizedName: 1, denier: 1, yarnType: 1 }`
- Case and whitespace variations are normalized (`name.trim().toLowerCase()`).
- Attempted duplicates return **HTTP 409 Conflict**.

### Factory Isolation & Role Security
- **SUPER_ADMIN**: Reads and manages yarns across authorized factories.
- **FACTORY_ADMIN**: Reads and manages yarns strictly within their own factory.
- **MANAGER**: Read-only access to all yarns in their own factory.
- **OPERATOR & VIEWER**: Read-only access strictly to active yarns (`isActive: true`) in their factory.
- Cross-factory record access attempts return **HTTP 404** without leaking existence.
- Soft deactivation preserves historical production references (no physical deletion).

---

---

## Phase 4 — Fabric Master Module

The **Fabric Master** module manages fabric specifications used across waterjet loom weaving, production monitoring, quality control, and planning.

### Backend Endpoints (`/api/v1/fabrics`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/fabrics` | All Authenticated | List fabrics with pagination, search (code/name), and `isActive` filter |
| `GET` | `/api/v1/fabrics/:id` | All Authenticated | View single fabric details (factory-scoped) with populated warp/weft yarns |
| `POST` | `/api/v1/fabrics` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Create new fabric specification |
| `PATCH` | `/api/v1/fabrics/:id` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Update fabric parameters (PPI, panno, wastage %, RPM, description) |
| `PATCH` | `/api/v1/fabrics/:id/status` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Soft activate / deactivate fabric record |

### Specification Parameters & Validation
- **Code & Name**: Unique per factory (case & space normalized). Attempted duplicates return **HTTP 409 Conflict**.
- **Warp & Weft Yarns**: Enforced valid MongoDB ObjectIds referencing active yarns belonging to the current factory.
- **PPI**: Positive integer (picks per inch).
- **Panno**: Fabric panno specification (≥ 0, preserves decimal precision).
- **Wastage %**: Standard wastage allowance between 0% and 100%.
- **RPM**: Recommended loom speed in RPM (optional, positive integer).

### Factory Isolation & Role Security
- **Multi-Tenant Isolation**: Fabrics and yarn associations are strictly isolated per factory. Cross-factory access returns **HTTP 404 Not Found**.
- **Role Restrictions**: `OPERATOR` and `VIEWER` have read-only access strictly to active fabrics (`isActive: true`).

---

---

## Phase 5 — Beam Master Module

The **Beam Master** module manages warped beam inventory, fabric quality linkage, warp yarn assignments, length tracking, machine loading/unloading history, and low-meter alerts.

### Backend Endpoints (`/api/v1/beams`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/beams` | All Authenticated | List beams with pagination, search, status, lowMeters, fabric, yarn filters |
| `GET` | `/api/v1/beams/:id` | All Authenticated | View single beam details (factory-scoped) with populated fabric & yarn |
| `GET` | `/api/v1/beams/:id/history` | All Authenticated | View loading/unloading history records for a beam |
| `POST` | `/api/v1/beams` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Register new beam into Godown inventory |
| `PATCH` | `/api/v1/beams/:id` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Update beam specification fields |
| `PATCH` | `/api/v1/beams/:id/status` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Transition beam lifecycle status |
| `PATCH` | `/api/v1/beams/:id/active` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Soft activate / deactivate beam record |
| `POST` | `/api/v1/beams/:id/load` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER`, `OPERATOR` | Load beam onto loom machine and record history |
| `POST` | `/api/v1/beams/:id/unload` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER`, `OPERATOR` | Unload beam from machine, record consumed meters, and set outcome status |

### Status Lifecycle & Validation
- **Statuses**: `IN_GODOWN`, `LOADED`, `FINISHED`, `SHORTAGE`.
- **Transitions**:
  - `IN_GODOWN` $\rightarrow$ `LOADED` (when loaded onto loom)
  - `LOADED` $\rightarrow$ `IN_GODOWN` (unloaded back to storage without finishing)
  - `LOADED` $\rightarrow$ `FINISHED` (run completed, remaining meters $\rightarrow$ 0)
  - `LOADED` $\rightarrow$ `SHORTAGE` (cut early or shortage detected)
- **Meter Tracking**: `originalLengthMeters` (immutable production reference) and `remainingLengthMeters` ($\ge 0$, $\le \text{originalLengthMeters}$).
- **Low-Meter Alert**: Dynamically flagged whenever `remainingLengthMeters <= alertAtMeters` (default: 500m).
- **Beam Width vs Panno**: Beam `widthInches` is the physical beam width between flanges and is separate from Fabric `panno`.
- **Duplicate Protection**: Unique index on `{ factoryId: 1, normalizedBeamNumber: 1 }`.

---

## Phase 6 — Machine Management Module

The **Machine Management** module manages waterjet looms and weaving machines, operating RPM, PPI, assigned fabric qualities, beam loading/unloading integration, and selective batch editing.

### Backend Endpoints (`/api/v1/machines`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/machines` | All Authenticated | List machines with pagination, search, status, and fabric filters |
| `GET` | `/api/v1/machines/:id` | All Authenticated | View machine details with populated fabric and loaded beam info |
| `POST` | `/api/v1/machines` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Add a new loom machine |
| `PATCH` | `/api/v1/machines/:id` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Update machine specifications (RPM, PPI, name, fabric, notes) |
| `PATCH` | `/api/v1/machines/:id/status` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER`, `OPERATOR` | Update operational status (`RUNNING`, `STOPPED`, `MAINTENANCE`) |
| `PATCH` | `/api/v1/machines/:id/active` | `SUPER_ADMIN`, `FACTORY_ADMIN` | Soft toggle active/deactive status (prevents deactivation while beam is loaded) |
| `PATCH` / `POST` | `/api/v1/machines/batch` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER` | Batch update multiple machines selectively modifying only checked fields |
| `POST` | `/api/v1/machines/:id/load-beam` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER`, `OPERATOR` | Load an available godown beam onto machine, sync beam status, record history |
| `POST` | `/api/v1/machines/:id/unload-beam` | `SUPER_ADMIN`, `FACTORY_ADMIN`, `MANAGER`, `OPERATOR` | Unload beam, update ending meters, sync beam status, record history |

### Features & Security Rules
- **Operational Statuses**: `RUNNING` (Green), `STOPPED` (Neutral/Red), `MAINTENANCE` (Amber).
- **Maintenance Restrictions**: Machines under `MAINTENANCE` cannot receive new beam loads.
- **Deactivation Protection**: Machines with a currently loaded beam cannot be deactivated until the beam is unloaded.
- **Batch Editing**: Selective updates of Fabric Quality, RPM, PPI, and Notes without altering non-targeted parameters.
- **Efficiency Placeholder**: Displays clear placeholder `"No production data yet"` pending Phase 7 Production Sheets.
- **Duplicate Protection**: Unique compound index on `{ factoryId: 1, normalizedMachineNumber: 1 }`.
- **Factory Multi-Tenancy**: All operations strictly isolated per factory. Cross-factory lookups return HTTP 404.

---

## Phase Status

| Phase | Status |
|---|---|
| Phase 1 — Foundation | ✅ Complete |
| Phase 2 — Authentication & User Management | ✅ Complete |
| Phase 3 — Yarn Master Module | ✅ Complete |
| Phase 4 — Fabric Master Module | ✅ Complete |
| Phase 5 — Beam Master Module | ✅ Complete |
| Phase 6 — Machine Management Module | ✅ Complete |
| Phase 7 — Production Sheets | 🔜 Next |

