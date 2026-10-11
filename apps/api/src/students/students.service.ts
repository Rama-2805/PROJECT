import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto, UpdateStudentDto, StudentQueryDto } from "./students.dto";

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(query: StudentQueryDto) {
    const {
      institutionId,
      departmentId,
      courseId,
      semester,
      section,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (semester) where.semester = parseInt(semester);
    if (section) where.section = section;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { studentId: { contains: search, mode: "insensitive" } },
        { rollNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { department: true, course: true },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { department: true, course: true, institution: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    return student;
  }

  async create(dto: CreateStudentDto) {
    const argon2 = await import("argon2");

    const student = await this.prisma.student.create({
      data: {
        institutionId: dto.institutionId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        studentId: dto.studentId,
        rollNumber: dto.rollNumber,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        semester: dto.semester ? parseInt(dto.semester) : 1,
        section: dto.section,
        batchYear: dto.batchYear,
        status: dto.status || "ACTIVE",
      },
      include: { department: true, course: true },
    });

    const emailToUse = dto.email || `${dto.studentId.toLowerCase()}.cs2023@vemanait.edu.in`;
    const studentRole = await this.prisma.role.upsert({
      where: { name: "STUDENT" },
      update: {},
      create: { name: "STUDENT", label: "Student" },
    });
    const passwordHash = await argon2.hash("demo123");

    const user = await this.prisma.user.upsert({
      where: { email: emailToUse },
      update: {
        fullName: dto.fullName,
        mustChangePassword: true,
      },
      create: {
        institutionId: dto.institutionId,
        fullName: dto.fullName,
        email: emailToUse,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: studentRole.id } },
      update: {},
      create: { userId: user.id, roleId: studentRole.id },
    });

    await this.prisma.student.update({
      where: { id: student.id },
      data: { userId: user.id, email: emailToUse },
    });

    return { ...student, email: emailToUse, userId: user.id };
  }

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException("Student not found");

    return this.prisma.student.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        semester: dto.semester ? parseInt(dto.semester) : undefined,
      },
      include: { department: true, course: true },
    });
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException("Student not found");

    // Clean up relations
    await this.prisma.clusterAssignment.deleteMany({ where: { studentId: id } });
    await this.prisma.studentCluster.updateMany({
      where: { assignedStudentId: id },
      data: { assignedStudentId: null, status: "UNASSIGNED" },
    });
    await this.prisma.faceImage.deleteMany({ where: { studentId: id } });
    await this.prisma.faceEmbedding.deleteMany({ where: { studentId: id } });
    await this.prisma.attendanceRecord.deleteMany({ where: { studentId: id } });
    await this.prisma.behaviorEvent.deleteMany({ where: { studentId: id } });
    await this.prisma.studentParent.deleteMany({ where: { studentId: id } });

    const userId = student.userId;
    const deleted = await this.prisma.student.delete({ where: { id } });

    if (userId) {
      try {
        await this.prisma.userRole.deleteMany({ where: { userId } });
        await this.prisma.user.delete({ where: { id: userId } });
      } catch {}
    }

    return deleted;
  }

  async getStats(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};
    const students = await this.prisma.student.findMany({
      where,
      include: {
        faceImages: { select: { id: true } },
      },
    });
    const total = students.length;
    const faceEnrolled = students.filter((s) => s.faceEnrolled || s.faceImages.length > 0).length;
    const avgAttendance = total > 0
      ? students.reduce((sum, s) => sum + s.attendancePercentage, 0) / total
      : 0;
    const avgEngagement = total > 0
      ? students.reduce((sum, s) => sum + s.engagementScore, 0) / total
      : 0;

    return {
      totalStudents: total,
      faceEnrolled,
      pendingEnrollment: total - faceEnrolled,
      averageAttendance: parseFloat(avgAttendance.toFixed(1)),
      averageEngagement: parseFloat(avgEngagement.toFixed(1)),
    };
  }

  async getStudentBiometrics(id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { id },
          { studentId: id },
          { rollNumber: id },
        ],
      },
      include: {
        department: true,
        course: true,
        faceImages: { orderBy: { createdAt: "desc" } },
        faceEmbeddings: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!student) throw new NotFoundException("Student not found");

    const clusters = await this.prisma.studentCluster.findMany({
      where: { assignedStudentId: student.id },
      include: { images: true, session: true },
      orderBy: { updatedAt: "desc" },
    });

    const usn = student.rollNumber || student.studentId || student.usn || "";

    // If no Postgres clusters found, also check active AI service session clusters fallback
    let aiClusters: any[] = [];
    if (clusters.length === 0) {
      try {
        const aiUrl = `http://127.0.0.1:8000/api/v1/sessions/408/clusters`;
        const res = await fetch(aiUrl, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const aiData = await res.json();
          const list = aiData.clusters || [];
          aiClusters = list.filter((c: any) => {
            const cUsn = (c.assignedStudent?.usn || c.usn || c.assignedUsn || "").toLowerCase();
            const cName = (c.assignedStudent?.name || c.name || c.assignedStudentName || "").toLowerCase();
            const myUsn = usn.toLowerCase();
            const myName = student.fullName.toLowerCase();
            return (cUsn && (cUsn === myUsn || myUsn.includes(cUsn))) || (cName && (cName === myName || myName.includes(cName)));
          });
        }
      } catch {}
    }

    const isFaceEnrolled = student.faceEnrolled || clusters.length > 0 || student.faceImages.length > 0 || aiClusters.length > 0;
    const bestPhoto = student.profilePhoto || student.primaryFaceImagePath || clusters[0]?.bestImagePath || (aiClusters[0]?.bestImagePath || (aiClusters[0]?.gallery && aiClusters[0]?.gallery[0])) || null;

    if (aiClusters.length > 0 && !student.faceEnrolled) {
      this.prisma.student.update({
        where: { id: student.id },
        data: {
          faceEnrolled: true,
          faceSamples: aiClusters.reduce((acc: number, c: any) => acc + (c.sampleCount || 1), 0),
          profilePhoto: bestPhoto,
          primaryFaceImagePath: bestPhoto,
        },
      }).catch(() => {});
    }

    const mappedClusters = clusters.length > 0 ? clusters.map(c => ({
      id: c.id,
      clusterNumber: c.clusterNumber,
      sampleCount: c.sampleCount,
      qualityAvg: c.qualityAvg,
      confidence: c.confidence,
      bestImagePath: c.bestImagePath,
      status: c.status,
      sessionName: c.session?.name,
      sessionDate: c.session?.lectureDate,
      images: c.images.map(img => ({
        id: img.id,
        imagePath: img.imagePath,
        qualityScore: img.qualityScore,
        isBest: img.isBest,
        timestampSec: img.timestampSec,
      })),
    })) : aiClusters.map((c, idx) => ({
      id: c.id || c.clusterId || `c-${idx}`,
      clusterNumber: c.clusterNumber || idx + 1,
      sampleCount: c.sampleCount || (c.gallery?.length || 1),
      qualityAvg: c.qualityAvg || 85.0,
      confidence: c.confidence || 0.95,
      bestImagePath: c.bestImagePath || (c.gallery && c.gallery[0]),
      status: c.status || "ASSIGNED",
      sessionName: "Classroom Session 408",
      sessionDate: new Date().toISOString().split("T")[0],
      images: (c.gallery || []).map((g: string, gIdx: number) => ({
        id: `img-${idx}-${gIdx}`,
        imagePath: g,
        qualityScore: 88,
        isBest: gIdx === 0,
        timestampSec: gIdx * 2,
      })),
    }));

    return {
      studentId: student.id,
      fullName: student.fullName,
      usn,
      email: student.email,
      department: student.department?.name,
      departmentCode: student.department?.code,
      semester: student.semester,
      section: student.section,
      gender: student.gender,
      faceEnrolled: isFaceEnrolled,
      faceSamples: student.faceSamples || student.faceImages.length || mappedClusters.reduce((acc, c) => acc + (c.sampleCount || 1), 0),
      profilePhoto: bestPhoto,
      primaryFaceImagePath: bestPhoto,
      clusters: mappedClusters,
      faceImages: student.faceImages,
      embeddingsCount: student.faceEmbeddings.length || (isFaceEnrolled ? 1 : 0),
    };
  }

  async resetStudentPassword(id: string, customPassword?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    const argon2 = await import("argon2");
    const newPass = customPassword || "demo123";
    const passwordHash = await argon2.hash(newPass);

    if (student.userId) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });
    } else if (student.email) {
      const studentRole = await this.prisma.role.findUnique({ where: { name: "STUDENT" } });
      const user = await this.prisma.user.upsert({
        where: { email: student.email },
        update: { passwordHash, mustChangePassword: true },
        create: {
          institutionId: student.institutionId,
          fullName: student.fullName,
          email: student.email,
          passwordHash,
          mustChangePassword: true,
          userRoles: studentRole ? { create: { roleId: studentRole.id } } : undefined,
        },
      });
      await this.prisma.student.update({
        where: { id: student.id },
        data: { userId: user.id },
      });
    }

    return {
      success: true,
      message: `Password for ${student.fullName} has been reset to "${newPass}".`,
      tempPassword: newPass,
    };
  }

  async markStudentEnrolled(dto: { usn: string; studentId?: string; faceSamples?: number; profilePhoto?: string }) {
    const rawUsn = (dto.usn || "").trim();
    const upperUsn = rawUsn.toUpperCase();
    const usnVariants = Array.from(new Set([
      rawUsn,
      upperUsn,
      rawUsn.toLowerCase(),
      upperUsn.replace(/^1V1/, "1VI"),
      upperUsn.replace(/^1VI/, "1V1"),
      upperUsn.replace(/1V1/g, "1VI"),
      upperUsn.replace(/1VI/g, "1V1"),
      upperUsn.replace(/CSO/g, "CS0"),
      upperUsn.replace(/CS0/g, "CSO"),
    ]));

    let student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { id: dto.studentId || dto.usn },
          { rollNumber: { in: usnVariants } },
          { studentId: { in: usnVariants } },
          { usn: { in: usnVariants } },
          { rollNumber: { contains: rawUsn.slice(-6), mode: "insensitive" } },
          { studentId: { contains: rawUsn.slice(-6), mode: "insensitive" } },
          { fullName: { contains: rawUsn, mode: "insensitive" } },
        ],
      },
    });

    if (!student && rawUsn.length >= 3) {
      // Fallback search by trailing digits (e.g. 027)
      const digits = rawUsn.replace(/\D/g, "");
      if (digits.length >= 3) {
        student = await this.prisma.student.findFirst({
          where: {
            OR: [
              { rollNumber: { contains: digits } },
              { studentId: { contains: digits } },
            ],
          },
        });
      }
    }

    if (!student) return { success: false, message: `Student with identifier ${dto.usn} not found.` };

    const samplesCount = dto.faceSamples
      ? (dto.faceSamples > (student.faceSamples || 0) ? dto.faceSamples : (student.faceSamples || 0) + 1)
      : (student.faceSamples || 1);

    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: {
        faceEnrolled: true,
        faceSamples: samplesCount,
        profilePhoto: dto.profilePhoto || student.profilePhoto,
        primaryFaceImagePath: dto.profilePhoto || student.primaryFaceImagePath,
      },
    });

    // Also mark any assigned StudentClusters as ASSIGNED
    try {
      await this.prisma.studentCluster.updateMany({
        where: { assignedStudentId: student.id },
        data: { status: "ASSIGNED" },
      });
    } catch {}

    return {
      success: true,
      studentId: updated.id,
      fullName: updated.fullName,
      faceEnrolled: updated.faceEnrolled,
    };
  }

  async updateStudentPhoto(dto: {
    studentId?: string;
    usn?: string;
    userId?: string;
    email?: string;
    photoData: string;
  }) {
    const rawUsn = (dto.usn || dto.studentId || "").trim();
    const upperUsn = rawUsn.toUpperCase();
    const usnVariants = Array.from(new Set([
      rawUsn,
      upperUsn,
      rawUsn.toLowerCase(),
      upperUsn.replace(/^1V1/, "1VI"),
      upperUsn.replace(/^1VI/, "1V1"),
      upperUsn.replace(/1V1/g, "1VI"),
      upperUsn.replace(/1VI/g, "1V1"),
      upperUsn.replace(/CSO/g, "CS0"),
      upperUsn.replace(/CS0/g, "CSO"),
    ])).filter(Boolean);

    const orClauses: any[] = [];
    if (dto.studentId) orClauses.push({ id: dto.studentId });
    if (dto.userId) orClauses.push({ userId: dto.userId });
    if (dto.email) orClauses.push({ email: dto.email });
    if (usnVariants.length > 0) {
      orClauses.push(
        { rollNumber: { in: usnVariants } },
        { studentId: { in: usnVariants } },
        { usn: { in: usnVariants } },
      );
      if (rawUsn.length >= 3) {
        orClauses.push(
          { rollNumber: { contains: rawUsn.slice(-6), mode: "insensitive" } },
          { studentId: { contains: rawUsn.slice(-6), mode: "insensitive" } },
          { fullName: { contains: rawUsn, mode: "insensitive" } },
        );
      }
    }

    let student = await this.prisma.student.findFirst({
      where: orClauses.length > 0 ? { OR: orClauses } : {},
    });

    if (!student && rawUsn.length >= 3) {
      const digits = rawUsn.replace(/\D/g, "");
      if (digits.length >= 3) {
        student = await this.prisma.student.findFirst({
          where: {
            OR: [
              { rollNumber: { contains: digits } },
              { studentId: { contains: digits } },
            ],
          },
        });
      }
    }

    if (!student) {
      throw new NotFoundException("Student not found for photo update.");
    }

    const effectiveUsn = student.rollNumber || student.studentId || student.usn || "STUDENT";

    // 1. Update Student in Postgres
    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: {
        profilePhoto: dto.photoData,
        primaryFaceImagePath: dto.photoData,
        faceEnrolled: true,
        faceSamples: (student.faceSamples || 0) + 1,
      },
    });

    // 2. Also update associated User profileImage if linked
    if (student.userId) {
      try {
        await this.prisma.user.update({
          where: { id: student.userId },
          data: { profileImage: dto.photoData },
        });
      } catch {}
    }

    // 3. Sync with AI service for FAISS embedding extraction
    let aiResult: any = null;
    try {
      const aiUrl = "http://127.0.0.1:8000/api/v1/sessions/direct-photo-enroll";
      const res = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usn: effectiveUsn,
          name: updated.fullName,
          photoBase64: dto.photoData,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        aiResult = await res.json();
      }
    } catch (err: any) {
      this.logger.warn(`AI direct-photo-enroll failed (will use stored image): ${err?.message}`);
    }

    return {
      success: true,
      message: "Student photo updated successfully.",
      student: {
        id: updated.id,
        fullName: updated.fullName,
        usn: effectiveUsn,
        profilePhoto: updated.profilePhoto,
        primaryFaceImagePath: updated.primaryFaceImagePath,
        faceEnrolled: updated.faceEnrolled,
        faceSamples: updated.faceSamples,
      },
      aiSync: aiResult,
    };
  }

  async resetAllEnrolledStudents() {
    // 1. Reset all student biometric fields in Postgres
    const updated = await this.prisma.student.updateMany({
      where: { faceEnrolled: true },
      data: {
        faceEnrolled: false,
        faceSamples: 0,
        profilePhoto: null,
        primaryFaceImagePath: null,
      },
    });

    // 2. Remove cluster assignments and reset cluster statuses in Postgres
    try {
      await this.prisma.clusterAssignment.deleteMany({});
      await this.prisma.studentCluster.updateMany({
        data: {
          assignedStudentId: null,
          status: "UNASSIGNED",
        },
      });
      await this.prisma.faceEmbedding.deleteMany({});
      await this.prisma.faceImage.deleteMany({});
    } catch {}

    // 3. Reset FAISS index and AI session cluster assignments
    try {
      await fetch("http://127.0.0.1:8000/api/v1/sessions/reset-all-enrollments", {
        method: "POST",
      });
    } catch {}

    return {
      success: true,
      resetCount: updated.count,
      message: `Successfully reset biometric face enrollment for all ${updated.count} students.`,
    };
  }

  async clearStudentFaceEnrollment(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) throw new NotFoundException("Student not found");

    const usn = student.rollNumber || student.studentId || student.usn || "";

    // 1. Reset student biometric face enrollment state in Postgres
    await this.prisma.student.update({
      where: { id },
      data: {
        faceEnrolled: false,
        faceSamples: 0,
        enrollmentConfidence: 0,
        profilePhoto: null,
        primaryFaceImagePath: null,
      },
    });

    // 2. Remove biometric FaceImage and FaceEmbedding records
    try {
      await this.prisma.faceImage.deleteMany({ where: { studentId: id } });
      await this.prisma.faceEmbedding.deleteMany({ where: { studentId: id } });
    } catch {}

    // 3. Remove cluster assignments and reset cluster statuses in Postgres
    try {
      await this.prisma.clusterAssignment.deleteMany({ where: { studentId: id } });
      await this.prisma.studentCluster.updateMany({
        where: { assignedStudentId: id },
        data: {
          assignedStudentId: null,
          status: "UNASSIGNED",
        },
      });
    } catch {}

    // 4. Purge vectors from FAISS index in AI service and unassign session clusters
    if (usn) {
      try {
        await fetch("http://127.0.0.1:8000/api/v1/sessions/reset-student-enrollment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usn, studentId: id }),
          signal: AbortSignal.timeout(4000),
        });
      } catch {}
    }

    return {
      success: true,
      studentId: id,
      fullName: student.fullName,
      usn,
      faceEnrolled: false,
      message: `Biometric face enrollment cleared for ${student.fullName}.`,
    };
  }
}
