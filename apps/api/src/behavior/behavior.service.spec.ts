import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorService } from './behavior.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResolveBehaviorDto } from './behavior.dto';

describe('BehaviorService - Resolve Endpoint', () => {
  let service: BehaviorService;
  let prisma: {
    student: { findFirst: jest.Mock };
    attendanceSession: { findFirst: jest.Mock };
    engagementRecord: { create: jest.Mock; findMany: jest.Mock };
    behaviorEvent: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    behaviorAlert: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      student: {
        findFirst: jest.fn(),
      },
      attendanceSession: {
        findFirst: jest.fn(),
      },
      engagementRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      behaviorEvent: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'bev-1', duration: 15 }),
      },
      behaviorAlert: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehaviorService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BehaviorService>(BehaviorService);
  });

  describe('resolve', () => {
    it('1. Successfully resolves an existing active episode by eventId', async () => {
      const activeAlert = {
        id: 'alert-1',
        behaviorEventId: 'event-1',
        studentId: 'student-1',
        severity: 'WARNING',
        title: '[Section A] Mobile Phone Usage',
        description: 'Sustained phone usage observed',
        confidence: 0.9,
        status: 'ACTIVE',
      };

      prisma.behaviorAlert.findFirst.mockResolvedValue(activeAlert);
      prisma.behaviorAlert.update.mockResolvedValue({
        ...activeAlert,
        status: 'RESOLVED',
        description: 'Sustained phone usage observed (Resolved: evidence_cleared)',
      });

      const dto: ResolveBehaviorDto = {
        eventId: 'event-1',
        eventType: 'PHONE_USAGE',
        trackId: '10',
        duration: 12.5,
        status: 'RESOLVED',
        metadata: { resolution: 'evidence_cleared' },
      };

      const result = await service.resolve(dto);

      expect(result.success).toBe(true);
      expect(result.resolved).toBe(true);
      expect(result.alert.status).toBe('RESOLVED');
      expect(prisma.behaviorAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          status: 'RESOLVED',
          description: 'Sustained phone usage observed (Resolved: evidence_cleared)',
        },
      });
    });

    it('2. Idempotently returns already-resolved status if episode was previously resolved', async () => {
      const alreadyResolvedAlert = {
        id: 'alert-1',
        behaviorEventId: 'event-1',
        studentId: 'student-1',
        severity: 'WARNING',
        title: '[Section A] Mobile Phone Usage',
        description: 'Resolved: evidence_cleared',
        status: 'RESOLVED',
      };

      prisma.behaviorAlert.findFirst.mockResolvedValue(alreadyResolvedAlert);

      const dto: ResolveBehaviorDto = {
        eventId: 'event-1',
        status: 'RESOLVED',
      };

      const result = await service.resolve(dto);

      expect(result.success).toBe(true);
      expect(result.resolved).toBe(true);
      expect(result.alreadyResolved).toBe(true);
      expect(prisma.behaviorAlert.update).not.toHaveBeenCalled();
    });

    it('3. Successfully resolves by explicit alertId', async () => {
      const activeAlert = {
        id: 'alert-xyz',
        behaviorEventId: 'event-xyz',
        status: 'ACTIVE',
        description: 'Sleeping alert',
      };

      prisma.behaviorAlert.findUnique.mockResolvedValue(activeAlert);
      prisma.behaviorAlert.update.mockResolvedValue({
        ...activeAlert,
        status: 'RESOLVED',
        description: 'Sleeping alert (Resolved: session_stopped)',
      });

      const dto: ResolveBehaviorDto = {
        alertId: 'alert-xyz',
        metadata: { resolution: 'session_stopped' },
      };

      const result = await service.resolve(dto);

      expect(result.success).toBe(true);
      expect(result.resolved).toBe(true);
      expect(result.alert.status).toBe('RESOLVED');
      expect(prisma.behaviorAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-xyz' },
        data: {
          status: 'RESOLVED',
          description: 'Sleeping alert (Resolved: session_stopped)',
        },
      });
    });

    it('4. Handles unknown or non-existent episode identifiers gracefully', async () => {
      prisma.behaviorAlert.findFirst.mockResolvedValue(null);
      prisma.behaviorEvent.findFirst.mockResolvedValue(null);
      prisma.behaviorAlert.findMany.mockResolvedValue([]);

      const dto: ResolveBehaviorDto = {
        eventId: 'unknown-bev-999',
        eventType: 'PHONE_USAGE',
      };

      const result = await service.resolve(dto);

      expect(result.success).toBe(true);
      expect(result.resolved).toBe(false);
      expect(result.message).toContain('No active behavioral alert found');
      expect(prisma.behaviorAlert.update).not.toHaveBeenCalled();
    });

    it('5. Successfully resolves via studentId and behaviorType match when eventId is missing', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'student-uuid-1', usn: '1VI23CS058' });
      prisma.behaviorAlert.findFirst.mockResolvedValue(null);
      prisma.behaviorAlert.findMany.mockResolvedValue([
        {
          id: 'alert-student-1',
          studentId: 'student-uuid-1',
          title: '[Section A] 📱 Mobile Phone Usage: John Doe',
          status: 'ACTIVE',
        },
      ]);
      prisma.behaviorAlert.update.mockResolvedValue({
        id: 'alert-student-1',
        status: 'RESOLVED',
      });

      const dto: ResolveBehaviorDto = {
        studentId: '1VI23CS058',
        behaviorType: 'PHONE_USAGE',
        metadata: { resolution: 'evidence_cleared' },
      };

      const result = await service.resolve(dto);

      expect(result.success).toBe(true);
      expect(result.resolved).toBe(true);
      expect(prisma.behaviorAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-student-1' },
        data: expect.objectContaining({ status: 'RESOLVED' }),
      });
    });

    it('6. Handles database update exceptions gracefully by rejecting promise', async () => {
      const activeAlert = { id: 'alert-err', status: 'ACTIVE' };
      prisma.behaviorAlert.findUnique.mockResolvedValue(activeAlert);
      prisma.behaviorAlert.update.mockRejectedValue(new Error('Database connection failed'));

      const dto: ResolveBehaviorDto = { alertId: 'alert-err' };

      await expect(service.resolve(dto)).rejects.toThrow('Database connection failed');
    });

    it('7. Repeated requests for same active event produce identical resolution without duplicate records', async () => {
      const alert = { id: 'alert-dup', status: 'ACTIVE' };
      prisma.behaviorAlert.findUnique.mockResolvedValueOnce(alert);
      prisma.behaviorAlert.update.mockResolvedValueOnce({ ...alert, status: 'RESOLVED' });

      const dto: ResolveBehaviorDto = { alertId: 'alert-dup' };

      // First call
      const res1 = await service.resolve(dto);
      expect(res1.resolved).toBe(true);
      expect(res1.alreadyResolved).toBeUndefined();

      // Second call returns alreadyResolved
      prisma.behaviorAlert.findUnique.mockResolvedValueOnce({ ...alert, status: 'RESOLVED' });
      const res2 = await service.resolve(dto);
      expect(res2.resolved).toBe(true);
      expect(res2.alreadyResolved).toBe(true);
      expect(prisma.behaviorAlert.create).not.toHaveBeenCalled();
    });
  });

  describe('recordEngagement', () => {
    it('1. Resolves verified student USN to Student.id and session ID to AttendanceSession.sessionId', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 'stu-db-uuid-1', usn: '1VI23CS058' });
      prisma.attendanceSession.findFirst.mockResolvedValue({ id: 'sess-cuid', sessionId: 'SESS_CS101_1729834800' });
      prisma.engagementRecord.create.mockResolvedValue({
        id: 'eng-rec-1',
        studentId: 'stu-db-uuid-1',
        sessionId: 'SESS_CS101_1729834800',
        score: 88.5,
        level: 'HIGH_ENGAGEMENT',
        attentionScore: 92.0,
        postureScore: 95.0,
        phonePenalty: 0.0,
        activityScore: 85.0,
      });

      const res = await service.recordEngagement({
        studentId: '1VI23CS058',
        sessionId: 'SESS_CS101_1729834800',
        score: 88.5,
        level: 'HIGH_ENGAGEMENT',
        attentionScore: 92.0,
        postureScore: 95.0,
        phonePenalty: 0.0,
        activityScore: 85.0,
      });

      expect(prisma.student.findFirst).toHaveBeenCalled();
      expect(prisma.attendanceSession.findFirst).toHaveBeenCalled();
      expect(prisma.engagementRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'stu-db-uuid-1',
          sessionId: 'SESS_CS101_1729834800',
          score: 88.5,
          level: 'HIGH_ENGAGEMENT',
        }),
      });
      expect(res.id).toBe('eng-rec-1');
    });

    it('2. Never queries student table for anonymous TRK- identifier (privacy safeguard)', async () => {
      prisma.engagementRecord.create.mockResolvedValue({
        id: 'eng-rec-anon',
        studentId: 'TRK-14',
        sessionId: 'SESS_CS101_1729834800',
        score: 75.0,
        level: 'MODERATE_ENGAGEMENT',
      });

      const res = await service.recordEngagement({
        studentId: 'TRK-14',
        sessionId: 'SESS_CS101_1729834800',
        score: 75.0,
        level: 'MODERATE_ENGAGEMENT',
      });

      expect(prisma.student.findFirst).not.toHaveBeenCalled();
      expect(prisma.engagementRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'TRK-14',
        }),
      });
      expect(res.studentId).toBe('TRK-14');
    });

    it('3. Handles unresolvable student or session gracefully by preserving original identifiers', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.attendanceSession.findFirst.mockResolvedValue(null);
      prisma.engagementRecord.create.mockResolvedValue({
        id: 'eng-rec-unknown',
        studentId: 'UNKNOWN_STU',
        sessionId: 'SESS_UNKNOWN',
        score: 60.0,
        level: 'MODERATE_ENGAGEMENT',
      });

      const res = await service.recordEngagement({
        studentId: 'UNKNOWN_STU',
        sessionId: 'SESS_UNKNOWN',
        score: 60.0,
        level: 'MODERATE_ENGAGEMENT',
      });

      expect(prisma.engagementRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'UNKNOWN_STU',
          sessionId: 'SESS_UNKNOWN',
        }),
      });
      expect(res.id).toBe('eng-rec-unknown');
    });

    it('4. Rejects cleanly when Prisma database creation fails', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.engagementRecord.create.mockRejectedValue(new Error('Prisma connection timeout'));

      await expect(
        service.recordEngagement({
          studentId: 'STU_1001',
          score: 80.0,
          level: 'HIGH_ENGAGEMENT',
        }),
      ).rejects.toThrow('Prisma connection timeout');
    });
  });
});
