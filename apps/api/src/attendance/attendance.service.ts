import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../_shared/enums/roles';
import type { JwtPayload } from '../_shared/types/jwt';
import {
  StartSessionDto,
  IngestAttendanceDto,
  AttendanceQueryDto,
  CorrectAttendanceDto,
} from './attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private get internalApiKey(): string {
    return (
      process.env.INTERNAL_API_KEY ||
      (process.env.NODE_ENV === 'production'
        ? ''
        : 'sc-internal-service-key-dev-only')
    );
  }

  async startSession(dto: StartSessionDto, currentUser?: JwtPayload) {
    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN')
    ) {
      if (dto.institutionId && dto.institutionId !== currentUser.institutionId) {
        throw new ForbiddenException(
          'Access denied: Cannot start session for another institution',
        );
      }
      dto.institutionId = currentUser.institutionId;
    }

    if (!dto.institutionId) {
      throw new BadRequestException('institutionId is required');
    }

    // Validate that classroom exists within institution
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        institutionId: dto.institutionId,
        OR: [{ id: dto.classroomId }, { roomNumber: dto.classroomId }],
      },
    });
    const effectiveClassroomId = classroom ? classroom.id : dto.classroomId;

    const sessionId = `SESS_${Date.now().toString(36).toUpperCase()}`;
    const session = await this.prisma.attendanceSession.create({
      data: {
        sessionId,
        institutionId: dto.institutionId,
        classroomId: effectiveClassroomId,
        teacherId: dto.teacherId,
        subjectName: dto.subjectName,
        totalStudents: dto.totalStudents || 0,
        status: 'ACTIVE',
        classSessionId: dto.classSessionId,
      },
    });

    // If not in demo mode, call FastAPI AI service to start attendance pipeline with authoritative enrolled roster
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const enrolledStudents = await this.prisma.student.findMany({
          where: { institutionId: dto.institutionId },
          select: { usn: true, rollNumber: true, studentId: true },
        });
        const enrolledUsns = Array.from(
          new Set(
            enrolledStudents
              .flatMap((s) => [s.usn, s.rollNumber, s.studentId])
              .filter((u): u is string => Boolean(u && u.trim())),
          ),
        );

        const aiServiceUrl =
          process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(
          `${aiServiceUrl}/api/v1/attendance/start`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.internalApiKey,
            },
            body: JSON.stringify({
              camera_id: effectiveClassroomId || 'webcam',
              class_id: session.sessionId,
              session_id: session.sessionId,
              source_path: '0',
              enrolled_usns: enrolledUsns,
            }),
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to start AI session: ${errText}`);
        } else {
          console.log(
            `Successfully started AI session for classroom ${effectiveClassroomId}`,
          );
        }
      } catch (err) {
        console.error('Error calling FastAPI to start session:', err);
      }
    }

    return session;
  }

  async endSession(sessionId: string, currentUser?: JwtPayload) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        OR: [{ sessionId }, { id: sessionId }],
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN') &&
      session.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException(
        'Access denied: Session belongs to another institution',
      );
    }

    const recordCount = await this.prisma.attendanceRecord.count({
      where: {
        sessionId: session.id,
        statusEnum: { in: ['PRESENT', 'LATE'] },
      },
    });

    // If not in demo mode, call FastAPI AI service to stop attendance pipeline
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const aiServiceUrl =
          process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${aiServiceUrl}/api/v1/attendance/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.internalApiKey,
          },
          body: JSON.stringify({
            camera_id: session.classroomId || 'webcam',
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to stop AI session: ${errText}`);
        } else {
          console.log(
            `Successfully stopped AI session for classroom ${session.classroomId}`,
          );
        }
      } catch (err) {
        console.error('Error calling FastAPI to stop session:', err);
      }
    }

    return this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        totalPresent: recordCount,
      },
    });
  }

  async ingest(dto: IngestAttendanceDto, currentUser?: JwtPayload) {
    if (!dto.sessionId || !dto.studentId) {
      throw new BadRequestException('sessionId and studentId are required');
    }

    // 1. Find unique AttendanceSession by id or sessionId
    let session = await this.prisma.attendanceSession.findFirst({
      where: {
        OR: [{ id: dto.sessionId }, { sessionId: dto.sessionId }],
      },
    });

    if (!session) {
      // Find latest active session for this classroom or camera
      session = await this.prisma.attendanceSession.findFirst({
        where: {
          OR: [
            { classroomId: dto.sessionId },
            { classroomId: dto.cameraId || undefined },
            { subjectName: { contains: dto.sessionId } },
          ],
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!session) {
      // Auto-create active AttendanceSession so attendance marking is never blocked
      const inst = await this.prisma.institution.findFirst({ select: { id: true } });
      session = await this.prisma.attendanceSession.create({
        data: {
          sessionId: `SESS_${Date.now().toString(36).toUpperCase()}`,
          institutionId: inst?.id || 'inst-001',
          classroomId: dto.cameraId || dto.sessionId || 'room-023',
          subjectName: '7th Sem - Machine Learning & AI (Section A)',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestException(
        `Attendance session ${dto.sessionId} is cancelled`,
      );
    }

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN') &&
      session.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException(
        'Access denied: Session belongs to another institution',
      );
    }

    // 2. Look up student by studentId, usn, rollNumber, or internal id scoped to session's institution
    const student = await this.prisma.student.findFirst({
      where: {
        institutionId: session.institutionId,
        OR: [
          { id: dto.studentId },
          { studentId: dto.studentId },
          { usn: dto.studentId },
          { rollNumber: dto.studentId },
        ],
      },
    });
    if (!student) {
      throw new NotFoundException(
        `Student with identifier ${dto.studentId} not found in institution ${session.institutionId}`,
      );
    }

    // 3. Conflict-safe atomic upsert on AttendanceRecord using composite unique key (sessionId, studentId)
    const targetStatus = (dto.status || 'PRESENT') as any;
    const recognitionSource = dto.method === 'MANUAL' ? 'MANUAL' : 'FACE_AI';

    const record = await this.prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id,
        },
      },
      update: {
        confidence: Math.max(dto.confidence ?? 0, 0),
        confidenceScore: dto.confidence,
        markedAt: new Date(),
        studentName: dto.studentName || student.fullName,
        cameraId: dto.cameraId,
        statusEnum: targetStatus,
        recognitionSource,
      },
      create: {
        sessionId: session.id,
        studentId: student.id,
        studentName: dto.studentName || student.fullName,
        confidence: dto.confidence ?? 0,
        confidenceScore: dto.confidence,
        cameraId: dto.cameraId,
        method: dto.method || 'FACE_RECOGNITION',
        statusEnum: targetStatus,
        recognitionSource,
      },
    });

    // 4. Update student's last attendance time
    await this.prisma.student.update({
      where: { id: student.id },
      data: { lastAttendanceTime: new Date() },
    });

    // 5. Update session's totalPresent count accurately
    const totalPresent = await this.prisma.attendanceRecord.count({
      where: {
        sessionId: session.id,
        statusEnum: { in: ['PRESENT', 'LATE'] },
      },
    });
    await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: { totalPresent },
    });

    return record;
  }

  async correctAttendance(
    recordId: string,
    dto: CorrectAttendanceDto,
    currentUser: JwtPayload,
  ) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { session: true },
    });
    if (!record) {
      throw new NotFoundException(`Attendance record ${recordId} not found`);
    }

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN') &&
      record.session.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException(
        'Access denied: Record belongs to another institution',
      );
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE'];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status: ${dto.status}. Must be PRESENT, ABSENT, or LATE.`,
      );
    }

    // Perform correction audit log and record update in atomic transaction
    const [correction, updatedRecord] = await this.prisma.$transaction([
      this.prisma.attendanceCorrection.create({
        data: {
          attendanceRecordId: record.id,
          correctedById: currentUser.sub || currentUser.id,
          oldStatus: record.statusEnum,
          newStatus: dto.status as any,
          reason: dto.reason || 'Manual attendance correction',
        },
      }),
      this.prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          statusEnum: dto.status as any,
          method: 'MANUAL',
          recognitionSource: 'MANUAL',
        },
      }),
    ]);

    // Recalculate session totalPresent
    const totalPresent = await this.prisma.attendanceRecord.count({
      where: {
        sessionId: record.sessionId,
        statusEnum: { in: ['PRESENT', 'LATE'] },
      },
    });
    await this.prisma.attendanceSession.update({
      where: { id: record.sessionId },
      data: { totalPresent },
    });

    return {
      success: true,
      record: updatedRecord,
      correction,
      totalPresent,
    };
  }

  async getLiveStatus(sessionId: string, currentUser?: JwtPayload) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        OR: [{ sessionId }, { id: sessionId }],
      },
      include: {
        records: {
          orderBy: { markedAt: 'desc' },
          take: 50,
          include: {
            student: true,
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN') &&
      session.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException(
        'Access denied: Session belongs to another institution',
      );
    }

    // Look up classroom details
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: session.classroomId },
    });

    // Look up teacher details
    const teacher = session.teacherId
      ? await this.prisma.teacher.findUnique({
          where: { id: session.teacherId },
        })
      : null;

    const totalPresent = await this.prisma.attendanceRecord.count({
      where: {
        sessionId: session.id,
        statusEnum: { in: ['PRESENT', 'LATE'] },
      },
    });

    const recentEvents = session.records.slice(0, 20).map((r) => ({
      type: 'ATTENDANCE_DETECTED',
      studentId: r.student ? r.student.studentId : r.studentId, // This is the USN
      studentName: r.studentName,
      confidence: r.confidence,
      time: r.markedAt.toLocaleTimeString(),
    }));

    const presentStudents = session.records
      .filter((r) => r.statusEnum === 'PRESENT' || r.statusEnum === 'LATE')
      .map((r) => ({
        id: r.student ? r.student.studentId : r.studentId, // USN
        name: r.studentName,
        confidence: r.confidence,
        status: r.statusEnum,
      }));

    return {
      sessionId: session.sessionId,
      classroomId: session.classroomId,
      classroomName: classroom ? classroom.roomNumber : session.classroomId,
      subjectName: session.subjectName || 'Subject',
      teacherName: teacher ? teacher.fullName : 'Teacher',
      status: session.status,
      totalPresent,
      totalStudents: session.totalStudents,
      startedAt: session.startedAt,
      recentEvents,
      presentStudents,
    };
  }

  async getSessionHistory(sessionId: string, currentUser?: JwtPayload) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        OR: [{ sessionId }, { id: sessionId }],
      },
      include: {
        records: {
          orderBy: { markedAt: 'desc' },
          include: { student: true, corrections: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN') &&
      session.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException(
        'Access denied: Session belongs to another institution',
      );
    }

    return session;
  }

  async getStudentAnalytics(studentId: string, currentUser?: JwtPayload) {
    // 1. Resolve student across id, studentId, usn, or rollNumber
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentId },
          { usn: studentId },
          { rollNumber: studentId },
        ],
      },
      include: {
        department: true,
        course: true,
        institution: true,
      },
    });

    if (!student) {
      if (
        currentUser &&
        (currentUser.roles?.includes(RoleName.STUDENT) ||
          currentUser.roles?.includes('STUDENT'))
      ) {
        throw new ForbiddenException(
          'Access denied: Students can only view their own attendance analytics',
        );
      }
      throw new NotFoundException(`Student ${studentId} not found`);
    }

    if (currentUser) {
      const isSuperAdmin =
        currentUser.roles?.includes(RoleName.SUPER_ADMIN) ||
        currentUser.roles?.includes('SUPER_ADMIN');
      const isStudent =
        currentUser.roles?.includes(RoleName.STUDENT) ||
        currentUser.roles?.includes('STUDENT');

      if (isStudent) {
        const isSelf =
          student.id === currentUser.id ||
          student.userId === currentUser.id ||
          student.userId === currentUser.sub ||
          student.email === currentUser.email;
        if (!isSelf) {
          throw new ForbiddenException(
            'Access denied: Students can only view their own attendance analytics',
          );
        }
      } else if (!isSuperAdmin && currentUser.institutionId) {
        if (student.institutionId !== currentUser.institutionId) {
          throw new ForbiddenException(
            'Access denied: Student belongs to another institution',
          );
        }
      }
    }

    // 3. Fetch student attendance records by internal database ID (student.id)
    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: { session: true },
      orderBy: { markedAt: 'desc' },
      take: 100,
    });

    // 4. Fetch eligible conducted sessions for institution (excluding CANCELLED)
    const eligibleSessions = await this.prisma.attendanceSession.findMany({
      where: {
        institutionId: student.institutionId,
        status: { not: 'CANCELLED' },
      },
    });
    const totalEligibleSessions = eligibleSessions?.length || 0;

    // Attended sessions: records where status is PRESENT or LATE (or default)
    const attendedRecords = records.filter(
      (r) =>
        r.statusEnum === 'PRESENT' ||
        r.statusEnum === 'LATE' ||
        (!r.statusEnum && r.confidence > 0),
    );
    const attendedSessions = new Set(attendedRecords.map((r) => r.sessionId))
      .size;

    // Calculate database-backed attendance rate
    // Distinguish no conducted sessions (rate: null) from 0% attendance
    let attendanceRate: number | null = null;
    if (totalEligibleSessions > 0) {
      attendanceRate = Number(
        ((attendedSessions / totalEligibleSessions) * 100).toFixed(1),
      );
    }

    // Calculate biometric recognition confidence average (NOT attendance percentage!)
    const recordsWithConfidence = records.filter(
      (r) => r.confidence && r.confidence > 0,
    );
    const biometricConfidenceAverage =
      recordsWithConfidence.length > 0
        ? Number(
            (
              recordsWithConfidence.reduce((s, r) => s + r.confidence, 0) /
              recordsWithConfidence.length
            ).toFixed(3),
          )
        : null;

    return {
      studentId: student.studentId || student.usn || student.id,
      internalId: student.id,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      department: student.department?.name,
      course: student.course?.name,
      semester: student.semester,
      section: student.section,
      attendanceRate,
      attendedSessions,
      totalEligibleSessions,
      totalRecords: records.length,
      biometricConfidenceAverage,
      recentRecords: records.slice(0, 20),
    };
  }

  async query(queryDto: AttendanceQueryDto, currentUser?: JwtPayload) {
    const where: any = {};
    if (queryDto.sessionId) where.sessionId = queryDto.sessionId;
    if (queryDto.studentId) {
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { id: queryDto.studentId },
            { studentId: queryDto.studentId },
            { usn: queryDto.studentId },
            { rollNumber: queryDto.studentId },
          ],
        },
      });
      where.studentId = student ? student.id : queryDto.studentId;
    }
    if (queryDto.classroomId)
      where.session = { classroomId: queryDto.classroomId };
    if (queryDto.fromDate)
      where.markedAt = { ...where.markedAt, gte: new Date(queryDto.fromDate) };
    if (queryDto.toDate)
      where.markedAt = { ...where.markedAt, lte: new Date(queryDto.toDate) };

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN')
    ) {
      where.session = {
        ...where.session,
        institutionId: currentUser.institutionId,
      };
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { markedAt: 'desc' },
        include: { session: true, student: true },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async reportUnknownFace(
    institutionId: string,
    classroomId: string,
    cameraId?: string,
  ) {
    return this.prisma.unknownFace.create({
      data: { institutionId, classroomId, cameraId },
    });
  }

  async getUnknownFaces(page: number = 1, limit: number = 10) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces?page=${page}&limit=${limit}`,
        {
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        result.data = result.data.map((item: any) => ({
          ...item,
          preview_image: item.preview_image
            ? `${aiServiceUrl.replace(/\/+$/, '')}/${String(item.preview_image).replace(/^\/+/, '')}`
            : null,
          image_path: item.image_path
            ? `${aiServiceUrl.replace(/\/+$/, '')}/${String(item.image_path).replace(/^\/+/, '')}`
            : null,
        }));
      }
      return result;
    } catch (err) {
      console.error('Error fetching unknown faces from AI service:', err);
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }
  }

  async getUnknownFaceById(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces/${id}`,
        {
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const item = await response.json();
      return {
        ...item,
        preview_image: item.preview_image
          ? `${aiServiceUrl}/${item.preview_image}`
          : null,
        image_path: item.image_path
          ? `${aiServiceUrl}/${item.image_path}`
          : null,
      };
    } catch (err) {
      console.error(`Error fetching unknown face ${id} from AI service:`, err);
      throw err;
    }
  }

  async deleteUnknownFace(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces/${id}`,
        {
          method: 'DELETE',
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error(`Error deleting unknown face ${id} from AI service:`, err);
      throw err;
    }
  }

  async assignUnknownFace(
    id: string,
    dto: { studentId: string; studentUsn?: string },
    userId?: string,
  ) {
    // 1. Verify student exists in PostgreSQL
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { id: dto.studentId },
          { usn: dto.studentUsn || dto.studentId },
          { rollNumber: dto.studentUsn || dto.studentId },
          { studentId: dto.studentUsn || dto.studentId },
        ],
      },
    });
    if (!student) {
      throw new NotFoundException(
        `Student ${dto.studentId} not found in roster`,
      );
    }

    const studentUsn = student.usn || student.rollNumber || student.studentId;

    // 2. Call AI service to update FAISS recognition index and mark observation resolved
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':
          this.internalApiKey,
      },
      body: JSON.stringify({
        id,
        student_usn: studentUsn,
        student_id: student.id,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI service assign failed: ${errText}`);
    }

    const aiResult = await res.json();

    // 3. Durably persist embedding in PostgreSQL FaceEmbedding table
    if (aiResult.embedding && Array.isArray(aiResult.embedding)) {
      await this.prisma.faceEmbedding.create({
        data: {
          studentId: student.id,
          embeddingVector: JSON.stringify(aiResult.embedding),
          confidence: aiResult.quality_score || 0.85,
          thumbnailPath: aiResult.image_path || null,
          metadata: JSON.stringify({
            source: 'LIVE_MONITORING_UNKNOWN_ASSIGNMENT',
            assignedAt: new Date().toISOString(),
            assignedBy: userId || 'teacher',
            unknownFaceId: id,
            clusterId: aiResult.cluster_id,
            imagePath: aiResult.image_path,
          }),
        },
      });
    }

    // 4. Update student profile and face enrollment counter
    await this.prisma.student.update({
      where: { id: student.id },
      data: {
        faceEnrolled: true,
        faceSamples: { increment: 1 },
        ...(aiResult.image_path
          ? {
              primaryFaceImagePath:
                student.primaryFaceImagePath || aiResult.image_path,
              profilePhoto: student.profilePhoto || aiResult.image_path,
            }
          : {}),
      },
    });

    // 5. Create audit record in EnrollmentHistory
    await this.prisma.enrollmentHistory.create({
      data: {
        studentId: student.id,
        performedById: userId || 'system',
        action: 'LIVE_MONITORING_UNKNOWN_ASSIGNMENT',
        metadata: JSON.stringify({
          unknownFaceId: id,
          clusterId: aiResult.cluster_id,
          quality: aiResult.quality_score,
          assignedAt: new Date().toISOString(),
        }),
      },
    });

    // 6. If matching record exists in Prisma UnknownFace table, mark resolved
    try {
      await this.prisma.unknownFace.updateMany({
        where: { id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedById: userId || 'teacher',
        },
      });
    } catch {
      // Non-fatal if ID format differs
    }

    return {
      success: true,
      message: `Assigned observation to ${student.fullName} (${studentUsn})`,
      student: {
        id: student.id,
        fullName: student.fullName,
        usn: studentUsn,
      },
      aiResult,
    };
  }

  async keepUnknownFace(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(
      `${aiServiceUrl}/api/v1/unknown-faces/${id}/keep-unknown`,
      {
        method: 'POST',
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      },
    );
    if (!res.ok) {
      throw new Error(`AI service keep-unknown failed: ${res.status}`);
    }
    return res.json();
  }

  async dismissUnknownFace(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(
      `${aiServiceUrl}/api/v1/unknown-faces/${id}/dismiss`,
      {
        method: 'POST',
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      },
    );
    if (!res.ok) {
      throw new Error(`AI service dismiss failed: ${res.status}`);
    }
    return res.json();
  }

  async enrollUnknown(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces/enroll`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key':
              this.internalApiKey,
          },
          body: JSON.stringify(dto),
        },
      );
      if (!response.ok) {
        throw new Error(
          `AI service returned ${response.status}: ${await response.text()}`,
        );
      }
      return response.json();
    } catch (err) {
      console.error('Error enrolling unknown face in AI service:', err);
      throw err;
    }
  }

  async markVisitor(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces/visitor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key':
              this.internalApiKey,
          },
          body: JSON.stringify(dto),
        },
      );
      if (!response.ok) {
        throw new Error(
          `AI service returned ${response.status}: ${await response.text()}`,
        );
      }
      return response.json();
    } catch (err) {
      console.error('Error marking visitor in AI service:', err);
      throw err;
    }
  }

  async ignoreUnknown(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces/ignore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key':
              this.internalApiKey,
          },
          body: JSON.stringify(dto),
        },
      );
      if (!response.ok) {
        throw new Error(
          `AI service returned ${response.status}: ${await response.text()}`,
        );
      }
      return response.json();
    } catch (err) {
      console.error('Error ignoring unknown face in AI service:', err);
      throw err;
    }
  }

  async triggerAlert(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/unknown-faces/alert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key':
              this.internalApiKey,
          },
          body: JSON.stringify(dto),
        },
      );
      if (!response.ok) {
        throw new Error(
          `AI service returned ${response.status}: ${await response.text()}`,
        );
      }
      return response.json();
    } catch (err) {
      console.error('Error triggering security alert in AI service:', err);
      throw err;
    }
  }

  async runOptimizer() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/optimizer/run`, {
        method: 'POST',
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error('Error triggering face optimizer:', err);
      throw err;
    }
  }

  async rollbackProfile(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/optimizer/rollback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key':
              this.internalApiKey,
          },
          body: JSON.stringify(dto),
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error('Error rolling back student profile version:', err);
      throw err;
    }
  }

  async getClustersList() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/clusters`, {
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const clusters = await response.json();
      if (Array.isArray(clusters)) {
        return clusters.map((cluster: any) => ({
          ...cluster,
          representative_image: cluster.representative_image
            ? `${aiServiceUrl}/${cluster.representative_image}`
            : null,
        }));
      }
      return clusters;
    } catch (err) {
      console.error('Error fetching clusters from AI service:', err);
      return [];
    }
  }

  async getClusterById(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/clusters/${id}`, {
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const cluster = await response.json();
      if (cluster) {
        if (cluster.representative_image) {
          cluster.representative_image = `${aiServiceUrl}/${cluster.representative_image}`;
        }
        if (Array.isArray(cluster.faces)) {
          cluster.faces = cluster.faces.map((face: any) => ({
            ...face,
            image_path: face.image_path
              ? `${aiServiceUrl}/${face.image_path}`
              : null,
          }));
        }
      }
      return cluster;
    } catch (err) {
      console.error(`Error fetching cluster ${id} from AI service:`, err);
      throw err;
    }
  }

  async deleteCluster(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/clusters/${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error(`Error deleting cluster ${id} from AI service:`, err);
      throw err;
    }
  }

  async getCandidates(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      let url = `${aiServiceUrl}/api/v1/learning/candidates?page=${page}&limit=${limit}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const response = await fetch(url, {
        headers: {
          'x-api-key':
            this.internalApiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        result.data = result.data.map((item: any) => ({
          ...item,
          image_path: item.image_path
            ? `${aiServiceUrl}/${item.image_path}`
            : null,
        }));
      }
      return result;
    } catch (err) {
      console.error('Error fetching candidates from AI service:', err);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        limit,
        total_pages: 0,
      };
    }
  }

  async getCandidateStats() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/learning/candidates/stats`,
        {
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error('Error fetching candidate stats from AI service:', err);
      return {
        success: false,
        data: { total: 0, approved: 0, rejected: 0, pending: 0 },
      };
    }
  }

  async getCandidateById(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/learning/candidates/${id}`,
        {
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const result = await response.json();
      if (result && result.data) {
        result.data.image_path = result.data.image_path
          ? `${aiServiceUrl}/${result.data.image_path}`
          : null;
      }
      return result;
    } catch (err) {
      console.error(`Error fetching candidate ${id} from AI service:`, err);
      throw err;
    }
  }

  async approveCandidate(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/learning/candidates/${id}/approve`,
        {
          method: 'POST',
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error(`Error approving candidate ${id} via AI service:`, err);
      throw err;
    }
  }

  async rejectCandidate(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${aiServiceUrl}/api/v1/learning/candidates/${id}/reject`,
        {
          method: 'POST',
          headers: {
            'x-api-key':
              this.internalApiKey,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error(`Error rejecting candidate ${id} via AI service:`, err);
      throw err;
    }
  }

  async processVideoAttendance(
    sessionId: string,
    videoPath: string,
    classId?: string,
    currentUser?: JwtPayload,
  ) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        OR: [{ sessionId }, { id: sessionId }],
      },
    });
    if (!session) throw new NotFoundException('Attendance session not found');

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN') &&
      session.institutionId !== currentUser.institutionId
    ) {
      throw new ForbiddenException(
        'Access denied: Session belongs to another institution',
      );
    }

    if (!videoPath) {
      throw new BadRequestException('videoPath is required');
    }

    const enrolledStudents = await this.prisma.student.findMany({
      where: { institutionId: session.institutionId },
      select: { usn: true, rollNumber: true, studentId: true },
    });
    const enrolledUsns = Array.from(
      new Set(
        enrolledStudents
          .flatMap((s) => [s.usn, s.rollNumber, s.studentId])
          .filter((u): u is string => Boolean(u && u.trim())),
      ),
    );

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const res = await fetch(`${aiServiceUrl}/api/v1/attendance/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.internalApiKey,
      },
      body: JSON.stringify({
        video_path: videoPath,
        class_id: session.sessionId,
        session_id: session.sessionId,
        confidence_threshold: 0.58,
        required_confirmations: 3,
        enrolled_usns: enrolledUsns,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI service video attendance failed: ${errText}`);
    }

    const aiResult = await res.json();
    const data = aiResult.data || {};
    const confirmedList = data.confirmed_attendance || [];

    for (const item of confirmedList) {
      const student = await this.prisma.student.findFirst({
        where: {
          institutionId: session.institutionId,
          OR: [
            { rollNumber: item.usn },
            { usn: item.usn },
            { studentId: item.usn },
            { id: item.usn },
          ],
        },
      });

      if (student) {
        await this.prisma.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: student.id,
            },
          },
          update: {
            confidence: Math.max(item.confidence ?? 0, 0),
            confidenceScore: item.confidence,
            markedAt: new Date(),
            studentName: student.fullName,
            statusEnum: 'PRESENT',
            recognitionSource: 'FACE_AI',
          },
          create: {
            sessionId: session.id,
            studentId: student.id,
            studentName: student.fullName,
            confidence: item.confidence ?? 0,
            confidenceScore: item.confidence,
            method: 'FACE_RECOGNITION',
            statusEnum: 'PRESENT',
            recognitionSource: 'FACE_AI',
          },
        });
      }
    }

    const totalPresent = await this.prisma.attendanceRecord.count({
      where: {
        sessionId: session.id,
        statusEnum: { in: ['PRESENT', 'LATE'] },
      },
    });

    await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        totalPresent,
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    return {
      sessionId: session.sessionId,
      aiSummary: data,
      totalPresent,
      message: `Processed video attendance. Marked ${totalPresent} students PRESENT.`,
    };
  }
}
