import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PostgreSQL Live Attendance Ingestion & Dedup Verification', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let testInstitutionId: string;
  let testStudent: any;
  let testSessionId: string;
  let testSessionDbId: string;
  const internalApiKey = 'sc-internal-service-key-dev-only';

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://smartcampus:smartcampus_dev@localhost:5432/smartcampus?schema=public';
    process.env.INTERNAL_API_KEY = internalApiKey;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Verify DB connectivity
    const institution = await prisma.institution.findFirst();
    if (!institution) {
      throw new Error('No institution found in PostgreSQL for integration test');
    }
    testInstitutionId = institution.id;

    testStudent = await prisma.student.findFirst({
      where: { institutionId: testInstitutionId },
    });
    if (!testStudent) {
      throw new Error('No student found in PostgreSQL for integration test');
    }

    // Create an isolated active AttendanceSession for this test run
    testSessionId = `TEST-SES-${Date.now()}`;
    const newSession = await prisma.attendanceSession.create({
      data: {
        sessionId: testSessionId,
        institutionId: testInstitutionId,
        classroomId: 'CR-TEST-101',
        status: 'ACTIVE',
        startedAt: new Date(),
        totalPresent: 0,
      },
    });
    testSessionDbId = newSession.id;
  }, 30000);

  afterAll(async () => {
    if (prisma && testSessionDbId) {
      // Clean up records created during this test run
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId: testSessionDbId },
      });
      await prisma.attendanceSession.delete({
        where: { id: testSessionDbId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('persists a new attendance record in PostgreSQL via HTTP ingestion endpoint', async () => {
    const ingestPayload = {
      sessionId: testSessionId,
      studentId: testStudent.studentId || testStudent.id,
      confidence: 0.88,
      method: 'FACE_RECOGNITION',
      status: 'PRESENT',
      cameraId: 'CAM-TEST-01',
      studentName: testStudent.fullName,
    };

    // 1. Submit through actual NestJS HTTP endpoint with x-api-key authentication
    const response = await request(app.getHttpServer())
      .post('/api/attendance/ingest')
      .set('x-api-key', internalApiKey)
      .send(ingestPayload);

    expect(response.status).toBe(201);
    expect(response.body).toBeDefined();
    expect(response.body.sessionId).toBe(testSessionDbId);
    expect(response.body.studentId).toBe(testStudent.id);

    // 2. Query PostgreSQL directly with raw SQL to confirm actual persistence
    const sqlRows: any[] = await prisma.$queryRaw`
      SELECT id, "sessionId", "studentId", "statusEnum", "confidenceScore", "recognitionSource", "cameraId"
      FROM "AttendanceRecord"
      WHERE "sessionId" = ${testSessionDbId} AND "studentId" = ${testStudent.id}
    `;

    expect(sqlRows).toHaveLength(1);
    const row = sqlRows[0];
    expect(row.statusEnum).toBe('PRESENT');
    expect(row.confidenceScore).toBe(0.88);
    expect(row.recognitionSource).toBe('FACE_AI');
    expect(row.cameraId).toBe('CAM-TEST-01');

    // 3. Verify session totalPresent count in PostgreSQL
    const sessionRows: any[] = await prisma.$queryRaw`
      SELECT "totalPresent" FROM "AttendanceSession" WHERE id = ${testSessionDbId}
    `;
    expect(sessionRows[0].totalPresent).toBe(1);
  });

  it('updates existing record on duplicate HTTP ingestion without creating duplicates in PostgreSQL', async () => {
    const duplicatePayload = {
      sessionId: testSessionId,
      studentId: testStudent.studentId || testStudent.id,
      confidence: 0.96, // updated higher confidence
      method: 'FACE_RECOGNITION',
      status: 'PRESENT',
      cameraId: 'CAM-TEST-02', // updated camera
      studentName: testStudent.fullName,
    };

    // 1. Submit duplicate ingestion through actual HTTP endpoint
    const response = await request(app.getHttpServer())
      .post('/api/attendance/ingest')
      .set('x-api-key', internalApiKey)
      .send(duplicatePayload);

    expect(response.status).toBe(201);

    // 2. Query PostgreSQL with raw SQL to confirm EXACTLY ONE record exists
    const countResult: any[] = await prisma.$queryRaw`
      SELECT count(*)::int as count
      FROM "AttendanceRecord"
      WHERE "sessionId" = ${testSessionDbId} AND "studentId" = ${testStudent.id}
    `;
    expect(countResult[0].count).toBe(1);

    // 3. Query PostgreSQL with raw SQL to confirm in-place update
    const updatedRows: any[] = await prisma.$queryRaw`
      SELECT "confidenceScore", "cameraId"
      FROM "AttendanceRecord"
      WHERE "sessionId" = ${testSessionDbId} AND "studentId" = ${testStudent.id}
    `;
    expect(updatedRows[0].confidenceScore).toBe(0.96);
    expect(updatedRows[0].cameraId).toBe('CAM-TEST-02');

    // 4. Verify totalPresent count remains 1 in PostgreSQL
    const sessionRows: any[] = await prisma.$queryRaw`
      SELECT "totalPresent" FROM "AttendanceSession" WHERE id = ${testSessionDbId}
    `;
    expect(sessionRows[0].totalPresent).toBe(1);
  });
});
