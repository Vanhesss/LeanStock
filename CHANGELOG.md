# Changelog

## [3.0.0] — Final Defense

### Added — Supplier & Purchase Order Module
- Full supplier CRUD: `GET/POST /suppliers`, `GET/PATCH /suppliers/:id`
- Complete PO workflow with state machine: DRAFT → SUBMITTED → CONFIRMED → SHIPPED → RECEIVED
- PO endpoints: `GET/POST /purchase-orders`, `GET /purchase-orders/:id`, submit/confirm/ship/receive/cancel
- PO receive atomically updates inventory using Serializable transaction isolation
- Prisma migration: `add_suppliers_and_purchase_orders` (Supplier, PurchaseOrder, PurchaseOrderItem models)

### Added — Forecasting & Predictive Reorder
- `GET /forecasting/reorder` — Moving average-based reorder suggestions with configurable window, lead time, and safety stock multiplier. Returns urgency levels (CRITICAL/HIGH/MEDIUM).
- `GET /forecasting/velocity` — Sales velocity analysis with weekly buckets and linear regression trend (INCREASING/STABLE/DECREASING).
- `POST /forecasting/low-stock-alerts` — Scans inventory for low-stock items and sends alert emails to all active managers.

### Added — New Email Templates
- **Low-stock alert email** — Tabular alert sent to managers listing items below threshold
- **Purchase order confirmation email** — Sent when PO is confirmed by supplier
- **Transfer received email** — Sent when a transfer is completed at destination

### Fixed
- CORS wildcard `"*"` in production docker-compose.yml replaced with configurable `CORS_ORIGIN` env var
- Gmail refresh token env var mismatch (`GMAIL_RFTK` → `GMAIL_RT`) in docker-compose.yml
- 2 failing auth verification tests: verify-email schema mismatch and unverified login status code

### Added — Deliverable Files
- `CHECKLIST.txt` — Self-verification checklist
- `DEPLOYED_URL.txt` — Production URL
- `VIDEO_LINK.txt` — Defense video link

### Tests
- 20 test suites, 210 tests, all passing
- New unit tests: suppliers validation, purchase order validation & status transitions, forecasting calculations (SMA, regression, urgency)

---

## [2.1.0] — Sprint 2 (Endterm)

### Removed
- **All raw SQL queries** (`$queryRaw`) replaced with pure Prisma ORM queries. Concurrency-safe operations now use `isolationLevel: 'Serializable'` instead of `SELECT FOR UPDATE` raw SQL.

### Added — BullMQ Background Workers
- **Redis-backed job queues** via BullMQ for all async processing
- **Email Worker** — all email sending routed through BullMQ queue (API never blocks on SMTP)
- **Dead Stock Decay Worker** — processes decay jobs from queue
- **Reservation Expiry Worker** — processes expiry jobs from queue
- **Cron Scheduling** — `node-cron` enqueues jobs into BullMQ queues on schedule:
  - Dead stock decay: every 6 hours (`0 */6 * * *`)
  - Reservation expiry: every hour (`0 * * * *`)
- **Queue Visibility** — `GET /admin/queues` returns completed/failed/waiting/active/delayed counts per queue
- **Manual Job Triggers** — `POST /admin/jobs/dead-stock-decay` and `POST /admin/jobs/reservation-expiry` for admin testing

### Added — Admin Module
- `GET /admin/users` — List users with role/active filters + cursor pagination
- `GET /admin/locations` — List locations with type filter + cursor pagination
- `POST /admin/locations` — Create new location (STORE or WAREHOUSE)
- `GET /admin/brands` — List brands + cursor pagination
- `POST /admin/brands` — Create new brand
- `GET /admin/audit-logs` — List audit logs with entity/action/user filters + cursor pagination
- `GET /admin/price-history` — List price history with variant filter + cursor pagination
- All admin endpoints require ADMIN role

### Updated — API Documentation
- OpenAPI spec updated to v2.1.0 with all 28 endpoints documented
- Realistic request/response examples with Kazakh locale data (not placeholder "string" values)
- Standardized error responses (400, 401, 403, 404, 409, 422, 500) on every endpoint
- Cursor-based pagination documented on all list endpoints

