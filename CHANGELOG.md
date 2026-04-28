# Changelog

## [0.1.0] — Sprint 1 (Backend Implementation)

### Added
- Project infrastructure: Docker Compose (app + PostgreSQL 16 + Redis 7), Dockerfile, env validation via Zod
- Prisma schema matching blueprint database-schema.docx with all 12 models and 6 enums
- Database seed script with 3 users, 4 locations, 3 brands, 4 products with size variants, and distributed inventory

### Auth (100% complete)
- POST /auth/login — JWT access + refresh token issuance
- POST /auth/register — User creation with password strength validation (Admin/Manager only)
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
- POST /inventory/adjust — Adjust stock with SELECT FOR UPDATE and audit logging

### Transfers
- Full state machine: PENDING → APPROVED → IN_TRANSIT → COMPLETED (+ REJECTED, CANCELLED)
- POST /transfers — Create with source stock validation
- PATCH /transfers/:id/ship — Atomic stock decrement via SELECT FOR UPDATE
- PATCH /transfers/:id/receive — Stock increment at destination

### Background Jobs
- Dead stock decay cron (every 6h) with configurable parameters via env vars
- Price floor enforcement (40% MSRP)
- PriceHistory logging for all markdowns

### Testing
- Unit tests: dead stock decay formula, pagination utils
- Integration tests: full auth flow (login/register/refresh/logout), RBAC enforcement (401/403), transfer lifecycle
- CI pipeline: lint + unit tests + integration tests + Docker build

### Deviations from Blueprint
- Registration endpoint added at /auth/register (blueprint had it under /users POST) — architectural decision to keep all auth operations in the auth module
- Cursor-based pagination uses base64-encoded JSON cursor instead of integer page numbers — better performance for large datasets
