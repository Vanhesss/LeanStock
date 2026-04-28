const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const { env } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const productsRoutes = require('./modules/products/products.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const transfersRoutes = require('./modules/transfers/transfers.routes');

const app = express();

// ──────────── Global Middleware ────────────
app.use(express.json());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// ──────────── Swagger UI ────────────
try {
  const swaggerDoc = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
} catch {
  // openapi.yaml might not exist in test environment
}

// ──────────── Health Check ────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────── API Routes ────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/transfers', transfersRoutes);

// ──────────── 404 handler ────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ──────────── Error Handler ────────────
app.use(errorHandler);

module.exports = app;
