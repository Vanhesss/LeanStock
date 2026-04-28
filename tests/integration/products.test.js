const request = require('supertest');
const app = require('../../src/app');

const ADMIN = { email: 'admin@leanstock.kz', password: 'Password123!' };
const STAFF = { email: 'staff@leanstock.kz', password: 'Password123!' };
const BRAND_NIKE = '20000000-0000-0000-0000-000000000001';

async function loginAs(credentials) {
  const res = await request(app).post('/api/v1/auth/login').send(credentials);
  return res.body.data.accessToken;
}

describe('Products Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await loginAs(ADMIN);
  });

  describe('GET /api/v1/products', () => {
    test('should list products with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
      expect(res.body.meta.cursor).toBeDefined();
    });

    test('should filter by brandId', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ brandId: BRAND_NIKE })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((p) => {
        expect(p.brandId).toBe(BRAND_NIKE);
      });
    });

    test('should search by model name', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .query({ search: 'Air Max' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].model).toContain('Air Max');
    });

    test('should paginate with cursor', async () => {
      const page1 = await request(app)
        .get('/api/v1/products')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      const cursor = page1.body.meta.cursor;

      const page2 = await request(app)
        .get('/api/v1/products')
        .query({ limit: 2, cursor })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page2.status).toBe(200);
      const page1Ids = page1.body.data.map((p) => p.id);
      const page2Ids = page2.body.data.map((p) => p.id);
      // No overlap between pages
      page2Ids.forEach((id) => {
        expect(page1Ids).not.toContain(id);
      });
    });

    test('should reject without auth (401)', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    test('should return product with variants', async () => {
      const listRes = await request(app)
        .get('/api/v1/products')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`);

      const productId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.variants).toBeDefined();
      expect(res.body.data.brand).toBeDefined();
    });

    test('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/products', () => {
    test('should create product with variants (Admin)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brandId: BRAND_NIKE,
          model: 'Blazer Mid 77',
          colorway: 'Vintage White',
          msrpPrice: 58000,
          sizes: [39, 40, 41],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.model).toBe('Blazer Mid 77');
      expect(res.body.data.variants).toHaveLength(3);
      expect(res.body.data.variants[0].sku).toBeDefined();
    });

    test('should reject creation by STAFF (403)', async () => {
      const staffToken = await loginAs(STAFF);

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          brandId: BRAND_NIKE,
          model: 'Should Fail',
          colorway: 'Red',
          msrpPrice: 50000,
          sizes: [42],
        });

      expect(res.status).toBe(403);
    });

    test('should reject invalid body (422)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ model: 'Missing fields' });

      expect(res.status).toBe(422);
    });

    test('should reject non-existent brand (404)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brandId: '00000000-0000-0000-0000-000000000099',
          model: 'Ghost',
          colorway: 'None',
          msrpPrice: 10000,
          sizes: [42],
        });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    test('should update product fields (Admin)', async () => {
      const listRes = await request(app)
        .get('/api/v1/products')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`);

      const productId = listRes.body.data[0].id;

      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ msrpPrice: 70000, excludeFromMarkdown: true });

      expect(res.status).toBe(200);
      expect(res.body.data.msrpPrice).toBe(70000);
      expect(res.body.data.excludeFromMarkdown).toBe(true);
    });

    test('should reject update by STAFF (403)', async () => {
      const staffToken = await loginAs(STAFF);

      const listRes = await request(app)
        .get('/api/v1/products')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${staffToken}`);

      // Staff can list products, but let's get an ID from admin
      const adminList = await request(app)
        .get('/api/v1/products')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`);

      const productId = adminList.body.data[0].id;

      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ msrpPrice: 99999 });

      expect(res.status).toBe(403);
    });
  });
});
