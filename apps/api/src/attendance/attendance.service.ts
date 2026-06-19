import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StartSessionDto, IngestAttendanceDto, AttendanceQueryDto } from "./attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async startSession(dto: StartSessionDto) {
    const sessionId = `SESS_${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.attendanceSession.create({
      data: {
        sessionId,
        institutionId: dto.institutionId,
        classroomId: dto.classroomId,
        teacherId: dto.teacherId,
        subjectName: dto.subjectName,
        totalStudents: dto.totalStudents || 0,
        status: "ACTIVE",
      },
    });
  }

  async endSession(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { sessionId },
    });
    if (!session) throw new NotFoundException("Session not found");

    const recordCount = await this.prisma.attendanceRecord.count({
      where: { sessionId },
    });

    return this.prisma.attendanceSession.update({
      where: { sessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        totalPresent: recordCount,
      },
    });
  }

  async ingest(dto: IngestAttendanceDto) {
    // Check for duplicate in same session
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: dto.sessionId,
          studentId: dto.studentId,
        },
      },
    });

    if (existing) return existing; // Already marked — skip duplicate

    // Create attendance record
    const record = await this.prisma.attendanceRecord.create({
      data: {
        sessionId: dto.sessionId,
        studentId: dto.studentId,
        studentName: dto.studentName,
        confidence: dto.confidence,
        cameraId: dto.cameraId,
        method: dto.method || "FACE_RECOGNITION",
      },
    });

    // Update student's last attendance time
    await this.prisma.student.updateMany({
      where: { studentId: dto.studentId },
      data: { lastAttendanceTime: new Date() },
    });

    return record;
  }

  async getLiveStatus(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { sessionId },
      include: {
        records: {
          orderBy: { markedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!session) throw new NotFoundException("Session not found");

    const totalPresent = await this.prisma.attendanceRecord.count({
      where: { sessionId },
    });

    const recentEvents = session.records.slice(0, 20).map((r) => ({
      type: "ATTENDANCE_DETECTED",
      studentId: r.studentId,
      studentName: r.studentName,
      confidence: r.confidence,
      time: r.markedAt.toLocaleTimeString(),
    }));

    return {
      sessionId: session.sessionId,
      classroomId: session.classroomId,
      subjectName: session.subjectName,
      status: session.status,
      totalPresent,
      totalStudents: session.totalStudents,
      startedAt: session.startedAt,
      recentEvents,
    };
  }

  async getSessionHistory(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { sessionId },
      include: {
        records: { orderBy: { markedAt: "desc" } },
      },
    });
    if (!session) throw new NotFoundException("Session not found");
    return session;
  }

  async getStudentAnalytics(studentId: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: true },
      orderBy: { markedAt: "desc" },
      take: 100,
    });

    const totalSessions = new Set(records.map((r) => r.sessionId)).size;
    const averageConfidence = records.length > 0
      ? records.reduce((s, r) => s + r.confidence, 0) / records.length
      : 0;

    return {
      studentId,
      totalRecords: records.length,
      totalSessions,
      averageConfidence: parseFloat(averageConfidence.toFixed(2)),
      recentRecords: records.slice(0, 20),
    };
  }

  async query(queryDto: AttendanceQueryDto) {
    const where: any = {};
    if (queryDto.sessionId) where.sessionId = queryDto.sessionId;
    if (queryDto.studentId) where.studentId = queryDto.studentId;
    if (queryDto.classroomId) where.session = { classroomId: queryDto.classroomId };
    if (queryDto.fromDate) where.markedAt = { ...where.markedAt, gte: new Date(queryDto.fromDate) };
    if (queryDto.toDate) where.markedAt = { ...where.markedAt, lte: new Date(queryDto.toDate) };

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { markedAt: "desc" },
        include: { session: true },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async reportUnknownFace(institutionId: string, classroomId: string, cameraId?: string) {
    return this.prisma.unknownFace.create({
      data: { institutionId, classroomId, cameraId },
    });
  }
}
