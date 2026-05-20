const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs')
const path = require('path')

const { env } = require('./config/env')
const { errorHandler } = require('./middleware/errorHandler')

const authRoutes = require('./modules/auth/auth.routes')
const productsRoutes = require('./modules/products/products.routes')
const inventoryRoutes = require('./modules/inventory/inventory.routes')
const transfersRoutes = require('./modules/transfers/transfers.routes')
const salesRoutes = require('./modules/sales/sales.routes')
const reservationsRoutes = require('./modules/reservations/reservations.routes')
const adminRoutes = require('./modules/admin/admin.routes')
const suppliersRoutes = require('./modules/suppliers/suppliers.routes')
const purchaseOrdersRoutes = require('./modules/purchaseOrders/purchaseOrders.routes')
const forecastingRoutes = require('./modules/forecasting/forecasting.routes')
const { authenticate } = require('./middleware/authenticate')
const prisma = require('./config/prisma')

const app = express()

// ──────────── Trust proxy (for rate limiter behind reverse proxy) ────────────
app.set('trust proxy', 1)

// ──────────── Global Middleware ────────────
app.use(express.json())
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)

// ──────────── Swagger UI ────────────
try {
  const swaggerDoc = YAML.load(path.join(__dirname, '..', 'openapi.yaml'))
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))
} catch {
  // openapi.yaml might not exist in test environment
}

// ──────────── Health Check ────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ──────────── Serve frontend static files ────────────
app.use(express.static(path.join(__dirname, '..', 'public')))

// ──────────── Debug (TEMPORARY) ────────────
app.post('/api/v1/debug/login-test', async (req, res) => {
  try {
    const bcrypt = require('bcrypt')
    const jwt = require('jsonwebtoken')
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ step: 'findUser', error: 'User not found' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.json({ step: 'bcrypt', error: 'Wrong password', hashPrefix: user.password.slice(0, 10) })
    const token = jwt.sign({ userId: user.id }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' })
    return res.json({ step: 'success', tokenPrefix: token.slice(0, 20), userId: user.id })
  } catch (err) {
    return res.status(500).json({ step: 'error', message: err.message, stack: err.stack?.split('\n').slice(0, 5) })
  }
})

// ──────────── API Routes ────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/transfers', transfersRoutes)
app.use('/api/v1/sales', salesRoutes)
app.use('/api/v1/reservations', reservationsRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/suppliers', suppliersRoutes)
app.use('/api/v1/purchase-orders', purchaseOrdersRoutes)
app.use('/api/v1/forecasting', forecastingRoutes)

// ──────────── Locations (all authenticated users) ────────────
app.get('/api/v1/locations', authenticate, async (req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      select: { id: true, name: true, type: true, city: true },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: locations })
  } catch (error) {
    next(error)
  }
})

// ──────────── API 404 handler ────────────
app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

// ──────────── SPA fallback — serve index.html for non-API routes ────────────
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

// ──────────── Error Handler ────────────
app.use(errorHandler)

module.exports = app
