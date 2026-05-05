const request = require('supertest');
const app = require('../../src/app');

describe('Reservations Endpoints', () => {
  let adminToken;
  let staffToken;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leanstock.kz', password: 'Password123!' });
    adminToken = adminRes.body.data.accessToken;

    const staffRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@leanstock.kz', password: 'Password123!' });
    staffToken = staffRes.body.data.accessToken;
  });

  describe('POST /api/v1/reservations', () => {
    test('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .send({
          variantId: '00000000-0000-0000-0000-000000000001',
          locationId: '10000000-0000-0000-0000-000000000001',
          quantity: 1,
          customerName: 'Test Customer',
        });

      expect(res.status).toBe(401);
    });

    test('should reject with missing customerName', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000001',
          locationId: '10000000-0000-0000-0000-000000000001',
          quantity: 1,
        });

      expect(res.status).toBe(422);
    });

    test('should reject with invalid variantId (404)', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          variantId: '00000000-0000-0000-0000-000000000099',
          locationId: '10000000-0000-0000-0000-000000000001',
          quantity: 1,
          customerName: 'Test Customer',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/reservations', () => {
    test('should return reservations list', async () => {
      const res = await request(app)
        .get('/api/v1/reservations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    test('should reject without authentication', async () => {
      const res = await request(app).get('/api/v1/reservations');
      expect(res.status).toBe(401);
    });

    test('should support status filter', async () => {
      const res = await request(app)
        .get('/api/v1/reservations?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/v1/reservations/:id/cancel', () => {
    test('should return 404 for non-existent reservation', async () => {
      const res = await request(app)
        .patch('/api/v1/reservations/00000000-0000-0000-0000-000000000099/cancel')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/reservations/:id/convert', () => {
    test('should return 404 for non-existent reservation', async () => {
      const res = await request(app)
        .patch('/api/v1/reservations/00000000-0000-0000-0000-000000000099/convert')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
