# LeanStock — Inventory Management System

> Inventory management system for a multi-location sneaker retail chain.  
> Built with **Express.js**, **Prisma ORM**, **PostgreSQL**, and **Redis**.

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd leanstock
cp .env.example .env

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

---

## Architecture

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Framework      | Express.js 4 + JavaScript (ES2022)              |
| ORM            | Prisma 5 (zero raw SQL except `SELECT FOR UPDATE`) |
| Database       | PostgreSQL 16 (ACID transactions, row-level locking) |
| Cache          | Redis 7 (rate limiting, JWT blacklist)          |
| Validation     | Zod schemas on all request bodies               |
| Auth           | JWT access/refresh tokens + bcrypt + RBAC       |
| Scheduling     | node-cron for dead stock decay (every 6h)       |

---

## API Endpoints

### Auth

| Method | Endpoint                  | Description              | Access         |
|--------|---------------------------|--------------------------|----------------|
| POST   | `/api/v1/auth/login`      | Login, returns JWT tokens | Public         |
| POST   | `/api/v1/auth/register`   | Create user              | Admin, Manager |
| POST   | `/api/v1/auth/refresh`    | Refresh access token     | Authenticated  |
| POST   | `/api/v1/auth/logout`     | Revoke tokens            | Authenticated  |

### Products

| Method | Endpoint                | Description                       | Access |
|--------|-------------------------|-----------------------------------|--------|
| GET    | `/api/v1/products`      | List products (cursor pagination) | All    |
| GET    | `/api/v1/products/:id`  | Get product by ID                 | All    |
| POST   | `/api/v1/products`      | Create product with size variants | Admin  |
| PATCH  | `/api/v1/products/:id`  | Update product                    | Admin  |

### Inventory

| Method | Endpoint                      | Description          | Access  |
|--------|-------------------------------|----------------------|---------|
| GET    | `/api/v1/inventory`           | List inventory       | All     |
| POST   | `/api/v1/inventory/receive`   | Receive stock        | Manager |
| POST   | `/api/v1/inventory/adjust`    | Adjust stock         | Manager |

### Transfers

| Method | Endpoint                              | Description        | Access  |
|--------|---------------------------------------|--------------------|---------|
| GET    | `/api/v1/transfers`                   | List transfers     | Manager |
| POST   | `/api/v1/transfers`                   | Create transfer    | Manager |
| PATCH  | `/api/v1/transfers/:id/approve`       | Approve transfer   | Manager |
| PATCH  | `/api/v1/transfers/:id/reject`        | Reject transfer    | Manager |
| PATCH  | `/api/v1/transfers/:id/ship`          | Ship (atomic stock decrement) | Manager |
| PATCH  | `/api/v1/transfers/:id/receive`       | Complete transfer  | Manager |

### Background Jobs

- **Dead stock decay** — runs every 6 hours with configurable thresholds

---

## Testing

```bash
# Unit tests (no database needed)
npm run test:unit

# Integration tests (requires running postgres + redis)
npm run test:integration

# All tests
npm test
```

---

## Environment Variables

See `.env.example` for all required variables with descriptions.

---

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
