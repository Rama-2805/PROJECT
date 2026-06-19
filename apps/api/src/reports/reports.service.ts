import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GenerateReportDto, ReportHistoryQueryDto, ScheduledReportDto } from "./reports.dto";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateReport(dto: GenerateReportDto, userId: string, institutionId: string = "inst-001") {
    const report = await this.prisma.report.create({
      data: {
        institutionId,
        title: dto.title,
        type: dto.type,
        format: dto.format,
        parameters: JSON.stringify(dto.parameters || {}),
        status: "GENERATING",
        generatedById: userId,
      },
    });

    // In production, this would trigger an async report generation job
    // For now, simulate completion
    const completedReport = await this.prisma.report.update({
      where: { id: report.id },
      data: {
        status: "COMPLETED",
        fileUrl: `/reports/download/${report.id}`,
        fileSize: BigInt(Math.floor(Math.random() * 500000) + 10000),
        completedAt: new Date(),
      },
    });

    return completedReport;
  }

  async getReportHistory(query: ReportHistoryQueryDto, institutionId: string = "inst-001") {
    const where: any = { institutionId };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.fromDate) where.createdAt = { ...where.createdAt, gte: new Date(query.fromDate) };
    if (query.toDate) where.createdAt = { ...where.createdAt, lte: new Date(query.toDate) };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { generatedBy: { select: { fullName: true } } },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total, page, limit };
  }

  async getReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { generatedBy: { select: { fullName: true } } },
    });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  async scheduleReport(dto: ScheduledReportDto, userId: string, institutionId: string = "inst-001") {
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