### Updated — Testing
- Added unit tests: transfer state machine, inventory adjustment, queue logic, admin role hierarchy
- Total: 116 unit tests across 10 test suites (all passing)
- Integration tests: 7 test suites covering full auth flow, products, inventory, transfers, sales, reservations

### Deviations from openapi.yaml
- `SELECT FOR UPDATE` raw queries replaced with Prisma ORM + `Serializable` isolation level — provides equivalent concurrency guarantees without raw SQL. See ARCHITECTURE.md for justification.
- Email sending changed from fire-and-forget to BullMQ queue — all emails now observable via `/admin/queues` endpoint.

---

## [0.1.0] — Sprint 1 (Backend Implementation)

### Added
- Project infrastructure: Docker Compose (app + PostgreSQL 16 + Redis 7), Dockerfile, env validation via Zod
- Prisma schema matching blueprint database-schema.docx with all 12 models and 6 enums
- Database seed script with 3 users, 4 locations, 3 brands, 4 products with size variants, and distributed inventory

### Auth (100% complete)
- POST /auth/login — JWT access + refresh token issuance
- POST /auth/register — User creation with password strength validation (Admin/Manager only)
- POST /auth/verify-email — Email verification with 24h token
- POST /auth/forgot-password — Password reset email (prevents email enumeration)
- POST /auth/reset-password — Reset with 1h token
- POST /auth/refresh — Token rotation with old token invalidation
- POST /auth/logout — Access token blacklist via Redis + refresh token revocation
- bcrypt password hashing (12 salt rounds)
- RBAC middleware with role hierarchy (ADMIN > MANAGER > STAFF)
- Redis-based token bucket rate limiter on auth endpoints (5 req/min per IP)
- CORS configured with explicit origin (no wildcard)

### Products
- GET /products — List with cursor-based pagination, search, brand filter
- GET /products/:id — Single product with variants
- POST /products — Create product with auto-generated SKU variants (Admin)
- PATCH /products/:id — Update product fields (Admin)
- All queries filtered by tenant_id

### Inventory
- GET /inventory — List inventory at location
- POST /inventory/receive — Receive stock shipment with upsert logic
- POST /inventory/adjust — Adjust stock with Serializable isolation and audit logging

### Transfers
- Full state machine: PENDING → APPROVED → IN_TRANSIT → COMPLETED (+ REJECTED, CANCELLED)
- POST /transfers — Create with source stock validation
- PATCH /transfers/:id/ship — Atomic stock decrement via Serializable transaction
- PATCH /transfers/:id/receive — Stock increment at destination

### Sales
- GET /sales — List with date/location/variant filtering + cursor pagination
- GET /sales/:id — Sale details
- POST /sales — Record sale with Serializable stock decrement + email notification

### Reservations
- GET /reservations — List with status/location filtering + cursor pagination
- POST /reservations — Create with stock reservation + email notification
- PATCH /reservations/:id/cancel — Cancel and release reserved stock
- PATCH /reservations/:id/convert — Convert to sale

### Background Jobs
- Dead stock decay cron (every 6h) with configurable parameters via env vars
- Reservation expiry cron (every 1h)
- Price floor enforcement (40% MSRP)
- PriceHistory logging for all markdowns

### Email Notifications (5 events)
1. Email verification on registration
2. Password reset email
3. Sale confirmation
4. Reservation created
5. Transfer shipped

### Testing
- Unit tests: auth, dead stock decay, pagination, reservation expiry, sales, reservations, transfers, inventory, admin, queue
- Integration tests: full auth flow, RBAC enforcement, products, inventory, transfers, sales, reservations

### Deviations from Blueprint
- Registration endpoint added at /auth/register (blueprint had it under /users POST) — architectural decision to keep all auth operations in the auth module
- Cursor-based pagination uses base64-encoded JSON cursor instead of integer page numbers — better performance for large datasets
