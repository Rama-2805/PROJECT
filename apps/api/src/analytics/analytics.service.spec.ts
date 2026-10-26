import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    analyticsSnapshot: { findFirst: jest.Mock; findMany: jest.Mock };
    attendanceSession: { findMany: jest.Mock };
    attendanceRecord: { findMany: jest.Mock };
    faceRecognitionEvent: { count: jest.Mock };
    studentRiskProfile: { findMany: jest.Mock; count: jest.Mock };
    aIInsight: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      analyticsSnapshot: { findFirst: jest.fn(), findMany: jest.fn() },
      attendanceSession: { findMany: jest.fn() },
      attendanceRecord: { findMany: jest.fn() },
      faceRecognitionEvent: { count: jest.fn() },
      studentRiskProfile: { findMany: jest.fn(), count: jest.fn() },
      aIInsight: { findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getAttendanceAnalytics', () => {
    it('1. Returns database-backed rate when snapshots are not present', async () => {
      prisma.analyticsSnapshot.findMany.mockResolvedValue([]); // No snapshots
      prisma.attendanceSession.findMany.mockResolvedValue([
        {
          id: 's1',
          startedAt: new Date('2026-10-24T09:00:00Z'),
          totalStudents: 10,
          records: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }], // 3 present
        },
      ]);

      const result = await service.getAttendanceAnalytics({});

      expect(result.dailyTrend.length).toBe(1);
      expect(result.dailyTrend[0].rate).toBe(30.0);
      expect(result.averageRate).toBe(30.0);
    });

    it('2. Distinguishes no data (rate: null) from 0% when no sessions exist', async () => {
      prisma.analyticsSnapshot.findMany.mockResolvedValue([]);
      prisma.attendanceSession.findMany.mockResolvedValue([]);

      const result = await service.getAttendanceAnalytics({});

      expect(result.dailyTrend).toEqual([]);
      expect(result.averageRate).toBeNull();
    });
  });

  describe('getRecognitionAnalytics', () => {
    it('3. Computes genuine database average confidence without Math.random()', async () => {
      prisma.analyticsSnapshot.findMany.mockResolvedValue([]);
      prisma.faceRecognitionEvent.count.mockResolvedValue(50);
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { confidence: 0.92 },
        { confidence: 0.96 },
      ]);

      const result = await service.getRecognitionAnalytics();

      expect(result.averageConfidence).toBe(0.94);
      expect(result.falsePositives).toBe(0);
      expect(result.falseNegatives).toBe(0);
    });
  });

  describe('Tenant Boundary Enforcement', () => {
    it('4. Filters attendance snapshots and fallback sessions by institutionId', async () => {
      prisma.analyticsSnapshot.findMany.mockResolvedValue([]);
      prisma.attendanceSession.findMany.mockResolvedValue([]);

      await service.getAttendanceAnalytics({}, 'inst-123');

      expect(prisma.analyticsSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId: 'inst-123' }),
        }),
      );
      expect(prisma.attendanceSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId: 'inst-123' }),
        }),
      );
    });

    it('5. Filters risk students by institutionId', async () => {
      prisma.studentRiskProfile.findMany.mockResolvedValue([]);
      prisma.studentRiskProfile.count.mockResolvedValue(0);

      await service.getRiskStudents({}, 'inst-xyz');

      expect(prisma.studentRiskProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId: 'inst-xyz' }),
        }),
      );
    });

    it('6. Rejects marking insight read if belonging to a different institution', async () => {
      prisma.aIInsight.findUnique.mockResolvedValue({
        id: 'ins-1',
        institutionId: 'inst-A',
      });

      await expect(
        service.markInsightRead('ins-1', {
          id: 'u1',
          sub: 'u1',
          institutionId: 'inst-B',
          roles: ['INSTITUTION_ADMIN'],
        } as any),
      ).rejects.toThrow('Cross-tenant violation');
    });
  });
});
