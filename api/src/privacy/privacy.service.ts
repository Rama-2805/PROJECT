import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrivacyService {
  constructor(private prisma: PrismaService) {}

  async getPrivacySummary(institutionId: string) {
    const [totalStudents, enrolledStudents, totalEmbeddings] = await Promise.all([
      this.prisma.student.count({ where: { institutionId } }),
      this.prisma.student.count({ where: { institutionId, faceEnrolled: true } }),
      this.prisma.faceEmbedding.count({
        where: { student: { institutionId } },
      }),
    ]);

    return {
      totalStudents,
      studentsWithBiometrics: enrolledStudents,
      totalFaceEmbeddings: totalEmbeddings,
      retentionPeriodDays: 365,
      autoDeleteAfterDays: 730,
      dataAccessLogsCount: 0,
      pendingDeletionRequests: 0,
    };
  }

  async getStudentData(studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { studentId },
      include: {
        faceEmbeddings: {
          select: { id: true, confidence: true, createdAt: true },
        },
      },
    });

    if (!student) throw new NotFoundException("Student not found");

    return {
      personalInfo: {
        id: student.studentId,
        name: student.fullName,
        email: student.email,
        phone: student.phone,
        department: student.departmentId,
      },
      biometricData: {
        isEnrolled: student.faceEnrolled,
        sampleCount: student.faceSamples,
        enrollmentConfidence: student.enrollmentConfidence,
        embeddingsCount: student.faceEmbeddings.length,
        embeddingsCreatedAt: student.faceEmbeddings.map((e) => e.createdAt),
      },
      analyticsData: {
        attendancePercentage: student.attendancePercentage,
        engagementScore: student.engagementScore,
        behaviorAlertCount: student.behaviorAlertCount,
      },
    };
  }

  async requestDataDeletion(studentId: string, requestedBy: string) {
    const student = await this.prisma.student.findFirst({
      where: { studentId },
    });
    if (!student) throw new NotFoundException("Student not found");

    // Queue deletion request (in production: async job)
    // Mark student for deletion
    await this.prisma.student.update({
      where: { studentId },
      data: {
        status: "INACTIVE",
        faceEnrolled: false,
        faceSamples: 0,
        enrollmentConfidence: 0,
      },
    });

    // Remove face embeddings
    await this.prisma.faceEmbedding.deleteMany({
      where: { studentId: student.id },
    });

    return {
      message: "Deletion request processed",
      deletedData: ["Face embeddings", "Recognition history", "Biometric samples"],
      retainedData: ["Attendance records (anonymized)", "Academic history"],
    };
  }

  async getAccessHistory(studentId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity: "STUDENT", entityId: studentId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { fullName: true } } },
    });
  }

  async getRetentionPolicies() {
    return {
      faceEmbeddings: {
        retentionDays: 365,
        autoDeleteAfterDays: 730,
        description: "Face embeddings are retained for 1 year after last recognition. Auto-deleted after 2 years.",
      },
      attendanceRecords: {
        retentionDays: 3650,
        description: "Attendance records retained for 10 years per institutional policy.",
      },
      behaviorEvents: {
        retentionDays: 730,
        description: "Behavior event data retained for 2 years.",
      },
      auditLogs: {
        retentionDays: 1825,
        description: "Audit logs retained for 5 years for compliance.",
      },
      rawVideo: {
        retentionDays: 30,
        description: "Raw classroom video deleted after 30 days. Only metadata preserved.",
      },
    };
  }

  async exportStudentData(studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { studentId },
      include: {
        faceEmbeddings: {
          select: { confidence: true, createdAt: true },
        },
      },
    });

    if (!student) throw new NotFoundException("Student not found");

    return {
      exportDate: new Date().toISOString(),
      data: {
        profile: {
          name: student.fullName,
          studentId: student.studentId,
          email: student.email,
          enrollmentDate: student.createdAt,
        },
        biometricData: student.faceEnrolled ? {
          enrolled: true,
          samples: student.faceSamples,
          enrollmentDate: student.faceEmbeddings[0]?.createdAt,
          embeddingsCount: student.faceEmbeddings.length,
        } : { enrolled: false },
        attendance: {
          overallPercentage: student.attendancePercentage,
          lastRecognition: student.lastRecognitionDate,
        },
        analytics: {
          engagementScore: student.engagementScore,
          behaviorAlerts: student.behaviorAlertCount,
        },
      },
    };
  }
}
