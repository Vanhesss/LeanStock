<<<<<<< HEAD
# LeanStock
=======
# LeanStock — Inventory Management System

Inventory management system for a multi-location sneaker retail chain. Built with Express.js, Prisma ORM, PostgreSQL, and Redis.

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd leanstock
cp .env.example .env

# 2. Start infrastructure
docker compose up -d

# 3. Wait for healthy containers, then run migrations and seed
npx prisma migrate deploy
npx prisma db seed

# 4. Start dev server
npm run dev
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/docs`.

### Docker-only (no local Node.js needed)

```bash
docker compose up --build
```

This starts the app, PostgreSQL 16, and Redis 7. Migrations run automatically on startup.

## Default Credentials

| Role    | Email                 | Password       |
|---------|-----------------------|----------------|
| Admin   | admin@leanstock.kz    | Password123!   |
| Manager | manager@leanstock.kz  | Password123!   |
| Staff   | staff@leanstock.kz    | Password123!   |

## Architecture

- **Framework:** Express.js 4 + JavaScript (ES2022)
- **ORM:** Prisma 5 (zero raw SQL except SELECT FOR UPDATE)
- **Database:** PostgreSQL 16 (ACID transactions, row-level locking)
- **Cache:** Redis 7 (rate limiting, JWT blacklist)
- **Validation:** Zod schemas on all request bodies
- **Auth:** JWT access/refresh tokens + bcrypt password hashing + RBAC
- **Scheduling:** node-cron for dead stock decay (every 6h)

## Implemented Endpoints (Sprint 1 — 20%)

### Auth (100% complete)
- `POST /api/v1/auth/login` — Login, returns JWT tokens
- `POST /api/v1/auth/register` — Create user (Admin/Manager only)
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Revoke tokens

### Products
- `GET /api/v1/products` — List products (cursor pagination)
- `GET /api/v1/products/:id` — Get product by ID
- `POST /api/v1/products` — Create product with size variants (Admin)
- `PATCH /api/v1/products/:id` — Update product (Admin)

### Inventory
- `GET /api/v1/inventory?locationId=...` — List inventory
- `POST /api/v1/inventory/receive` — Receive stock (Manager)
- `POST /api/v1/inventory/adjust` — Adjust stock with reason (Manager)

### Transfers (SELECT FOR UPDATE)
- `GET /api/v1/transfers` — List transfers (Manager)
- `POST /api/v1/transfers` — Create transfer request (Manager)
- `PATCH /api/v1/transfers/:id/approve` — Approve (Manager)
- `PATCH /api/v1/transfers/:id/reject` — Reject with reason (Manager)
- `PATCH /api/v1/transfers/:id/ship` — Ship (atomic stock decrement)
- `PATCH /api/v1/transfers/:id/receive` — Complete transfer

### Background Jobs
- Dead stock decay cron (every 6 hours) — configurable thresholds

## Testing

```bash
# Unit tests (no database needed)
npm run test:unit

# Integration tests (requires running postgres + redis)
npm run test:integration

# All tests
npm test
```

## Environment Variables

See `.env.example` for all required variables with descriptions.

## Project Structure

```
src/
├── config/          # env validation, prisma, redis
├── middleware/       # authenticate, authorize, rateLimiter, validate, errorHandler
├── modules/
│   ├── auth/        # login, register, logout, refresh
│   ├── products/    # CRUD with tenant_id filtering
│   ├── inventory/   # receive, adjust (SELECT FOR UPDATE)
│   └── transfers/   # state machine with atomic stock operations
├── jobs/            # dead stock decay cron
└── utils/           # errors, logger, pagination
```
>>>>>>> de64a2e (Initial commit)
