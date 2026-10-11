import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IngestBehaviorDto, BehaviorQueryDto, AcknowledgeAlertDto, CreateEngagementRecordDto } from "./behavior.dto";

@Injectable()
export class BehaviorService {
  constructor(private prisma: PrismaService) {}

  async ingest(dto: IngestBehaviorDto) {
    let student = null;
    if (dto.studentId) {
      student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { id: dto.studentId },
            { usn: dto.studentId },
            { rollNumber: dto.studentId },
          ],
        },
      });
    }

    const resolvedStudentId = student?.id || null;

    const event = await this.prisma.behaviorEvent.create({
      data: {
        studentId: resolvedStudentId,
        sessionId: dto.sessionId,
        behaviorType: dto.behaviorType,
        confidence: dto.confidence,
        duration: dto.duration || 0,
        classroomId: dto.classroomId,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
      },
    });

    const alertableTypes = ["PHONE_USAGE", "SLEEPING", "POSSIBLE_SLEEPING_POSTURE", "INACTIVE", "DISTRACTED", "ABSENT_FROM_SEAT"];
    if (alertableTypes.includes(dto.behaviorType)) {
      const studentName = student?.fullName || dto.metadata?.studentName || "Student";
      const studentUsn = student?.rollNumber || student?.usn || (dto.studentId && !dto.studentId.startsWith("TRK-") ? dto.studentId : "Unidentified Person");
      const section = student?.section || dto.metadata?.section || "A";

      // Deduplicate: check if an active alert for the same student or event was created within the last 60s
      if (resolvedStudentId) {
        const sixtySecondsAgo = new Date(Date.now() - 60000);
        const recentAlert = await this.prisma.behaviorAlert.findFirst({
          where: {
            studentId: resolvedStudentId,
            status: "ACTIVE",
            createdAt: { gte: sixtySecondsAgo },
          },
        });

        if (recentAlert) {
          return { event, alert: recentAlert, duplicatePrevented: true };
        }
      }

      let severity = "WARNING";
      let title = "";
      let description = "";

      if (dto.behaviorType === "PHONE_USAGE") {
        severity = "WARNING";
        title = dto.metadata?.title || `[Section ${section}] 📱 Mobile Phone Usage: ${studentName} (${studentUsn})`;
        description = dto.metadata?.description || `Sustained mobile phone usage observed (${dto.duration || 5}s) with head tilted toward device.`;
      } else if (dto.behaviorType === "SLEEPING" || dto.behaviorType === "POSSIBLE_SLEEPING_POSTURE" || dto.behaviorType === "INACTIVE") {
        severity = "CRITICAL";
        title = dto.metadata?.title || `[Section ${section}] 💤 Possible sleeping posture: ${studentName} (${studentUsn})`;
        description = dto.metadata?.description || `Sustained forward-slumped / lowered-head posture observed (${dto.duration || 10}s) in Section ${section}.`;
      } else if (dto.behaviorType === "DISTRACTED") {
        severity = "INFO";
        title = `[Section ${section}] 👀 Inattentive: ${studentName} (${studentUsn})`;
        description = `Student ${studentName} (${studentUsn}) in Section ${section} is not alert (prolonged distraction).`;
      } else {
        severity = "INFO";
        title = `[Section ${section}] ⚠️ Alert: ${studentName} (${studentUsn})`;
        description = `Behavior anomaly (${dto.behaviorType}) detected for ${studentName} in Section ${section}.`;
      }

      const alert = await this.prisma.behaviorAlert.create({
        data: {
          behaviorEventId: event.id,
          studentId: resolvedStudentId,
          severity,
          title,
          description,
          confidence: dto.confidence,
          status: "ACTIVE",
        },
      });

      return { event, alert };
    }

    return event;
  }

  async getLiveBehavior(cameraId?: string) {
    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const url = cameraId
        ? `${aiUrl}/api/v1/behavior/live?camera_id=${encodeURIComponent(cameraId)}`
        : `${aiUrl}/api/v1/behavior/live`;
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // AI service might be offline or starting
    }
    return { active_sessions: [], students: {}, total_analyzed: 0, timestamp: Date.now() / 1000 };
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

  async getAlerts(severity?: string, section?: string) {
    const where: any = { status: "ACTIVE" };
    if (severity) where.severity = severity;

    const alerts = await this.prisma.behaviorAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    const studentIds = alerts.map((a) => a.studentId).filter(Boolean) as string[];
    const students = studentIds.length > 0
      ? await this.prisma.student.findMany({
          where: {
            OR: [
              { id: { in: studentIds } },
              { usn: { in: studentIds } },
              { rollNumber: { in: studentIds } },
            ],
          },
          select: { id: true, usn: true, rollNumber: true, fullName: true, section: true },
        })
      : [];

    const studentMap = new Map();
    for (const s of students) {
      studentMap.set(s.id, s);
      if (s.usn) studentMap.set(s.usn, s);
      if (s.rollNumber) studentMap.set(s.rollNumber, s);
    }

    const enrichedAlerts = alerts.map((a) => {
      const student = a.studentId ? studentMap.get(a.studentId) : null;
      let detectedSection = student?.section;
      if (!detectedSection) {
        if (a.title.includes("[Section B]") || a.description?.includes("Section B")) {
          detectedSection = "B";
        } else {
          detectedSection = "A";
        }
      }

      return {
        ...a,
        studentName: student?.fullName || null,
        studentUsn: student?.rollNumber || student?.usn || null,
        section: detectedSection,
      };
    });

    if (section && section !== "ALL") {
      return enrichedAlerts.filter(
        (a) => a.section?.toUpperCase() === section.toUpperCase(),
      );
    }

    return enrichedAlerts;
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
