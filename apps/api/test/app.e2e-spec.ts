import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module';

describe('Authentication & Security Hardening (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const internalApiKey =
    process.env.INTERNAL_API_KEY || 'sc-internal-service-key-dev-only';
  const accessSecret =
    process.env.JWT_ACCESS_SECRET || 'sc-ai-access-secret-dev-only';

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = internalApiKey;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  describe('1. Mock Token Rejection & Token Hygiene', () => {
    it('rejects mock-token-123 on protected endpoints with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/behavior/alerts')
        .set('Authorization', 'Bearer mock-token-123')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('rejects requests without authentication token with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/behavior/alerts')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('rejects malformed token strings with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer not-even-a-jwt')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('rejects forged/tampered JWT signatures with 401 Unauthorized', async () => {
      // Token signed with wrong secret
      const forgedToken = jwtService.sign(
        { sub: 'usr_admin_dev', email: 'attacker@evil.com', roles: ['SUPER_ADMIN'] },
        { secret: 'attacker-unauthorized-key', expiresIn: '1h' },
      );

      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('rejects expired access tokens with 401 Unauthorized', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'usr_admin_dev', email: 'admin@smartcampus.edu', roles: ['TEACHER'] },
        { secret: accessSecret, expiresIn: '-10s' },
      );

      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('2. Real Authentication & Refresh Lifecycle', () => {
    let validAccessToken = '';
    let validRefreshToken = '';

    it('POST /api/auth/login fails with 401 for invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'kalaiselvis@vemanait.edu.in',
          password: 'incorrect-password-123',
        })
        .expect(401);

      expect(res.body.message).toContain('credentials');
    });

    it('POST /api/auth/login succeeds with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'kalaiselvis@vemanait.edu.in',
          password: 'teacher@vemana',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('kalaiselvis@vemanait.edu.in');

      validAccessToken = res.body.data.tokens.accessToken;
      validRefreshToken = res.body.data.tokens.refreshToken;
    });

    it('GET /api/auth/profile returns user details with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('kalaiselvis@vemanait.edu.in');
      expect(res.body.data.roles).toContain('TEACHER');
    });

    it('POST /api/auth/refresh succeeds with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('POST /api/auth/refresh fails with 401 for invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'bogus-refresh-token' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('POST /api/auth/logout clears session cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookiesArr = Array.isArray(setCookie) ? setCookie : [setCookie];
      expect(cookiesArr.some((c: string) => c.includes('refreshToken=;'))).toBe(true);
    });
  });

  describe('3. Internal Service-to-Service Authentication & Privilege Scoping', () => {
    it('succeeds when authenticating with valid INTERNAL_API_KEY', async () => {
      const payload = {
        eventId: 'bev_e2e_internal_key_test',
        eventType: 'PHONE_USAGE',
        trackId: '10',
        duration: 8.5,
        status: 'RESOLVED',
        metadata: { resolution: 'evidence_cleared' },
      };

      const res = await request(app.getHttpServer())
        .post('/api/behavior/resolve')
        .set('x-api-key', internalApiKey)
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.eventId).toBe('bev_e2e_internal_key_test');
    });

    it('rejects internal calls with invalid x-api-key with 401 Unauthorized', async () => {
      const payload = {
        eventId: 'bev_e2e_invalid_key_test',
        eventType: 'PHONE_USAGE',
        trackId: '10',
        duration: 8.5,
        status: 'RESOLVED',
      };

      await request(app.getHttpServer())
        .post('/api/behavior/resolve')
        .set('x-api-key', 'invalid-intruder-key')
        .send(payload)
        .expect(401);
    });

    it('ensures internal service caller cannot access admin-only /api/users (no SUPER_ADMIN privilege)', async () => {
      // Internal service should have DEVICE_MANAGER and TEACHER, not SUPER_ADMIN/INSTITUTION_ADMIN
      await request(app.getHttpServer())
        .get('/api/users')
        .set('x-api-key', internalApiKey)
        .expect(403);
    });
  });

  describe('4. Role-Based Authorization & IDOR Protection', () => {
    it('rejects teacher from accessing super-admin-only endpoints (e.g., delete user)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'kalaiselvis@vemanait.edu.in',
          password: 'teacher@vemana',
        })
        .expect(200);

      const teacherToken = loginRes.body.data.tokens.accessToken;

      await request(app.getHttpServer())
        .delete('/api/users/some-target-id')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('enforces student data ownership on attendance analytics (IDOR prevention)', async () => {
      // 1. Log in as student Manjunatha
      const studentLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'manjunathar.cs2023@vemanait.edu.in',
          password: '1VI23CS058@VEMANA',
        })
        .expect(200);

      const studentToken = studentLogin.body.data.tokens.accessToken;

      // 2. Student requesting own attendance by USN succeeds
      await request(app.getHttpServer())
        .get('/api/attendance/student/1VI23CS058')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // 3. Student attempting to query another student's attendance receives 403 Forbidden
      const idorRes = await request(app.getHttpServer())
        .get('/api/attendance/student/1VI23CS999_OTHER')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(idorRes.body.message).toContain('Access denied');
    });

    it('enforces student data ownership on biometrics (IDOR prevention)', async () => {
      const studentLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'manjunathar.cs2023@vemanait.edu.in',
          password: '1VI23CS058@VEMANA',
        })
        .expect(200);

      const studentToken = studentLogin.body.data.tokens.accessToken;

      // Student attempting to query another student record's biometrics receives 403 Forbidden
      const idorRes = await request(app.getHttpServer())
        .get('/api/students/foreign-student-id-999/biometrics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(idorRes.body.message).toContain('Access denied');
    });

    it('allows teacher/staff to access student analytics as authorized by role', async () => {
      const teacherLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'kalaiselvis@vemanait.edu.in',
          password: 'teacher@vemana',
        })
        .expect(200);

      const teacherToken = teacherLogin.body.data.tokens.accessToken;

      // Teacher querying student attendance succeeds
      await request(app.getHttpServer())
        .get('/api/attendance/student/1VI23CS058')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
