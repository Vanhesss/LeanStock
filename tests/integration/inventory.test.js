const request = require('supertest');
const app = require('../../src/app');

const ADMIN = { email: 'admin@leanstock.kz', password: 'Password123!' };
const STAFF = { email: 'staff@leanstock.kz', password: 'Password123!' };
const LOC_MEGA = '10000000-0000-0000-0000-000000000001';
const LOC_WAREHOUSE = '10000000-0000-0000-0000-000000000004';

async function loginAs(credentials) {
  const res = await request(app).post('/api/v1/auth/login').send(credentials);
  return res.body.data.accessToken;
}

describe('Inventory Endpoints', () => {
  let adminToken;
  let sampleVariantId;

  beforeAll(async () => {
    adminToken = await loginAs(ADMIN);

    // Get a variant ID from existing inventory
    const invRes = await request(app)
      .get('/api/v1/inventory')
      .query({ locationId: LOC_MEGA, limit: 1 })
      .set('Authorization', `Bearer ${adminToken}`);

    sampleVariantId = invRes.body.data[0].variantId;
  });

  describe('GET /api/v1/inventory', () => {
    test('should list inventory at location', async () => {
      const res = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);

      const item = res.body.data[0];
      expect(item.variantId).toBeDefined();
      expect(item.onHand).toBeDefined();
      expect(item.currentPrice).toBeDefined();
      expect(item.sku).toBeDefined();
      expect(item.locationName).toBeDefined();
    });

    test('should paginate with cursor', async () => {
      const page1 = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, limit: 3 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      const cursor = page1.body.meta.cursor;

      const page2 = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, limit: 3, cursor })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page2.status).toBe(200);
      const page1Ids = page1.body.data.map((i) => i.id);
      const page2Ids = page2.body.data.map((i) => i.id);
      page2Ids.forEach((id) => {
        expect(page1Ids).not.toContain(id);
      });
    });

    test('should filter low stock items', async () => {
      const res = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, lowStock: 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    test('should reject without auth (401)', async () => {
      const res = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/inventory/receive', () => {
    test('should receive stock at location', async () => {
      // Get initial state
      const before = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, limit: 50 })
        .set('Authorization', `Bearer ${adminToken}`);

      const existing = before.body.data.find((i) => i.variantId === sampleVariantId);
      const initialOnHand = existing ? existing.onHand : 0;

      const res = await request(app)
        .post('/api/v1/inventory/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: LOC_MEGA,
          items: [{ variantId: sampleVariantId, quantity: 5 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify stock increased
      const after = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, limit: 50 })
        .set('Authorization', `Bearer ${adminToken}`);

      const updated = after.body.data.find((i) => i.variantId === sampleVariantId);
      expect(updated.onHand).toBe(initialOnHand + 5);
    });

    test('should reject by STAFF (403)', async () => {
      const staffToken = await loginAs(STAFF);

      const res = await request(app)
        .post('/api/v1/inventory/receive')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          locationId: LOC_MEGA,
          items: [{ variantId: sampleVariantId, quantity: 1 }],
        });

      expect(res.status).toBe(403);
    });

    test('should reject invalid body (422)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ locationId: 'not-a-uuid' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/inventory/adjust', () => {
    test('should adjust stock down (DAMAGE)', async () => {
      const before = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: LOC_MEGA, limit: 50 })
        .set('Authorization', `Bearer ${adminToken}`);

      const item = before.body.data.find((i) => i.variantId === sampleVariantId);
      const initialOnHand = item.onHand;

      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: sampleVariantId,
          locationId: LOC_MEGA,
          adjustment: -2,
          reason: 'DAMAGE',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.onHand).toBe(initialOnHand - 2);
    });

    test('should adjust stock up (CORRECTION)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: sampleVariantId,
          locationId: LOC_MEGA,
          adjustment: 3,
          reason: 'CORRECTION',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should reject insufficient stock (409)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: sampleVariantId,
          locationId: LOC_MEGA,
          adjustment: -99999,
          reason: 'AUDIT',
        });

      expect(res.status).toBe(409);
    });

    test('should reject by STAFF (403)', async () => {
      const staffToken = await loginAs(STAFF);

      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          variantId: sampleVariantId,
          locationId: LOC_MEGA,
          adjustment: -1,
          reason: 'DAMAGE',
        });

      expect(res.status).toBe(403);
    });

    test('should reject invalid reason (422)', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: sampleVariantId,
          locationId: LOC_MEGA,
          adjustment: -1,
          reason: 'INVALID_REASON',
        });

      expect(res.status).toBe(422);
    });
  });
});
