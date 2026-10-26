import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AttendanceService } from '../src/attendance/attendance.service';
import { RoleName } from '../src/_shared/enums/roles';
import type { JwtPayload } from '../src/_shared/types/jwt';

async function runLiveIntegrationTest() {
  console.log('--- STARTING LIVE POSTGRESQL ATTENDANCE INTEGRATION TEST ---');

  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://smartcampus:smartcampus_dev@localhost:5432/smartcampus?schema=public';

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter }) as any;
  await prisma.$connect();
  console.log('✓ Successfully connected Prisma to live PostgreSQL 16');

  const service = new AttendanceService(prisma);

  const testInstitutionId = `inst_test_${Date.now()}`;
  const testUsn = `USN_LIVE_${Date.now()}`;
  let createdSessionId: string | null = null;
  let createdSessionDbId: string | null = null;
  let createdStudentDbId: string | null = null;
  let createdClassroomId: string | null = null;
  let testUserId: string | null = null;

  try {
    // 1. Setup minimal test institution, department, course, and student directly in PostgreSQL
    await pool.query(
      'INSERT INTO "Institution" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, NOW())',
      [testInstitutionId, 'Live Test Institution', `live-test-${Date.now()}`],
    );

    const deptId = `dept_${Date.now()}`;
    await pool.query(
      'INSERT INTO "Department" (id, "institutionId", name, code, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
      [deptId, testInstitutionId, 'Computer Science', `CS_${Date.now()}`],
    );

    const courseId = `course_${Date.now()}`;
    await pool.query(
      'INSERT INTO "Course" (id, "institutionId", "departmentId", name, code, "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [courseId, testInstitutionId, deptId, 'B.Tech CSE', `CSE_${Date.now()}`],
    );

    createdClassroomId = `cr_${Date.now()}`;
    await pool.query(
      'INSERT INTO "Classroom" (id, "institutionId", "departmentId", "roomNumber", capacity, "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [createdClassroomId, testInstitutionId, deptId, '401', 60],
    );

    createdStudentDbId = `stu_${Date.now()}`;
    await pool.query(
      'INSERT INTO "Student" (id, "institutionId", "departmentId", "courseId", "studentId", usn, "rollNumber", "fullName", status, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())',
      [
        createdStudentDbId,
        testInstitutionId,
        deptId,
        courseId,
        testUsn,
        testUsn,
        testUsn,
        'Live Test Student',
        'ACTIVE',
      ],
    );

    testUserId = `usr_${Date.now()}`;
    await pool.query(
      'INSERT INTO "User" (id, "institutionId", "fullName", email, "passwordHash", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [testUserId, testInstitutionId, 'Live Test Teacher', `teacher_${Date.now()}@test.edu`, 'dummyhash123'],
    );

    const teacherEmail = `teacher_${Date.now()}@test.edu`;
    const callerJwt: JwtPayload = {
      id: testUserId,
      sub: testUserId,
      email: teacherEmail,
      institutionId: testInstitutionId,
      roles: [RoleName.TEACHER, RoleName.INSTITUTION_ADMIN],
    };

    // ── CHECK 1: Start Session and Canonical SessionId Propagation ──
    console.log('\n[CHECK 1] Testing session creation and canonical sessionId propagation...');
    const session = await service.startSession(
      {
        institutionId: testInstitutionId,
        classroomId: createdClassroomId,
        subjectName: 'Live Distributed Systems',
        totalStudents: 1,
      },
      callerJwt,
    );

    createdSessionId = session.sessionId;
    createdSessionDbId = session.id;
    console.log(`✓ Session created: DB id=${session.id}, canonical sessionId=${session.sessionId}`);
    if (!session.sessionId.startsWith('SESS_')) {
      throw new Error(`Invalid canonical sessionId format: ${session.sessionId}`);
    }

    // Direct Postgres Query Verification for Session
    const pgSessionRes = await pool.query(
      'SELECT id, "sessionId", "institutionId", status, "totalPresent" FROM "AttendanceSession" WHERE id = $1',
      [session.id],
    );
    console.log('✓ PostgreSQL AttendanceSession record:', pgSessionRes.rows[0]);
    if (pgSessionRes.rows.length !== 1 || pgSessionRes.rows[0].status !== 'ACTIVE') {
      throw new Error('AttendanceSession not found in PostgreSQL or status is not ACTIVE');
    }

    // ── CHECK 2: Attendance Ingestion Persists a Real Record in PostgreSQL ──
    console.log('\n[CHECK 2] Testing initial attendance ingestion via canonical sessionId & USN...');
    const ingestRes1 = await service.ingest(
      {
        sessionId: session.sessionId,
        studentId: testUsn,
        studentName: 'Live Test Student',
        confidence: 0.942,
        cameraId: createdClassroomId,
        method: 'FACE_RECOGNITION',
      },
      callerJwt,
    );
    console.log(`✓ Ingest response record ID: ${ingestRes1.id}`);

    // Direct Postgres Query Verification for AttendanceRecord
    const pgRecordRes1 = await pool.query(
      'SELECT id, "sessionId", "studentId", "statusEnum", confidence, method FROM "AttendanceRecord" WHERE "sessionId" = $1 AND "studentId" = $2',
      [session.id, createdStudentDbId],
    );
    console.log('✓ PostgreSQL AttendanceRecord after initial ingestion:', pgRecordRes1.rows[0]);
    if (pgRecordRes1.rows.length !== 1 || pgRecordRes1.rows[0].statusEnum !== 'PRESENT') {
      throw new Error('AttendanceRecord was not persisted with statusEnum PRESENT in PostgreSQL');
    }

    // Direct Postgres Query Verification for AttendanceSession.totalPresent
    const pgSessionAfterIngest = await pool.query(
      'SELECT "totalPresent" FROM "AttendanceSession" WHERE id = $1',
      [session.id],
    );
    console.log('✓ PostgreSQL AttendanceSession totalPresent after ingestion:', pgSessionAfterIngest.rows[0]);
    if (pgSessionAfterIngest.rows[0].totalPresent !== 1) {
      throw new Error(`Expected totalPresent=1, got ${pgSessionAfterIngest.rows[0].totalPresent}`);
    }

    // ── CHECK 3: Duplicate Ingestion Leaves Exactly One Record in PostgreSQL ──
    console.log('\n[CHECK 3] Testing duplicate ingestion idempotency & unique constraint...');
    const ingestRes2 = await service.ingest(
      {
        sessionId: session.sessionId,
        studentId: testUsn,
        studentName: 'Live Test Student',
        confidence: 0.965,
        cameraId: createdClassroomId,
        method: 'FACE_RECOGNITION',
      },
      callerJwt,
    );
    console.log(`✓ Second ingest response record ID: ${ingestRes2.id}`);

    // Query count of records for (sessionId, studentId)
    const countRes = await pool.query(
      'SELECT COUNT(*)::int as count FROM "AttendanceRecord" WHERE "sessionId" = $1 AND "studentId" = $2',
      [session.id, createdStudentDbId],
    );
    const totalCount = countRes.rows[0].count;
    console.log(`✓ PostgreSQL record count for (sessionId, studentId): ${totalCount}`);
    if (totalCount !== 1) {
      throw new Error(`Duplicate ingestion constraint failed! Expected count=1, got count=${totalCount}`);
    }

    // ── CHECK 4 & 5: Attendance Correction, Audit Entry, and Session Count Recalculation ──
    console.log('\n[CHECK 4 & 5] Testing attendance correction PRESENT -> ABSENT...');
    const recordId = ingestRes1.id;
    const correctionRes1 = await service.correctAttendance(
      recordId,
      { status: 'ABSENT', reason: 'Live integration correction test: absent override' },
      callerJwt,
    );

    console.log('✓ Correction response payload:', {
      success: correctionRes1.success,
      recordId: correctionRes1.record.id,
      status: correctionRes1.record.statusEnum,
      totalPresent: correctionRes1.totalPresent,
    });

    if (correctionRes1.totalPresent !== 0 || correctionRes1.record.statusEnum !== 'ABSENT') {
      throw new Error('Correction response totalPresent or statusEnum incorrect on PRESENT -> ABSENT');
    }

    // Direct Postgres Query Verification for Record status
    const pgRecordAbsent = await pool.query(
      'SELECT "statusEnum", method FROM "AttendanceRecord" WHERE id = $1',
      [recordId],
    );
    console.log('✓ PostgreSQL AttendanceRecord after correction to ABSENT:', pgRecordAbsent.rows[0]);
    if (pgRecordAbsent.rows[0].statusEnum !== 'ABSENT') {
      throw new Error('AttendanceRecord statusEnum was not updated to ABSENT in PostgreSQL');
    }

    // Direct Postgres Query Verification for Audit Record in AttendanceCorrection
    const pgAuditRes = await pool.query(
      'SELECT id, "attendanceRecordId", "oldStatus", "newStatus", reason, "correctedById" FROM "AttendanceCorrection" WHERE "attendanceRecordId" = $1',
      [recordId],
    );
    console.log('✓ PostgreSQL AttendanceCorrection audit log:', pgAuditRes.rows[0]);
    if (
      pgAuditRes.rows.length !== 1 ||
      pgAuditRes.rows[0].oldStatus !== 'PRESENT' ||
      pgAuditRes.rows[0].newStatus !== 'ABSENT'
    ) {
      throw new Error('AttendanceCorrection audit log entry is missing or incorrect in PostgreSQL');
    }

    // Direct Postgres Query Verification for AttendanceSession totalPresent decremented to 0
    const pgSessionAfterAbsent = await pool.query(
      'SELECT "totalPresent" FROM "AttendanceSession" WHERE id = $1',
      [session.id],
    );
    console.log('✓ PostgreSQL AttendanceSession totalPresent after ABSENT correction:', pgSessionAfterAbsent.rows[0]);
    if (pgSessionAfterAbsent.rows[0].totalPresent !== 0) {
      throw new Error(`Expected totalPresent=0 after ABSENT, got ${pgSessionAfterAbsent.rows[0].totalPresent}`);
    }

    // Reverse test: ABSENT -> PRESENT
    console.log('\n[CHECK 4b] Testing attendance correction reversal ABSENT -> PRESENT...');
    const correctionRes2 = await service.correctAttendance(
      recordId,
      { status: 'PRESENT', reason: 'Live integration correction test: present reversal' },
      callerJwt,
    );

    console.log('✓ Reversal correction response payload:', {
      success: correctionRes2.success,
      status: correctionRes2.record.statusEnum,
      totalPresent: correctionRes2.totalPresent,
    });
    if (correctionRes2.totalPresent !== 1 || correctionRes2.record.statusEnum !== 'PRESENT') {
      throw new Error('Correction response totalPresent or statusEnum incorrect on ABSENT -> PRESENT');
    }

    const pgSessionAfterPresent = await pool.query(
      'SELECT "totalPresent" FROM "AttendanceSession" WHERE id = $1',
      [session.id],
    );
    console.log('✓ PostgreSQL AttendanceSession totalPresent after PRESENT reversal:', pgSessionAfterPresent.rows[0]);
    if (pgSessionAfterPresent.rows[0].totalPresent !== 1) {
      throw new Error(`Expected totalPresent=1 after PRESENT reversal, got ${pgSessionAfterPresent.rows[0].totalPresent}`);
    }

    console.log('\n======================================================');
    console.log('✓ ALL TARGETED LIVE POSTGRESQL INTEGRATION CHECKS PASSED');
    console.log('======================================================');
  } finally {
    // Clean up created live integration test entities
    try {
      if (createdSessionDbId) {
        await pool.query('DELETE FROM "AttendanceCorrection" WHERE "attendanceRecordId" IN (SELECT id FROM "AttendanceRecord" WHERE "sessionId" = $1)', [createdSessionDbId]);
        await pool.query('DELETE FROM "AttendanceRecord" WHERE "sessionId" = $1', [createdSessionDbId]);
        await pool.query('DELETE FROM "AttendanceSession" WHERE id = $1', [createdSessionDbId]);
      }
      if (createdStudentDbId) {
        await pool.query('DELETE FROM "Student" WHERE id = $1', [createdStudentDbId]);
      }
      if (createdClassroomId) {
        await pool.query('DELETE FROM "Classroom" WHERE id = $1', [createdClassroomId]);
      }
      if (testUserId) {
        await pool.query('DELETE FROM "User" WHERE id = $1', [testUserId]);
      }
      await pool.query('DELETE FROM "Course" WHERE "institutionId" = $1', [testInstitutionId]);
      await pool.query('DELETE FROM "Department" WHERE "institutionId" = $1', [testInstitutionId]);
      await pool.query('DELETE FROM "Institution" WHERE id = $1', [testInstitutionId]);
      console.log('✓ Test data cleaned up cleanly from PostgreSQL database.');
    } catch (cleanupErr: any) {
      console.warn('Notice during test cleanup:', cleanupErr?.message);
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

runLiveIntegrationTest().catch((err) => {
  console.error('\n❌ LIVE INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
