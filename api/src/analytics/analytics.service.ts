import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AttendanceAnalyticsQueryDto, StudentRiskQueryDto } from "./analytics.dto";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};

    // Get latest snapshot
    const latestSnapshot = await this.prisma.analyticsSnapshot.findFirst({
      where,
      orderBy: { date: "desc" },
    });

    // Get insights
    const recentInsights = await this.prisma.aIInsight.findMany({
      where: { ...where, isRead: false },
      orderBy: { generatedAt: "desc" },
      take: 10,
    });

    // Get risk student counts
    const riskCounts = await Promise.all([
      this.prisma.studentRiskProfile.count({ where: { ...where, riskLevel: "CRITICAL" } }),
      this.prisma.studentRiskProfile.count({ where: { ...where, riskLevel: "HIGH" } }),
      this.prisma.studentRiskProfile.count({ where: { ...where, riskLevel: "MEDIUM" } }),
      this.prisma.studentRiskProfile.count({ where: { ...where, riskLevel: "LOW" } }),
    ]);

    // Department rankings
    const departmentRankings = await this.prisma.departmentAnalytics.findMany({
      where,
      orderBy: { performanceScore: "desc" },
      take: 10,
    });

    // Snapshot history for trends
    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { date: "asc" },
      take: 30,
    });

    return {
      snapshot: latestSnapshot,
      snapshots,
      recentInsights,
      riskDistribution: {
        critical: riskCounts[0],
        high: riskCounts[1],
        medium: riskCounts[2],
        low: riskCounts[3],
      },
      departmentRankings,
    };
  }

  async getAttendanceAnalytics(query: AttendanceAnalyticsQueryDto) {
    const where: any = {};
    if (query.fromDate) where.date = { ...where.date, gte: new Date(query.fromDate) };
    if (query.toDate) where.date = { ...where.date, lte: new Date(query.toDate) };

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return {
      dailyTrend: snapshots.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        rate: s.attendanceRate,
        present: s.presentToday,
        total: s.totalStudents,
      })),
      averageRate: snapshots.length > 0
        ? snapshots.reduce((s, snap) => s + snap.attendanceRate, 0) / snapshots.length
        : 0,
    };
  }

  async getBehaviorAnalytics(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { date: "desc" },
      take: 30,
    });

    const totalPhoneEvents = snapshots.reduce((s, snap) => s + snap.phoneEvents, 0);
    const totalAlerts = snapshots.reduce((s, snap) => s + snap.behaviorAlerts, 0);
    const avgEngagement = snapshots.length > 0
      ? snapshots.reduce((s, snap) => s + snap.averageEngagement, 0) / snapshots.length
      : 0;

    return {
      totalPhoneEvents,
      totalBehaviorAlerts: totalAlerts,
      averageEngagement: avgEngagement,
      trend: snapshots.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        engagement: s.averageEngagement,
        phoneEvents: s.phoneEvents,
        alerts: s.behaviorAlerts,
      })),
    };
  }

  async getRiskStudents(query: StudentRiskQueryDto) {
    const where: any = {};
    if (query.riskLevel) where.riskLevel = query.riskLevel;
    if (query.minScore) where.overallRisk = { gte: query.minScore };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      this.prisma.studentRiskProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { overallRisk: "desc" },
      }),
      this.prisma.studentRiskProfile.count({ where }),
    ]);

    return { students, total, page, limit };
  }

  async getDepartmentStats(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};

    const departments = await this.prisma.departmentAnalytics.findMany({
      where,
      orderBy: { performanceScore: "desc" },
    });

    return {
      departments,
      topPerformer: departments[0] || null,
      needsAttention: departments.filter((d) => d.performanceScore < 60),
    };
  }

  async getAIPerformance(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { date: "desc" },
      take: 30,
    });

    const avgAccuracy = snapshots.length > 0
      ? snapshots.reduce((s, snap) => s + snap.aiAccuracy, 0) / snapshots.length
      : 0;

    return {
      currentAccuracy: snapshots[0]?.aiAccuracy || 0,
      averageAccuracy: avgAccuracy,
      accuracyTrend: snapshots.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        accuracy: s.aiAccuracy,
      })),
    };
  }

  async getDeviceAnalytics(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { date: "desc" },
      take: 30,
    });

    const latest = snapshots[0];

    return {
      activeDevices: latest?.activeDevices || 0,
      totalDevices: latest?.totalDevices || 0,
      deviceHealthRate: latest?.totalDevices ? (latest.activeDevices / latest.totalDevices) * 100 : 0,
      trend: snapshots.map((s) => ({
        date: s.date.toISOString().split("T")[0],
        active: s.activeDevices,
        total: s.totalDevices,
      })),
    };
  }

  async getInsights(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};

    return this.prisma.aIInsight.findMany({
      where: { ...where, isRead: false },
      orderBy: { severity: "asc" },
      take: 20,
    });
  }

  async markInsightRead(insightId: string) {
    return this.prisma.aIInsight.update({
      where: { id: insightId },
      data: { isRead: true },
    });
  }
}
