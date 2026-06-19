import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IngestBehaviorDto, BehaviorQueryDto, AcknowledgeAlertDto, CreateEngagementRecordDto } from "./behavior.dto";

@Injectable()
export class BehaviorService {
  constructor(private prisma: PrismaService) {}

  async ingest(dto: IngestBehaviorDto) {
    return this.prisma.behaviorEvent.create({
      data: {
        studentId: dto.studentId,
        sessionId: dto.sessionId,
        behaviorType: dto.behaviorType,
        confidence: dto.confidence,
        duration: dto.duration || 0,
        classroomId: dto.classroomId,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
      },
    });
  }

  async queryEvents(query: BehaviorQueryDto) {
    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.behaviorType) where.behaviorType = query.behaviorType;
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.fromDate) where.createdAt = { ...where.createdAt, gte: new Date(query.fromDate) };
    if (query.toDate) where.createdAt = { ...where.createdAt, lte: new Date(query.toDate) };

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.behaviorEvent.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.behaviorEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStudentBehavior(studentId: string) {
    const events = await this.prisma.behaviorEvent.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const engagement = await this.prisma.engagementRecord.findMany({
      where: { studentId },
      orderBy: { timestamp: "desc" },
      take: 20,
    });
    return { events, engagement };
  }

  async getAnalytics() {
    const [totalEvents, behaviorDistribution, engagementSummary] = await Promise.all([
      this.prisma.behaviorEvent.count(),
      this.prisma.behaviorEvent.groupBy({
        by: ["behaviorType"],
        _count: true,
        orderBy: { _count: { behaviorType: "desc" } },
      }),
      this.prisma.engagementRecord.aggregate({
        _avg: { score: true },
        _max: { score: true },
        _min: { score: true },
      }),
    ]);

    return {
      totalEvents,
      behaviorDistribution: behaviorDistribution.map((b) => ({
        type: b.behaviorType,
        count: b._count,
      })),
      averageEngagement: engagementSummary._avg.score || 0,
      maxEngagement: engagementSummary._max.score || 0,
      minEngagement: engagementSummary._min.score || 0,
    };
  }

  async getAlerts(severity?: string) {
    const where: any = { status: "ACTIVE" };
    if (severity) where.severity = severity;

    return this.prisma.behaviorAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async acknowledgeAlert(alertId: string, dto: AcknowledgeAlertDto) {
    const alert = await this.prisma.behaviorAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) throw new NotFoundException("Alert not found");

    return this.prisma.behaviorAlert.update({
      where: { id: alertId },
      data: { status: "ACKNOWLEDGED", acknowledgedBy: dto.acknowledgedBy },
    });
  }

  async dismissAlert(alertId: string) {
    const alert = await this.prisma.behaviorAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) throw new NotFoundException("Alert not found");

    return this.prisma.behaviorAlert.update({
      where: { id: alertId },
      data: { status: "DISMISSED" },
    });
  }

  async recordEngagement(dto: CreateEngagementRecordDto) {
    return this.prisma.engagementRecord.create({
      data: {
        studentId: dto.studentId,
        sessionId: dto.sessionId,
        score: dto.score,
        level: dto.level,
        attentionScore: dto.attentionScore,
        postureScore: dto.postureScore,
        phonePenalty: dto.phonePenalty,
        activityScore: dto.activityScore,
      },
    });
  }

  async getEngagementTrend(sessionId?: string) {
    const where: any = {};
    if (sessionId) where.sessionId = sessionId;

    return this.prisma.engagementRecord.findMany({
      where,
      orderBy: { timestamp: "asc" },
      take: 100,
    });
  }
}
