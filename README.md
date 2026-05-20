# LeanStock — Inventory Management System

> Production-grade inventory management system for a multi-location sneaker retail chain.  
> Built with **Express.js**, **Prisma ORM**, **PostgreSQL**, **Redis**, and **BullMQ**.

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd leanstock
npm install
cp .env.example .env    # fill in SMTP credentials for email

# 2. Start infrastructure
docker compose up -d

# 3. Run migrations and seed the database
npx prisma migrate deploy
npx prisma db seed

# 4. Start the dev server
npm run dev
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/docs`.

### Docker-only (no local Node.js needed)

```bash
docker compose up --build
```

This starts the app, PostgreSQL 16, and Redis 7. Migrations run automatically on startup.

---

## Default Credentials

| Role    | Email                | Password     |
|---------|----------------------|--------------|
| Admin   | admin@leanstock.kz   | Password123! |
| Manager | manager@leanstock.kz | Password123! |
| Staff   | staff@leanstock.kz   | Password123! |

All seeded users have verified emails.

---

## Architecture

| Layer          | Technology                                         |
|----------------|----------------------------------------------------|
| Framework      | Express.js 4 + JavaScript (ES2022)                 |
| ORM            | Prisma 5 (pure ORM, zero raw SQL)                  |
| Database       | PostgreSQL 16 (ACID transactions, Serializable isolation) |
| Cache          | Redis 7 (rate limiting, JWT blacklist, job queues) |
| Job Queue      | BullMQ (Redis-backed background workers)           |
| Scheduling     | node-cron → BullMQ (dead stock 6h, reservation expiry 1h) |
| Validation     | Zod schemas on all request bodies                  |
| Auth           | JWT access/refresh tokens + bcrypt + RBAC          |
| Email          | Nodemailer via BullMQ queue (async, non-blocking)  |
| API Docs       | Swagger UI at `/docs` (OpenAPI 3.0)                |
| Testing        | Jest + Supertest                                   |

---

## API Endpoints (43 total)

### Auth

| Method | Endpoint                      | Description                    | Access         |
|--------|-------------------------------|--------------------------------|----------------|
| POST   | `/api/v1/auth/login`          | Login (requires verified email) | Public        |
| POST   | `/api/v1/auth/register`       | Create user + send verification | Admin, Manager |
| POST   | `/api/v1/auth/verify-email`   | Verify email with token        | Public         |
| POST   | `/api/v1/auth/forgot-password`| Request password reset email   | Public         |
| POST   | `/api/v1/auth/reset-password` | Reset password with token      | Public         |
| POST   | `/api/v1/auth/refresh`        | Refresh access token           | Public         |
| POST   | `/api/v1/auth/logout`         | Revoke tokens                  | Authenticated  |

### Products

| Method | Endpoint                | Description                       | Access |
|--------|-------------------------|-----------------------------------|--------|
| GET    | `/api/v1/products`      | List products (cursor pagination) | All    |
| GET    | `/api/v1/products/:id`  | Get product by ID                 | All    |
| POST   | `/api/v1/products`      | Create product with size variants | Admin  |
| PATCH  | `/api/v1/products/:id`  | Update product                    | Admin  |

### Inventory

| Method | Endpoint                    | Description                        | Access  |
|--------|-----------------------------|------------------------------------|---------|
| GET    | `/api/v1/inventory`         | List inventory at location         | All     |
| POST   | `/api/v1/inventory/receive` | Receive stock shipment             | Manager |
| POST   | `/api/v1/inventory/adjust`  | Adjust stock (Serializable txn)    | Manager |

### Transfers (State Machine: PENDING → APPROVED → IN_TRANSIT → COMPLETED)

| Method | Endpoint                            | Description                          | Access  |
|--------|-------------------------------------|--------------------------------------|---------|
| GET    | `/api/v1/transfers`                 | List transfers                       | Manager |
| POST   | `/api/v1/transfers`                 | Create transfer request              | Manager |
| PATCH  | `/api/v1/transfers/:id/approve`     | Approve pending transfer             | Manager |
| PATCH  | `/api/v1/transfers/:id/reject`      | Reject with reason                   | Manager |
| PATCH  | `/api/v1/transfers/:id/ship`        | Ship (atomic stock decrement)        | Manager |
| PATCH  | `/api/v1/transfers/:id/receive`     | Complete transfer                    | Manager |

### Sales

| Method | Endpoint             | Description                            | Access |
|--------|----------------------|----------------------------------------|--------|
| GET    | `/api/v1/sales`      | List sales (date/location filtering)   | All    |
| GET    | `/api/v1/sales/:id`  | Get sale details                       | All    |
| POST   | `/api/v1/sales`      | Record sale (Serializable stock lock)  | All    |

### Reservations

| Method | Endpoint                              | Description                    | Access |
|--------|---------------------------------------|--------------------------------|--------|
| GET    | `/api/v1/reservations`                | List reservations              | All    |
| POST   | `/api/v1/reservations`                | Create reservation (lock stock)| All    |
| PATCH  | `/api/v1/reservations/:id/cancel`     | Cancel and release stock       | All    |
| PATCH  | `/api/v1/reservations/:id/convert`    | Convert to sale                | All    |

### Admin (ADMIN role required)

| Method | Endpoint                               | Description                     |
|--------|-----------------------------------------|---------------------------------|
| GET    | `/api/v1/admin/users`                  | List users                       |
| GET    | `/api/v1/admin/locations`              | List locations                   |
| POST   | `/api/v1/admin/locations`              | Create location                  |
| GET    | `/api/v1/admin/brands`                 | List brands                      |
| POST   | `/api/v1/admin/brands`                 | Create brand                     |
| GET    | `/api/v1/admin/audit-logs`             | View audit logs                  |
| GET    | `/api/v1/admin/price-history`          | View price markdown history      |
| GET    | `/api/v1/admin/queues`                 | Background job queue status      |
| POST   | `/api/v1/admin/jobs/dead-stock-decay`  | Trigger dead stock decay job     |
| POST   | `/api/v1/admin/jobs/reservation-expiry`| Trigger reservation expiry job   |

### Suppliers

| Method | Endpoint                  | Description                  | Access  |
|--------|---------------------------|------------------------------|---------|
| GET    | `/api/v1/suppliers`       | List suppliers               | Manager |
| GET    | `/api/v1/suppliers/:id`   | Get supplier with recent POs | Manager |
| POST   | `/api/v1/suppliers`       | Create supplier              | Admin   |
| PATCH  | `/api/v1/suppliers/:id`   | Update supplier              | Admin   |

### Purchase Orders (State Machine: DRAFT → SUBMITTED → CONFIRMED → SHIPPED → RECEIVED)

| Method | Endpoint                                | Description                          | Access  |
|--------|-----------------------------------------|--------------------------------------|---------|
| GET    | `/api/v1/purchase-orders`               | List purchase orders                 | Manager |
| GET    | `/api/v1/purchase-orders/:id`           | Get PO details                       | Manager |
| POST   | `/api/v1/purchase-orders`               | Create purchase order                | Manager |
| PATCH  | `/api/v1/purchase-orders/:id/submit`    | Submit PO to supplier                | Manager |
| PATCH  | `/api/v1/purchase-orders/:id/confirm`   | Confirm PO (sends email)             | Manager |
| PATCH  | `/api/v1/purchase-orders/:id/ship`      | Mark PO as shipped                   | Manager |
| PATCH  | `/api/v1/purchase-orders/:id/receive`   | Receive PO (atomic stock update)     | Manager |
| PATCH  | `/api/v1/purchase-orders/:id/cancel`    | Cancel PO                            | Manager |

### Forecasting & Reorder

| Method | Endpoint                                | Description                              | Access  |
|--------|-----------------------------------------|------------------------------------------|---------|
| GET    | `/api/v1/forecasting/reorder`           | Predictive reorder suggestions (SMA)     | Manager |
| GET    | `/api/v1/forecasting/velocity`          | Sales velocity with trend (regression)   | Manager |
| POST   | `/api/v1/forecasting/low-stock-alerts`  | Send low-stock alert emails to managers  | Manager |

### System

| Method | Endpoint   | Description    |
|--------|------------|----------------|
| GET    | `/health`  | Health check   |
| GET    | `/docs`    | Swagger UI     |

---

## Email Notifications

All emails are sent asynchronously via BullMQ queue — the API never blocks on SMTP.

| Event                      | Trigger                         | Recipient          |
|----------------------------|---------------------------------|--------------------|
| Verification email         | User registration               | New user           |
| Password reset             | Forgot-password request         | User               |
| Sale confirmation          | Sale recorded                   | Staff who sold     |
| Reservation created        | Reservation made                | Staff who reserved |
| Transfer shipped           | Transfer moves to IN_TRANSIT    | Requesting manager |
| Transfer received          | Transfer completed              | Requesting manager |
| Low-stock alert            | Triggered via forecasting API   | All active managers|
| PO confirmation            | Purchase order confirmed        | PO orderer         |

---

## Background Workers & Queue

All background processing uses **BullMQ** with Redis-backed queues.

| Queue               | Worker             | Schedule       | Description                                    |
|---------------------|--------------------|----------------|------------------------------------------------|
| `email`             | Email Worker       | Immediate      | Sends emails via SMTP (concurrency: 3)         |
| `dead-stock-decay`  | Dead Stock Worker  | Every 6h       | Markdown stale inventory by configurable %     |
| `reservation-expiry`| Expiry Worker      | Every 1h       | Expire overdue reservations, release stock     |

### Queue Visibility

- `GET /api/v1/admin/queues` — returns `{ completed, failed, waiting, active, delayed }` per queue
- `POST /api/v1/admin/jobs/dead-stock-decay` — manually trigger dead stock decay
- `POST /api/v1/admin/jobs/reservation-expiry` — manually trigger reservation expiry

### Dead Stock Decay Parameters (env vars)

| Variable                       | Default | Description                    |
|--------------------------------|---------|--------------------------------|
| `DEAD_STOCK_THRESHOLD_DAYS`    | 30      | Days without sale to qualify   |
| `DEAD_STOCK_MARKDOWN_PERCENT`  | 10      | Discount percentage per cycle  |
| `DEAD_STOCK_INTERVAL_HOURS`    | 72      | Min hours between markdowns    |
| `DEAD_STOCK_PRICE_FLOOR_PERCENT`| 40     | Price floor as % of MSRP       |

---

## Testing

```bash
# Unit tests (no database needed) — 140+ tests across 13 suites
npm run test:unit

