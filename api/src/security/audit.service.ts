import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  userId?: string;
  institutionId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId || "system",
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip: entry.ip || null,
      },
    });
  }

  async logLogin(userId: string, success: boolean, ip?: string): Promise<void> {
    await this.log({
      userId,
      action: success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      entity: "USER",
      entityId: userId,
      ip,
    });
  }

  async logDataExport(userId: string, entity: string, recordCount: number): Promise<void> {
    await this.log({
      userId,
      action: "DATA_EXPORT",
      entity,
      metadata: { recordCount },
    });
  }

  async logRoleChange(userId: string, targetUserId: string, oldRole: string, newRole: string): Promise<void> {
    await this.log({
      userId,
      action: "ROLE_CHANGE",
      entity: "USER",
      entityId: targetUserId,
      metadata: { oldRole, newRole },
    });
  }

  async logDeviceAction(userId: string, deviceId: string, action: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: `DEVICE_${action}`,
      entity: "DEVICE",
      entityId: deviceId,
      metadata,
    });
  }

  async logStudentDataAccess(userId: string, studentId: string): Promise<void> {
    await this.log({
      userId,
      action: "STUDENT_DATA_ACCESS",
      entity: "STUDENT",
      entityId: studentId,
    });
  }

  async logReportGeneration(userId: string, reportType: string, parameters?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: "REPORT_GENERATION",
      entity: "REPORT",
      metadata: { reportType, ...parameters },
    });
  }

  async logBiometricAccess(userId: string, studentId: string, action: string): Promise<void> {
    await this.log({
      userId,
      action: `BIOMETRIC_${action}`,
      entity: "BIOMETRIC",
      entityId: studentId,
    });
  }

  async getAuditLogs(options: {
    userId?: string;
    action?: string;
    entity?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const where: any = {};
    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.entity) where.entity = options.entity;
    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }
}
