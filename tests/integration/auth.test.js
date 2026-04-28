const request = require('supertest');
const app = require('../../src/app');

/**
 * Integration tests for Auth endpoints.
 * Requires running database and Redis (use docker compose up postgres redis).
 * Run: npm run test:integration
 */

const TEST_USER = {
  email: 'admin@leanstock.kz',
  password: 'Password123!',
};

describe('Auth Endpoints', () => {
  let accessToken;
  let refreshToken;

  describe('POST /api/v1/auth/login', () => {
    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.role).toBe('ADMIN');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    test('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'Password123!' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    test('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@leanstock.kz', password: 'Password123!' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    test('should refresh tokens with valid refresh token', async () => {
      // Login first to get tokens
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      const rt = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    test('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('should logout successfully', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('should reject logout without token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('Protected Endpoints - Auth Checks', () => {
    test('should reject request without token (401)', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(401);
    });

    test('should reject request with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });

    test('should reject STAFF from Manager-only endpoint (403)', async () => {
      // Login as staff
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'staff@leanstock.kz', password: 'Password123!' });

      const staffToken = loginRes.body.data.accessToken;

      // Try to access transfers (Manager+)
      const res = await request(app)
        .get('/api/v1/transfers')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    test('should allow ADMIN to access Manager endpoints', async () => {
      // Login as admin
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      const adminToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/transfers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register new user as admin', async () => {
      // Login as admin
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      const adminToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `test-${Date.now()}@leanstock.kz`,
          password: 'NewUser123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'STAFF',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toContain('test-');
      expect(res.body.data.role).toBe('STAFF');
    });

    test('should reject registration by STAFF (403)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'staff@leanstock.kz', password: 'Password123!' });

      const staffToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'should-fail@leanstock.kz',
          password: 'NewUser123!',
          firstName: 'Fail',
          lastName: 'User',
          role: 'STAFF',
        });

      expect(res.status).toBe(403);
    });

    test('should reject duplicate email (409)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send(TEST_USER);

      const adminToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@leanstock.kz', // already exists
          password: 'NewUser123!',
          firstName: 'Dup',
          lastName: 'User',
          role: 'STAFF',
        });

      expect(res.status).toBe(409);
    });
  });
});