# Integration tests (requires running postgres + redis)
npm run test:integration

# All tests
npm test
```

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable    | Purpose                              |
|-------------|--------------------------------------|
| DATABASE_URL| PostgreSQL connection string          |
| REDIS_URL   | Redis connection string               |
| JWT_ACCESS_SECRET  | JWT signing secret (min 32 chars)  |
| JWT_REFRESH_SECRET | JWT refresh secret (min 32 chars)  |
| GMAIL_CLIENT_ID | Gmail OAuth2 client ID            |
| GMAIL_CS    | Gmail OAuth2 client secret           |
| GMAIL_RT    | Gmail OAuth2 refresh token           |
| GMAIL_USER  | Gmail sender email address           |
| APP_URL     | Base URL for email links             |
| CORS_ORIGIN | Allowed CORS origin (deployed domain)|

---

## Project Structure

```
src/
├── config/          # env validation, prisma, redis, email, queue (BullMQ)
├── middleware/      # authenticate, authorize, rateLimiter, validate, errorHandler
├── modules/
│   ├── auth/        # login, register, verify-email, forgot/reset-password
│   ├── products/    # CRUD with tenant_id filtering
│   ├── inventory/   # receive, adjust (Serializable isolation)
│   ├── transfers/   # state machine with atomic stock operations
│   ├── sales/          # record sales with stock locking
│   ├── reservations/   # create, cancel, convert with stock reservation
│   ├── suppliers/      # supplier CRUD
│   ├── purchaseOrders/ # PO workflow (DRAFT→SUBMITTED→CONFIRMED→SHIPPED→RECEIVED)
│   ├── forecasting/    # reorder suggestions (SMA), velocity (regression), low-stock alerts
│   └── admin/          # users, locations, brands, audit logs, price history, queues
├── jobs/            # cron schedules → BullMQ queue dispatch
├── workers/         # BullMQ workers: email, dead stock, reservation expiry
└── utils/           # errors, logger, pagination, emailTemplates
```
