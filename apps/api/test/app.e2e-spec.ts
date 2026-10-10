import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('POST /api/auth/login and GET /api/behavior/alerts (Authenticated)', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kalaiselvis@vemanait.edu.in', password: 'teacher@vemana' })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    const token = loginRes.body.data.tokens.accessToken;
    expect(token).toBeDefined();

    const alertsRes = await request(app.getHttpServer())
      .get('/api/behavior/alerts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(alertsRes.body)).toBe(true);
  });

  afterEach(async () => {
    await app.close();
  });
});
