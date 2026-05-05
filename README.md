# LeanStock — Inventory Management System

> Production-grade inventory management system for a multi-location sneaker retail chain.  
> Built with **Express.js**, **Prisma ORM**, **PostgreSQL**, and **Redis**.

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd leanstock
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
| ORM            | Prisma 5 (zero raw SQL except `SELECT FOR UPDATE`) |
| Database       | PostgreSQL 16 (ACID transactions, row-level locking) |
| Cache          | Redis 7 (rate limiting, JWT blacklist)             |
| Validation     | Zod schemas on all request bodies                  |
| Auth           | JWT access/refresh tokens + bcrypt + RBAC          |
| Email          | Nodemailer (async, non-blocking)                   |
| Scheduling     | node-cron (dead stock decay 6h, reservation expiry 1h) |

---

## API Endpoints

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
| POST   | `/api/v1/inventory/adjust`  | Adjust stock (SELECT FOR UPDATE)   | Manager |

### Transfers

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
| POST   | `/api/v1/sales`      | Record sale (SELECT FOR UPDATE)        | All    |

### Reservations

| Method | Endpoint                              | Description                    | Access |
|--------|---------------------------------------|--------------------------------|--------|
| GET    | `/api/v1/reservations`                | List reservations              | All    |
| POST   | `/api/v1/reservations`                | Create reservation (lock stock)| All    |
| PATCH  | `/api/v1/reservations/:id/cancel`     | Cancel and release stock       | All    |
| PATCH  | `/api/v1/reservations/:id/convert`    | Convert to sale                | All    |

### System

| Method | Endpoint   | Description    |
|--------|------------|----------------|
| GET    | `/health`  | Health check   |
| GET    | `/docs`    | Swagger UI     |

---

## Email Notifications

The system sends real emails via SMTP for these business events:

1. **Verification email** — on user registration
2. **Password reset** — on forgot-password request
3. **Sale confirmation** — when a sale is recorded
4. **Reservation created** — when a reservation is made
5. **Transfer shipped** — when a transfer moves to IN_TRANSIT

Emails are sent asynchronously (fire-and-forget) and never block the API response.

---

## Background Jobs

| Job                   | Schedule    | Description                                    |
|-----------------------|-------------|------------------------------------------------|
| Dead stock decay      | Every 6h    | Markdown stale inventory by configurable %     |
| Reservation expiry    | Every 1h    | Expire overdue reservations, release stock     |

All job parameters are configurable via environment variables.

---

## Testing

```bash
# Unit tests (no database needed) — 63 tests
npm run test:unit

# Integration tests (requires running postgres + redis)
npm run test:integration

# All tests
npm test
```

---

## Environment Variables

See `.env.example` for all required variables. Key additions:

| Variable    | Purpose                              |
|-------------|--------------------------------------|
| SMTP_HOST   | Email server hostname                |
| SMTP_PORT   | Email server port (587 for TLS)      |
| SMTP_USER   | Email account username               |
| SMTP_PASS   | Email account password / app password|
| SMTP_FROM   | Sender email address                 |
| APP_URL     | Base URL for email links             |

---

## Project Structure

```
src/
├── config/          # env validation, prisma, redis, email
├── middleware/      # authenticate, authorize, rateLimiter, validate, errorHandler
├── modules/
│   ├── auth/        # login, register, verify-email, forgot/reset-password
│   ├── products/    # CRUD with tenant_id filtering
│   ├── inventory/   # receive, adjust (SELECT FOR UPDATE)
│   ├── transfers/   # state machine with atomic stock operations
│   ├── sales/       # record sales with stock locking
│   └── reservations/# create, cancel, convert with stock reservation
├── jobs/            # dead stock decay, reservation expiry (node-cron)
└── utils/           # errors, logger, pagination, emailTemplates
```
