# Architecture Decisions

## Race Condition Strategy

Inventory operations (sales, transfers, adjustments, reservations) use **Prisma interactive transactions** with `isolationLevel: 'Serializable'`.

Why Serializable isolation? It provides the same concurrency guarantees as `SELECT FOR UPDATE` — preventing overselling, double-shipping, and phantom reads — while using **pure ORM queries** (no raw SQL). PostgreSQL automatically detects and prevents conflicting concurrent transactions at this isolation level.

Affected operations:
- `src/modules/inventory/inventory.service.js` — `adjustStock()`
- `src/modules/transfers/transfers.service.js` — `ship()`
- `src/modules/sales/sales.service.js` — `create()`
- `src/modules/reservations/reservations.service.js` — `create()`, `convertToSale()`

## Background Workers & Email Queue

All async processing uses **BullMQ** with Redis-backed queues.

Architecture:
1. **API layer** enqueues jobs (never blocks on SMTP or heavy processing)
2. **Workers** process jobs from their queues (email, dead-stock-decay, reservation-expiry)
3. **Cron schedules** (`node-cron`) enqueue recurring jobs into BullMQ at fixed intervals
4. **Admin endpoints** provide queue visibility and manual job triggers

This design ensures:
- API responses are never blocked by email delivery
- Failed jobs can be inspected and retried
- Job counts (completed, failed, waiting, active) are observable via `/admin/queues`

## Multi-Tenancy

Every major table includes `tenant_id`. All queries filter by tenant. Current implementation uses application-level filtering; future phase will enable PostgreSQL Row-Level Security (RLS) policies.

## Dead Stock Decay

**Approach: Application logic (not PostgreSQL triggers).**

Rationale: Triggers are opaque — they hide business logic inside the database, making debugging and testing harder. Application-level decay runs as a BullMQ worker on a cron schedule (every 6 hours), is unit-testable, and parameters are configurable via environment variables.

Parameters (all configurable, not hardcoded):
- `DEAD_STOCK_THRESHOLD_DAYS` — days without sale to qualify (default: 30)
- `DEAD_STOCK_MARKDOWN_PERCENT` — discount per cycle (default: 10%)
- `DEAD_STOCK_INTERVAL_HOURS` — minimum hours between markdowns (default: 72)
- `DEAD_STOCK_PRICE_FLOOR_PERCENT` — minimum price as % of MSRP (default: 40%)

## Error Handling

Centralized via `errorHandler` middleware. Custom error classes (`AppError`, `NotFoundError`, `ConflictError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`) carry HTTP status codes. Prisma errors (P2002 unique constraint, P2025 not found) are mapped to 409 and 404 respectively.

Standardized error codes: 400, 401, 403, 404, 409, 422, 500.

## API Response Format

All responses follow an envelope structure:
```json
{ "success": true, "data": {...}, "meta": {...} }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

## Pagination

All list endpoints use **cursor-based pagination** with base64-encoded JSON cursors. This provides better performance than offset-based pagination for large datasets and avoids the "page drift" problem when records are added or removed during navigation.
