import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IngestBehaviorDto,
  ResolveBehaviorDto,
  BehaviorQueryDto,
  AcknowledgeAlertDto,
  CreateEngagementRecordDto,
} from './behavior.dto';

@Injectable()
export class BehaviorService {
  private readonly logger = new Logger(BehaviorService.name);

  constructor(private prisma: PrismaService) {}

  private get internalApiKey(): string {
    return (
      process.env.INTERNAL_API_KEY ||
      (process.env.NODE_ENV === 'production'
        ? ''
        : 'sc-internal-service-key-dev-only')
    );
  }

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

    let resolvedStudentId = student?.id || null;
    const bType = dto.behaviorType || dto.eventType || 'UNKNOWN';
    const metadataPayload = {
      ...(typeof dto.metadata === 'object' && dto.metadata !== null
        ? dto.metadata
        : {}),
      ...(dto.eventId ? { eventId: dto.eventId } : {}),
      ...(dto.trackId ? { trackId: dto.trackId } : {}),
      ...(dto.cameraId ? { cameraId: dto.cameraId } : {}),
    };

    const event = await this.prisma.behaviorEvent.create({
      data: {
        studentId: resolvedStudentId,
        sessionId: dto.sessionId,
        behaviorType: bType,
        confidence: dto.confidence ?? 0.8,
        duration: dto.duration || 0,
        classroomId: dto.classroomId,
        metadata:
          Object.keys(metadataPayload).length > 0
            ? JSON.stringify(metadataPayload)
            : undefined,
      },
    });

    const alertableTypes = [
      'PHONE_USAGE',
      'SLEEPING',
      'PROBABLE_SLEEPING',
      'POSSIBLE_SLEEPING_POSTURE',
      'INACTIVE',
      'DISTRACTED',
      'ABSENT_FROM_SEAT',
    ];
    if (alertableTypes.includes(bType)) {
      const studentName =
        student?.fullName || dto.studentName || dto.metadata?.studentName || 'Student';
      const studentUsn =
        student?.rollNumber ||
        student?.usn ||
        (dto.studentId && !dto.studentId.startsWith('TRK-')
          ? dto.studentId
          : 'Unidentified Person');
      const section = student?.section || dto.metadata?.section || 'A';

      // Deduplicate: check if an active alert for the same student or track was created within the last 60s
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      let recentAlert = null;

      if (resolvedStudentId) {
        recentAlert = await this.prisma.behaviorAlert.findFirst({
          where: {
            studentId: resolvedStudentId,
            status: 'ACTIVE',
            createdAt: { gte: sixtySecondsAgo },
          },
        });
      } else if (dto.trackId || dto.eventId) {
        // Track-level deduplication for anonymous / unidentified tracks
        const recentEvents = await this.prisma.behaviorEvent.findMany({
          where: {
            createdAt: { gte: sixtySecondsAgo },
            behaviorType: bType,
          },
          take: 30,
          orderBy: { createdAt: 'desc' },
        });

        for (const re of recentEvents) {
          try {
            const m = JSON.parse(re.metadata || '{}');
            if (
              (dto.trackId && m.trackId === dto.trackId) ||
              (dto.eventId && m.eventId === dto.eventId)
            ) {
              const matchedAlert = await this.prisma.behaviorAlert.findFirst({
                where: {
                  behaviorEventId: re.id,
                  status: 'ACTIVE',
                },
              });
              if (matchedAlert) {
                recentAlert = matchedAlert;
                break;
              }
            }
          } catch {
            // ignore non-json metadata
          }
        }
      }

      if (recentAlert) {
        return { event, alert: recentAlert, duplicatePrevented: true };
      }

      const isSleepingType =
        bType === 'PROBABLE_SLEEPING' ||
        bType === 'SLEEPING' ||
        bType === 'POSSIBLE_SLEEPING_POSTURE';

      let severity = 'WARNING';
      let title = '';
      let description = '';

      if (isSleepingType) {
        severity = 'CRITICAL';
        if (resolvedStudentId) {
          title =
            dto.metadata?.title ||
            `[Section ${section}] 😴 Sleeping: ${studentName} (${studentUsn})`;
          description =
            dto.metadata?.description ||
            `Sustained sleeping posture observed (${dto.duration || 30}s) for verified student ${studentName}.`;
        } else {
          const anonRef = dto.metadata?.title
            ? dto.metadata.title
            : `Sleeping — UNKNOWN (Track ${dto.trackId || 'P-001'})`;
          title = anonRef;
          description =
            dto.metadata?.description ||
            `Sustained probable sleeping posture observed (${dto.duration || 30}s) for unidentified person.`;
        }
      } else if (bType === 'PHONE_USAGE') {
        severity = 'WARNING';
        title =
          dto.metadata?.title ||
          `[Section ${section}] 📱 Mobile Phone Usage: ${studentName} (${studentUsn})`;
        description =
          dto.metadata?.description ||
          `Sustained mobile phone usage observed (${dto.duration || 5}s) with head tilted toward device.`;
      } else if (bType === 'DISTRACTED') {
        severity = 'INFO';
        title = `[Section ${section}] 👀 Inattentive: ${studentName} (${studentUsn})`;
        description = `Student ${studentName} (${studentUsn}) in Section ${section} is not alert (prolonged distraction).`;
      } else {
        severity = 'INFO';
        title = `[Section ${section}] ⚠️ Alert: ${studentName} (${studentUsn})`;
        description = `Behavior anomaly (${bType}) detected for ${studentName} in Section ${section}.`;
      }

      const alert = await this.prisma.behaviorAlert.create({
        data: {
          behaviorEventId: event.id,
          studentId: resolvedStudentId,
          severity,
          title,
          description,
          confidence: dto.confidence ?? 0.8,
          status: 'ACTIVE',
        },
      });

      return { event, alert };
    }

