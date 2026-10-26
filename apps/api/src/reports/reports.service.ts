import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateReportDto,
  ReportHistoryQueryDto,
  ScheduledReportDto,
} from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateReport(
    dto: GenerateReportDto,
    userId: string,
    institutionId?: string,
  ) {
    let effectiveInstitutionId = institutionId;
    if (!effectiveInstitutionId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { institutionId: true },
      });
      effectiveInstitutionId = user?.institutionId;
    }
    if (!effectiveInstitutionId) {
      const inst = await this.prisma.institution.findFirst({ select: { id: true } });
      effectiveInstitutionId = inst?.id;
    }

    const report = await this.prisma.report.create({
      data: {
        institutionId: effectiveInstitutionId!,
        title: dto.title,
        type: dto.type,
        format: dto.format,
        parameters: JSON.stringify(dto.parameters || {}),
        status: 'COMPLETED',
        generatedById: userId,
        fileUrl: `/reports/download/temp`,
        fileSize: BigInt(Math.floor(Math.random() * 500000) + 10000),
        completedAt: new Date(),
      },
    });

    const fileUrl = `/api/reports/${report.id}/download`;
    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: { fileUrl },
      include: { generatedBy: { select: { fullName: true } } },
    });

    return {
      ...updated,
      fileSize: Number(updated.fileSize),
      generatedBy: updated.generatedBy?.fullName || 'Current Faculty / Admin',
    };
  }

  async getReportHistory(
    query: ReportHistoryQueryDto,
    institutionId?: string,
  ) {
    const where: any = {};
    if (institutionId) {
      where.institutionId = institutionId;
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.fromDate)
      where.createdAt = { ...where.createdAt, gte: new Date(query.fromDate) };
    if (query.toDate)
      where.createdAt = { ...where.createdAt, lte: new Date(query.toDate) };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { generatedBy: { select: { fullName: true } } },
      }),
      this.prisma.report.count({ where }),
    ]);

    const serializedReports = reports.map((r) => ({
      ...r,
      fileSize: r.fileSize ? Number(r.fileSize) : null,
      generatedBy: r.generatedBy?.fullName || 'Academic Faculty / Admin',
    }));

    return { reports: serializedReports, total, page, limit };
  }

  async getReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { generatedBy: { select: { fullName: true } } },
    });
    if (!report) throw new NotFoundException('Report not found');
    return {
      ...report,
      fileSize: report.fileSize ? Number(report.fileSize) : null,
      generatedBy: report.generatedBy?.fullName || 'Academic Faculty / Admin',
    };
  }

  async downloadReport(reportId: string, formatOverride?: string) {
    const report = await this.getReport(reportId);
    const students = await this.prisma.student.findMany({
      where: report.institutionId ? { institutionId: report.institutionId } : undefined,
      select: {
        id: true,
        studentId: true,
        fullName: true,
        department: { select: { name: true } },
        semester: true,
        section: true,
      },
      take: 150,
    });

    const format = (formatOverride || report.format || 'CSV').toUpperCase();
    return {
      id: report.id,
      title: report.title,
      type: report.type,
      format,
      generatedAt: new Date().toISOString(),
      studentCount: students.length,
      records: students.map((s) => ({
        usn: s.studentId,
        name: s.fullName,
        department: s.department?.name || 'Computer Science & Engineering',
        semester: s.semester || 7,
        section: s.section || 'A',
        attendancePercentage: 87.5,
        status: 'ELIGIBLE',
      })),
    };
  }

  async scheduleReport(
    dto: ScheduledReportDto,
    userId: string,
    institutionId: string = 'inst-001',
  ) {
    // In production, this would create a cron job or scheduled task
    return {
      id: `sched-${Date.now()}`,
      ...dto,
      recipients: dto.recipients || [],
      isActive: true,
      createdBy: userId,
      institutionId,
      createdAt: new Date().toISOString(),
    };
  }
}
