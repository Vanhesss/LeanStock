# Architecture Decisions

## Race Condition Strategy

Inventory operations (sales, transfers, adjustments) use **PostgreSQL row-level locking** via `SELECT ... FOR UPDATE` inside Prisma interactive transactions (`prisma.$transaction()`).

Why not Redis distributed locks? The entire critical section is database-bound — there are no external API calls between read and write. A database-level lock is simpler, has zero extra dependencies, and is automatically released if the transaction fails.

The `SELECT FOR UPDATE` is visible in:
- `src/modules/inventory/inventory.service.js` — `adjustStock()` method
- `src/modules/transfers/transfers.service.js` — `ship()` method

## Multi-Tenancy

Every major table includes `tenant_id`. All queries filter by tenant. Current implementation uses application-level filtering; future phase will enable PostgreSQL Row-Level Security (RLS) policies.

## Dead Stock Decay

**Approach: Application logic (not PostgreSQL triggers).**

Rationale: Triggers are opaque — they hide business logic inside the database, making debugging and testing harder. Application-level decay runs as a cron job every 6 hours, is unit-testable, and parameters are configurable via environment variables.

Parameters (all configurable, not hardcoded):
- `DEAD_STOCK_THRESHOLD_DAYS` — days without sale to qualify (default: 30)
- `DEAD_STOCK_MARKDOWN_PERCENT` — discount per cycle (default: 10%)
- `DEAD_STOCK_INTERVAL_HOURS` — minimum hours between markdowns (default: 72)
- `DEAD_STOCK_PRICE_FLOOR_PERCENT` — minimum price as % of MSRP (default: 40%)

## Error Handling

Centralized via `errorHandler` middleware. Custom error classes (`AppError`, `NotFoundError`, `ConflictError`, etc.) carry HTTP status codes. Prisma errors (P2002 unique constraint, P2025 not found) are mapped to 409 and 404 respectively.

## API Response Format

All responses follow an envelope structure:
```json
{ "success": true, "data": {...}, "meta": {...} }
{ "success": false, "error": { "code": "...", "message": "..." } }
```