    return event;
  }

  async resolve(dto: ResolveBehaviorDto) {
    this.logger.log(
      `Resolving behavioral episode: eventId=${dto.eventId}, alertId=${dto.alertId}, studentId=${dto.studentId}, trackId=${dto.trackId}`,
    );

    const bType = dto.behaviorType || dto.eventType;
    const resolutionReason =
      dto.metadata?.resolution || 'evidence_cleared';

    // 1. If explicit alertId is provided
    if (dto.alertId) {
      const alert = await this.prisma.behaviorAlert.findUnique({
        where: { id: dto.alertId },
      });
      if (!alert) {
        this.logger.warn(`Behavior alert not found for alertId: ${dto.alertId}`);
        return {
          success: true,
          resolved: false,
          message: `Alert ${dto.alertId} not found`,
        };
      }
      if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
        return {
          success: true,
          resolved: true,
          alreadyResolved: true,
          alertId: alert.id,
          status: alert.status,
        };
      }
      const updated = await this.prisma.behaviorAlert.update({
        where: { id: alert.id },
        data: {
          status: 'RESOLVED',
          description: alert.description
            ? `${alert.description} (Resolved: ${resolutionReason})`
            : `Resolved: ${resolutionReason}`,
        },
      });
      if (alert.behaviorEventId && dto.duration) {
        try {
          await this.prisma.behaviorEvent.update({
            where: { id: alert.behaviorEventId },
            data: { duration: dto.duration },
          });
        } catch {
          // Non-blocking if event row missing
        }
      }
      return { success: true, resolved: true, alert: updated };
    }

    // 2. Lookup by eventId if provided
    let targetAlert: any = null;
    if (dto.eventId) {
      // Direct match on alert id or behaviorEventId
      targetAlert = await this.prisma.behaviorAlert.findFirst({
        where: {
          OR: [
            { id: dto.eventId },
            { behaviorEventId: dto.eventId },
          ],
        },
      });

      // If not on alert directly, search in BehaviorEvent metadata
      if (!targetAlert) {
        const matchingEvent = await this.prisma.behaviorEvent.findFirst({
          where: {
            OR: [
              { id: dto.eventId },
              { metadata: { contains: dto.eventId } },
            ],
          },
        });
        if (matchingEvent) {
          targetAlert = await this.prisma.behaviorAlert.findFirst({
            where: { behaviorEventId: matchingEvent.id },
          });
        }
      }
    }

    // 3. Fallback: match by studentId or trackId and behavior type for active alerts
    if (!targetAlert && (dto.studentId || dto.trackId)) {
      let resolvedStudentId: string | null = null;
      if (dto.studentId && !dto.studentId.startsWith('TRK-')) {
        const student = await this.prisma.student.findFirst({
          where: {
            OR: [
              { id: dto.studentId },
              { usn: dto.studentId },
              { rollNumber: dto.studentId },
            ],
          },
        });
        resolvedStudentId = student?.id || dto.studentId;
      }

      const whereClause: any = {
        status: 'ACTIVE',
      };
      if (resolvedStudentId) {
        whereClause.studentId = resolvedStudentId;
      } else if (dto.trackId) {
        // Scope resolution precisely to the tracked episode
        const matchingEvents = await this.prisma.behaviorEvent.findMany({
          where: {
            metadata: { contains: dto.trackId },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });
        const matchedEventIds = matchingEvents.map((e) => e.id);
        if (matchedEventIds.length > 0) {
          whereClause.behaviorEventId = { in: matchedEventIds };
        } else {
          whereClause.title = { contains: dto.trackId };
        }
      }

      // Filter by matching candidates
      const candidates = await this.prisma.behaviorAlert.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (bType && candidates.length > 0) {
        targetAlert =
          candidates.find(
            (c) =>
              c.title.toUpperCase().includes(bType.toUpperCase()) ||
              (bType === 'PHONE_USAGE' && c.title.includes('Phone')) ||
              (bType.includes('SLEEPING') && c.title.toLowerCase().includes('sleeping')),
          ) || candidates[0];
      } else if (candidates.length > 0) {
        targetAlert = candidates[0];
      }
    }

    // 4. Handle resolution outcome
    if (!targetAlert) {
      this.logger.log(
        `No active alert found to resolve for eventId=${dto.eventId}, studentId=${dto.studentId}`,
      );
      return {
        success: true,
        resolved: false,
        message: 'No active behavioral alert found matching criteria',
        eventId: dto.eventId,
      };
    }

    // Check if already resolved (idempotent)
    if (targetAlert.status === 'RESOLVED' || targetAlert.status === 'DISMISSED') {
      return {
        success: true,
        resolved: true,
        alreadyResolved: true,
        alertId: targetAlert.id,
        status: targetAlert.status,
        eventId: dto.eventId,
      };
    }

    // Update alert to RESOLVED
    const updatedAlert = await this.prisma.behaviorAlert.update({
      where: { id: targetAlert.id },
      data: {
        status: 'RESOLVED',
        description: targetAlert.description
          ? `${targetAlert.description} (Resolved: ${resolutionReason})`
          : `Resolved: ${resolutionReason}`,
      },
    });

    // Update associated BehaviorEvent duration if available
    if (targetAlert.behaviorEventId && dto.duration) {
      try {
        await this.prisma.behaviorEvent.update({
          where: { id: targetAlert.behaviorEventId },
          data: { duration: dto.duration },
        });
      } catch {
        // Non-blocking if event row missing
      }
    }

    this.logger.log(
      `Behavioral alert ${targetAlert.id} successfully marked as RESOLVED`,
    );
    return {
      success: true,
      resolved: true,
      alert: updatedAlert,
      eventId: dto.eventId,
    };
  }

  async getLiveBehavior(cameraId?: string) {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const url = cameraId
        ? `${aiUrl}/api/v1/behavior/live?camera_id=${encodeURIComponent(cameraId)}`
        : `${aiUrl}/api/v1/behavior/live`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.internalApiKey) headers['x-api-key'] = this.internalApiKey;
      const res = await fetch(url, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // AI service might be offline or starting
    }
    return {
      active_sessions: [],
      students: {},
      total_analyzed: 0,
      timestamp: Date.now() / 1000,
    };
  }

  async queryEvents(query: BehaviorQueryDto) {
    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.behaviorType) where.behaviorType = query.behaviorType;
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.fromDate)
      where.createdAt = { ...where.createdAt, gte: new Date(query.fromDate) };
    if (query.toDate)
      where.createdAt = { ...where.createdAt, lte: new Date(query.toDate) };

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.behaviorEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.behaviorEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStudentBehavior(studentId: string) {
    const events = await this.prisma.behaviorEvent.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const engagement = await this.prisma.engagementRecord.findMany({
      where: { studentId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
    return { events, engagement };
  }

  async getAnalytics() {
    const [totalEvents, behaviorDistribution, engagementSummary] =
      await Promise.all([
        this.prisma.behaviorEvent.count(),
        this.prisma.behaviorEvent.groupBy({
          by: ['behaviorType'],
          _count: true,
          orderBy: { _count: { behaviorType: 'desc' } },
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
    const where: any = { status: 'ACTIVE' };
    if (severity) where.severity = severity;

    const alerts = await this.prisma.behaviorAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    const studentIds = alerts.map((a) => a.studentId).filter(Boolean);
    const students =
      studentIds.length > 0
        ? await this.prisma.student.findMany({
            where: {
              OR: [
                { id: { in: studentIds } },
                { usn: { in: studentIds } },
                { rollNumber: { in: studentIds } },
              ],
            },
            select: {
              id: true,
              usn: true,
              rollNumber: true,
              fullName: true,
              section: true,
            },
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
        if (
          a.title.includes('[Section B]') ||
          a.description?.includes('Section B')
        ) {
          detectedSection = 'B';
        } else {
          detectedSection = 'A';
        }
      }

      return {
        ...a,
        studentName: student?.fullName || (a.studentId ? a.studentId : 'UNKNOWN'),
        studentUsn: student?.rollNumber || student?.usn || (a.studentId ? a.studentId : null),
        section: detectedSection,
      };
    });

    if (section && section !== 'ALL') {
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
    if (!alert) throw new NotFoundException('Alert not found');

    return this.prisma.behaviorAlert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED', acknowledgedBy: dto.acknowledgedBy },
    });
  }

  async dismissAlert(alertId: string) {
    const alert = await this.prisma.behaviorAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) throw new NotFoundException('Alert not found');

    return this.prisma.behaviorAlert.update({
      where: { id: alertId },
      data: { status: 'DISMISSED' },
    });
  }

  async recordEngagement(dto: CreateEngagementRecordDto) {
    let resolvedStudentId = dto.studentId;
    let resolvedSessionId = dto.sessionId;

    if (dto.sessionId) {
      const session = await this.prisma.attendanceSession.findFirst({
        where: {
          OR: [
            { id: dto.sessionId },
            { sessionId: dto.sessionId },
          ],
        },
      });
      if (session) {
        resolvedSessionId = session.sessionId;
      } else {
        this.logger.warn(`Attendance session not found for sessionId: ${dto.sessionId}`);
      }
    }

    if (dto.studentId && !dto.studentId.startsWith('TRK-')) {
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { id: dto.studentId },
            { usn: dto.studentId },
            { rollNumber: dto.studentId },
            { studentId: dto.studentId },
          ],
        },
      });
      if (student) {
        resolvedStudentId = student.id;
      } else {
        this.logger.warn(`Student not found for studentId: ${dto.studentId}`);
      }
    }

    return this.prisma.engagementRecord.create({
      data: {
        studentId: resolvedStudentId,
        sessionId: resolvedSessionId,
        score: dto.score,
        level: dto.level,
        attentionScore: dto.attentionScore ?? 0,
        postureScore: dto.postureScore ?? 0,
        phonePenalty: dto.phonePenalty ?? 0,
        activityScore: dto.activityScore ?? 0,
      },
    });
  }

  async getEngagementTrend(sessionId?: string) {
    const where: any = {};
    if (sessionId) where.sessionId = sessionId;

    return this.prisma.engagementRecord.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
  }
}
