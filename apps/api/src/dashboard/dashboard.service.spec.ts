import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService - getBehaviorAnalytics', () => {
  let service: DashboardService;
  let prisma: {
    engagementRecord: { aggregate: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    behaviorEvent: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    behaviorAlert: { findMany: jest.Mock };
    student: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      engagementRecord: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      behaviorEvent: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      behaviorAlert: {
        findMany: jest.fn(),
      },
      student: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('1. Returns empty-data state cleanly when no behavior records exist in database', async () => {
    prisma.engagementRecord.aggregate.mockResolvedValue({
      _avg: { score: null, attentionScore: null },
      _count: 0,
    });
    prisma.behaviorEvent.count.mockResolvedValue(0);
    prisma.behaviorEvent.groupBy.mockResolvedValue([]);
    prisma.behaviorAlert.findMany.mockResolvedValue([]);
    prisma.behaviorEvent.findMany.mockResolvedValue([]);
    prisma.engagementRecord.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockResolvedValue([]);

    const result = await service.getBehaviorAnalytics();

    expect(result.overview.averageEngagement).toBe(0);
    expect(result.overview.phoneEvents).toBe(0);
    expect(result.overview.attentionLevel).toBe(0);
    expect(result.overview.highRiskStudents).toBe(0);
    expect(result.engagement_trend).toEqual([]);
    expect(result.behavior_distribution).toEqual([]);
    expect(result.student_ranking).toEqual([]);
    expect(result.recent_alerts).toEqual([]);
  });

  it('2. Correctly aggregates real persisted engagement records and formats trend', async () => {
    prisma.engagementRecord.aggregate.mockResolvedValue({
      _avg: { score: 82.4, attentionScore: 89.0 },
      _count: 10,
    });
    prisma.behaviorEvent.count.mockResolvedValue(3);
    prisma.behaviorEvent.groupBy.mockResolvedValue([
      { behaviorType: 'ATTENTIVE', _count: 7 },
      { behaviorType: 'PHONE_USAGE', _count: 3 },
    ]);
    prisma.behaviorAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        studentId: 'stu-1',
        title: 'Mobile Phone Usage: Alice',
        description: 'Sustained phone usage',
        severity: 'WARNING',
        confidence: 0.88,
        status: 'ACTIVE',
        acknowledgedBy: null,
        createdAt: new Date('2026-10-25T10:00:00Z'),
      },
    ]);
    prisma.behaviorEvent.findMany.mockResolvedValue([]);
    prisma.engagementRecord.findMany.mockResolvedValue([
      {
        score: 85,
        timestamp: new Date('2026-10-25T10:05:00Z'),
        studentId: 'stu-1',
      },
      {
        score: 90,
        timestamp: new Date('2026-10-25T10:10:00Z'),
        studentId: 'stu-1',
      },
    ]);
    prisma.student.findMany.mockResolvedValue([
      { id: 'stu-1', fullName: 'Alice Johnson', usn: '1VI23CS001' },
    ]);

    const result = await service.getBehaviorAnalytics();

    expect(result.overview.averageEngagement).toBe(82.4);
    expect(result.overview.attentionLevel).toBe(89);
    expect(result.overview.phoneEvents).toBe(3);
    expect(result.engagement_trend.length).toBe(2);
    expect(result.behavior_distribution).toEqual([
      { type: 'ATTENTIVE', count: 7 },
      { type: 'PHONE_USAGE', count: 3 },
    ]);
    expect(result.student_ranking[0]).toEqual({
      studentId: 'stu-1',
      studentName: 'Alice Johnson',
      score: 88,
    });
  });

  it('3. Strictly anonymizes sleeping alerts and excludes anonymous TRK- from rankings', async () => {
    prisma.engagementRecord.aggregate.mockResolvedValue({
      _avg: { score: 70, attentionScore: 70 },
      _count: 5,
    });
    prisma.behaviorEvent.count.mockResolvedValue(1);
    prisma.behaviorEvent.groupBy.mockResolvedValue([]);
    prisma.behaviorAlert.findMany.mockResolvedValue([
      {
        id: 'alert-sleep-1',
        studentId: 'stu-sensitive-id',
        title: 'Probable Sleeping — TRK-007',
        description: 'Sustained sleeping posture observed',
        severity: 'CRITICAL',
        confidence: 0.92,
        status: 'ACTIVE',
        acknowledgedBy: null,
        createdAt: new Date(),
      },
    ]);
    prisma.behaviorEvent.findMany.mockResolvedValue([]);
    prisma.engagementRecord.findMany.mockResolvedValue([
      { score: 65, timestamp: new Date(), studentId: 'TRK-007' },
    ]);
    prisma.student.findMany.mockResolvedValue([]);

    const result = await service.getBehaviorAnalytics();

    // 1. Sleeping alert has null student_id and anonymous title as name
    expect(result.recent_alerts[0].student_id).toBeNull();
    expect(result.recent_alerts[0].student_name).toContain('Probable Sleeping');

    // 2. Anonymous TRK-007 track is omitted from named student ranking
    expect(result.student_ranking).toEqual([]);
  });
});
