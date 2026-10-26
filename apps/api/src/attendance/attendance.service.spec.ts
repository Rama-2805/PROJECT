import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleName } from '../_shared/enums/roles';
import type { JwtPayload } from '../_shared/types/jwt';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    student: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    attendanceSession: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    attendanceRecord: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    attendanceCorrection: { create: jest.Mock };
    classroom: { findFirst: jest.Mock; findUnique: jest.Mock };
    teacher: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockInstitutionId = 'inst-vemana-01';
  const mockOtherInstitutionId = 'inst-other-02';

  const mockSession = {
    id: 'cuid-sess-100',
    sessionId: 'SESS_TEST123',
    institutionId: mockInstitutionId,
    classroomId: 'room-301',
    status: 'ACTIVE',
    totalStudents: 30,
    totalPresent: 0,
    startedAt: new Date('2026-10-25T09:00:00Z'),
  };

  const mockStudent = {
    id: 'cuid-stu-101',
    institutionId: mockInstitutionId,
    studentId: '1VI23CS058',
    usn: '1VI23CS058',
    rollNumber: '23CS058',
    fullName: 'Rahul Sharma',
    email: 'rahul@vemanait.edu.in',
    userId: 'user-stu-1',
    attendancePercentage: 0,
  };

  const mockTeacherUser: JwtPayload = {
    id: 'user-teacher-1',
    sub: 'user-teacher-1',
    email: 'teacher@vemanait.edu.in',
    institutionId: mockInstitutionId,
    roles: [RoleName.TEACHER],
  };

  const mockCrossTenantUser: JwtPayload = {
    id: 'user-other-1',
    sub: 'user-other-1',
    email: 'other@other.edu.in',
    institutionId: mockOtherInstitutionId,
    roles: [RoleName.TEACHER],
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ ...mockStudent, lastAttendanceTime: new Date() }),
      },
      attendanceSession: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      attendanceRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      attendanceCorrection: {
        create: jest.fn(),
      },
      classroom: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      teacher: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('Student USN-to-internal-ID resolution and Session validation', () => {
    it('1. Resolves student using USN to internal database student.id and persists attendance', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession);
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.upsert.mockResolvedValue({
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        studentName: mockStudent.fullName,
        confidence: 0.94,
        confidenceScore: 0.94,
        statusEnum: 'PRESENT',
        recognitionSource: 'FACE_AI',
      });
      prisma.attendanceRecord.count.mockResolvedValue(1);
      prisma.attendanceSession.update.mockResolvedValue({ ...mockSession, totalPresent: 1 });

      const result = await service.ingest({
        sessionId: mockSession.sessionId,
        studentId: '1VI23CS058', // USN
        confidence: 0.94,
      });

      expect(prisma.student.findFirst).toHaveBeenCalledWith({
        where: {
          institutionId: mockSession.institutionId,
          OR: [
            { id: '1VI23CS058' },
            { studentId: '1VI23CS058' },
            { usn: '1VI23CS058' },
            { rollNumber: '1VI23CS058' },
          ],
        },
      });
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionId_studentId: {
              sessionId: mockSession.id,
              studentId: mockStudent.id,
            },
          },
        }),
      );
      expect(result.studentId).toBe(mockStudent.id);
    });

    it('2. Resolves student using rollNumber or internal cuid', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession);
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.upsert.mockResolvedValue({
        id: 'rec-002',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
      });
      prisma.attendanceRecord.count.mockResolvedValue(1);
      prisma.attendanceSession.update.mockResolvedValue({ ...mockSession, totalPresent: 1 });

      const result = await service.ingest({
        sessionId: mockSession.id,
        studentId: '23CS058', // rollNumber
        confidence: 0.91,
      });

      expect(result.studentId).toBe(mockStudent.id);
    });

    it('3. Rejects invalid session with NotFoundException', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(null);

      await expect(
        service.ingest({
          sessionId: 'NON_EXISTENT_SESSION',
          studentId: '1VI23CS058',
          confidence: 0.9,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('4. Rejects cancelled session with BadRequestException', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue({
        ...mockSession,
        status: 'CANCELLED',
      });

      await expect(
        service.ingest({
          sessionId: mockSession.sessionId,
          studentId: '1VI23CS058',
          confidence: 0.9,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. Rejects student if student does not exist in the session institution', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession);
      prisma.student.findFirst.mockResolvedValue(null); // Not found in this institution

      await expect(
        service.ingest({
          sessionId: mockSession.sessionId,
          studentId: 'FOREIGN_STUDENT_USN',
          confidence: 0.9,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('5b. Rejects ingest attempt when caller belongs to a different institution than the session', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession); // session in inst-vemana-01

      await expect(
        service.ingest(
          {
            sessionId: mockSession.sessionId,
            studentId: '1VI23CS058',
            confidence: 0.9,
          },
          mockCrossTenantUser, // caller in inst-other-02
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('5c. Rejects getLiveStatus when session belongs to a different institution than caller', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession); // session in inst-vemana-01

      await expect(
        service.getLiveStatus(mockSession.sessionId, mockCrossTenantUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Attendance Data Integrity: Idempotency, Concurrency, and Failure Handling', () => {
    it('6. Ensures duplicate and concurrent requests are safely handled via atomic upsert', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession);
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.upsert.mockResolvedValue({
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        statusEnum: 'PRESENT',
      });
      prisma.attendanceRecord.count.mockResolvedValue(1);
      prisma.attendanceSession.update.mockResolvedValue({ ...mockSession, totalPresent: 1 });

      // Run two concurrent requests
      const [res1, res2] = await Promise.all([
        service.ingest({
          sessionId: mockSession.sessionId,
          studentId: '1VI23CS058',
          confidence: 0.88,
        }),
        service.ingest({
          sessionId: mockSession.sessionId,
          studentId: '1VI23CS058',
          confidence: 0.95,
        }),
      ]);

      expect(prisma.attendanceRecord.upsert).toHaveBeenCalledTimes(2);
      expect(res1.id).toBe('rec-001');
      expect(res2.id).toBe('rec-001');
    });

    it('7. Propagates persistence failures without false confirmation', async () => {
      prisma.attendanceSession.findFirst.mockResolvedValue(mockSession);
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.upsert.mockRejectedValue(
        new Error('DB Connection Timeout'),
      );

      await expect(
        service.ingest({
          sessionId: mockSession.sessionId,
          studentId: '1VI23CS058',
          confidence: 0.9,
        }),
      ).rejects.toThrow('DB Connection Timeout');
    });
  });

  describe('Attendance Correction and Audit Trail', () => {
    it('8. Successfully records attendance correction and updates session totalPresent', async () => {
      const mockRecord = {
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        statusEnum: 'PRESENT',
        session: mockSession,
      };

      prisma.attendanceRecord.findUnique.mockResolvedValue(mockRecord);
      const correctionObj = {
        id: 'corr-001',
        attendanceRecordId: 'rec-001',
        oldStatus: 'PRESENT',
        newStatus: 'LATE',
      };
      const updatedRecord = { ...mockRecord, statusEnum: 'LATE', method: 'MANUAL' };

      prisma.$transaction.mockResolvedValue([correctionObj, updatedRecord]);
      prisma.attendanceRecord.count.mockResolvedValue(1);
      prisma.attendanceSession.update.mockResolvedValue({ ...mockSession, totalPresent: 1 });

      const result = await service.correctAttendance(
        'rec-001',
        { status: 'LATE', reason: 'Verified arrived 15 mins late' },
        mockTeacherUser,
      );

      expect(result.success).toBe(true);
      expect(result.record.statusEnum).toBe('LATE');
      expect(result.totalPresent).toBe(1);
    });

    it('9. Rejects cross-tenant attendance correction', async () => {
      const mockRecord = {
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        statusEnum: 'PRESENT',
        session: mockSession, // institutionId is inst-vemana-01
      };

      prisma.attendanceRecord.findUnique.mockResolvedValue(mockRecord);

      await expect(
        service.correctAttendance(
          'rec-001',
          { status: 'ABSENT' },
          mockCrossTenantUser, // institutionId is inst-other-02
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('10. Rejects invalid status for correction', async () => {
      const mockRecord = {
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        statusEnum: 'PRESENT',
        session: mockSession,
      };

      prisma.attendanceRecord.findUnique.mockResolvedValue(mockRecord);

      await expect(
        service.correctAttendance(
          'rec-001',
          { status: 'INVALID_STATUS' as any },
          mockTeacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('10b. Decrements totalPresent when correcting from PRESENT to ABSENT', async () => {
      const mockRecord = {
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        statusEnum: 'PRESENT',
        session: mockSession,
      };

      prisma.attendanceRecord.findUnique.mockResolvedValue(mockRecord);
      const correctionObj = {
        id: 'corr-002',
        attendanceRecordId: 'rec-001',
        oldStatus: 'PRESENT',
        newStatus: 'ABSENT',
      };
      const updatedRecord = { ...mockRecord, statusEnum: 'ABSENT', method: 'MANUAL' };

      prisma.$transaction.mockResolvedValue([correctionObj, updatedRecord]);
      // When record becomes ABSENT, count of PRESENT + LATE in session drops to 0
      prisma.attendanceRecord.count.mockResolvedValue(0);
      prisma.attendanceSession.update.mockResolvedValue({ ...mockSession, totalPresent: 0 });

      const result = await service.correctAttendance(
        'rec-001',
        { status: 'ABSENT', reason: 'Student marked by error' },
        mockTeacherUser,
      );

      expect(prisma.attendanceRecord.count).toHaveBeenCalledWith({
        where: {
          sessionId: mockSession.id,
          statusEnum: { in: ['PRESENT', 'LATE'] },
        },
      });
      expect(prisma.attendanceSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: { totalPresent: 0 },
      });
      expect(result.record.statusEnum).toBe('ABSENT');
      expect(result.totalPresent).toBe(0);
    });

    it('10c. Increments totalPresent when correcting from ABSENT to PRESENT', async () => {
      const mockRecord = {
        id: 'rec-001',
        sessionId: mockSession.id,
        studentId: mockStudent.id,
        statusEnum: 'ABSENT',
        session: mockSession,
      };

      prisma.attendanceRecord.findUnique.mockResolvedValue(mockRecord);
      const correctionObj = {
        id: 'corr-003',
        attendanceRecordId: 'rec-001',
        oldStatus: 'ABSENT',
        newStatus: 'PRESENT',
      };
      const updatedRecord = { ...mockRecord, statusEnum: 'PRESENT', method: 'MANUAL' };

      prisma.$transaction.mockResolvedValue([correctionObj, updatedRecord]);
      prisma.attendanceRecord.count.mockResolvedValue(1);
      prisma.attendanceSession.update.mockResolvedValue({ ...mockSession, totalPresent: 1 });

      const result = await service.correctAttendance(
        'rec-001',
        { status: 'PRESENT', reason: 'Manual override by teacher' },
        mockTeacherUser,
      );

      expect(prisma.attendanceSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: { totalPresent: 1 },
      });
      expect(result.record.statusEnum).toBe('PRESENT');
      expect(result.totalPresent).toBe(1);
    });
  });

  describe('Attendance Analytics and Student History', () => {
    it('11. Calculates attendance rate from attended sessions / eligible conducted sessions', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { sessionId: 'sess-1', statusEnum: 'PRESENT', confidence: 0.95 },
        { sessionId: 'sess-2', statusEnum: 'LATE', confidence: 0.89 },
      ]);
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', status: 'ENDED' },
        { id: 'sess-2', status: 'ENDED' },
        { id: 'sess-3', status: 'ENDED' },
        { id: 'sess-4', status: 'ENDED' },
      ]);

      const analytics = await service.getStudentAnalytics('1VI23CS058', mockTeacherUser);

      expect(analytics.attendedSessions).toBe(2);
      expect(analytics.totalEligibleSessions).toBe(4);
      expect(analytics.attendanceRate).toBe(50.0);
      expect(analytics.biometricConfidenceAverage).toBe(0.92);
    });

    it('12. Distinguishes no conducted sessions (rate: null) from 0% attendance', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      prisma.attendanceSession.findMany.mockResolvedValue([]); // 0 sessions conducted

      const analytics = await service.getStudentAnalytics('1VI23CS058', mockTeacherUser);

      expect(analytics.totalEligibleSessions).toBe(0);
      expect(analytics.attendanceRate).toBeNull(); // Correctly null, not 0%
    });

    it('13. Correctly calculates 0% attendance when sessions were conducted but none attended', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      prisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-1', status: 'ENDED' },
        { id: 'sess-2', status: 'ENDED' },
      ]);

      const analytics = await service.getStudentAnalytics('1VI23CS058', mockTeacherUser);

      expect(analytics.totalEligibleSessions).toBe(2);
      expect(analytics.attendedSessions).toBe(0);
      expect(analytics.attendanceRate).toBe(0.0);
    });

    it('14. Enforces student authorization: student cannot view another student analytics', async () => {
      prisma.student.findFirst.mockResolvedValue({
        ...mockStudent,
        id: 'cuid-stu-102',
        userId: 'other-user-id',
        email: 'other@vemanait.edu.in',
      });

      const studentUser: JwtPayload = {
        id: 'user-stu-my-id',
        sub: 'user-stu-my-id',
        email: 'mystudent@vemanait.edu.in',
        institutionId: mockInstitutionId,
        roles: [RoleName.STUDENT],
      };

      await expect(
        service.getStudentAnalytics('cuid-stu-102', studentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
