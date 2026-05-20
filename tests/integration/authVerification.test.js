const request = require('supertest');
const app = require('../../src/app');

describe('Auth Verification & Password Reset Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leanstock.kz', password: 'Password123!' });
    adminToken = res.body.data.accessToken;
  });

  describe('POST /api/v1/auth/verify-email', () => {
    test('should reject missing token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({});

      expect(res.status).toBe(422);
    });

    test('should reject invalid code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ email: 'admin@leanstock.kz', code: '000000' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    test('should return success for any email (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists');
    });

    test('should return success for valid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@leanstock.kz' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({});

      expect(res.status).toBe(422);
    });

    test('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    test('should reject missing token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ password: 'NewPassword123!' });

      expect(res.status).toBe(422);
    });

    test('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-reset-token', password: 'NewPassword123!' });

      expect(res.status).toBe(400);
    });

    test('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token', password: '123' });

      expect(res.status).toBe(422);
    });
  });

  describe('Unverified user blocked from login', () => {
    test('should register new user (unverified) and block login', async () => {
      const email = `unverified-${Date.now()}@leanstock.kz`;

      // Register as admin
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          password: 'TestPass123!',
          firstName: 'Unverified',
          lastName: 'User',
          role: 'STAFF',
        });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.data.isEmailVerified).toBe(false);

      // Try to login — should be blocked
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'TestPass123!' });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.message).toContain('verify');
    });
  });
});
