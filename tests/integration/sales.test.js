const request = require('supertest');
const app = require('../../src/app');

describe('Sales Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leanstock.kz', password: 'Password123!' });
    adminToken = res.body.data.accessToken;
  });

  describe('POST /api/v1/sales', () => {
    test('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .send({ variantId: 'fake', locationId: 'fake', quantity: 1, unitPrice: 50000 });

      expect(res.status).toBe(401);
    });

    test('should reject with invalid variantId', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000099',
          locationId: '10000000-0000-0000-0000-000000000001',
          quantity: 1,
          unitPrice: 65000,
        });

      expect(res.status).toBe(404);
    });

    test('should reject invalid quantity (0)', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000001',
          locationId: '10000000-0000-0000-0000-000000000001',
          quantity: 0,
          unitPrice: 65000,
        });

      expect(res.status).toBe(422);
    });

    test('should reject missing unitPrice', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000001',
          locationId: '10000000-0000-0000-0000-000000000001',
          quantity: 1,
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/sales', () => {
    test('should return sales list', async () => {
      const res = await request(app)
        .get('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const res = await request(app).get('/api/v1/sales');
      expect(res.status).toBe(401);
    });

    test('should support locationId filter', async () => {
      const res = await request(app)
        .get('/api/v1/sales?locationId=10000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/sales/:id', () => {
    test('should return 404 for non-existent sale', async () => {
      const res = await request(app)
        .get('/api/v1/sales/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
