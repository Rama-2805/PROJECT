import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StartSessionDto, IngestAttendanceDto, AttendanceQueryDto } from "./attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async startSession(dto: StartSessionDto) {
    const sessionId = `SESS_${Date.now().toString(36).toUpperCase()}`;
    const session = await this.prisma.attendanceSession.create({
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

    // If not in demo mode, call FastAPI AI service to start attendance pipeline
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
        const response = await fetch(`${aiServiceUrl}/api/v1/attendance/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
          },
          body: JSON.stringify({
            camera_id: dto.classroomId || "webcam",
            class_id: sessionId,
            source_path: "0",
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to start AI session: ${errText}`);
        } else {
          console.log(`Successfully started AI session for classroom ${dto.classroomId}`);
        }
      } catch (err) {
        console.error("Error calling FastAPI to start session:", err);
      }
    }

    return session;
  }

  async endSession(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { sessionId },
    });
    if (!session) throw new NotFoundException("Session not found");

    const recordCount = await this.prisma.attendanceRecord.count({
      where: { sessionId: session.id },
    });

    // If not in demo mode, call FastAPI AI service to stop attendance pipeline
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
        const response = await fetch(`${aiServiceUrl}/api/v1/attendance/stop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
          },
          body: JSON.stringify({
            camera_id: session.classroomId || "webcam",
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to stop AI session: ${errText}`);
        } else {
          console.log(`Successfully stopped AI session for classroom ${session.classroomId}`);
        }
      } catch (err) {
        console.error("Error calling FastAPI to stop session:", err);
      }
    }

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
    // 1. Look up student by studentId (USN)
    const student = await this.prisma.student.findFirst({
      where: { studentId: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with USN/ID ${dto.studentId} not found`);
    }

    // 2. Find unique AttendanceSession by sessionId (either cuid or SESS_...)
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        OR: [
          { id: dto.sessionId },
          { sessionId: dto.sessionId },
        ],
      },
    });
    if (!session) {
      throw new NotFoundException(`Attendance session ${dto.sessionId} not found`);
    }

    // 3. Check for duplicate in same session using CUIDs
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id,
        },
      },
    });

    if (existing) return existing; // Already marked — skip duplicate

    // 4. Create attendance record
    const record = await this.prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        studentName: dto.studentName || student.fullName,
        confidence: dto.confidence,
        cameraId: dto.cameraId,
        method: dto.method || "FACE_RECOGNITION",
      },
    });

    // 5. Update student's last attendance time
    await this.prisma.student.update({
      where: { id: student.id },
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
          include: {
            student: true,
          },
        },
      },
    });

    if (!session) throw new NotFoundException("Session not found");

    // Look up classroom details
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: session.classroomId },
    });

    // Look up teacher details
    const teacher = session.teacherId ? await this.prisma.teacher.findUnique({
      where: { id: session.teacherId },
    }) : null;

    const totalPresent = await this.prisma.attendanceRecord.count({
      where: { sessionId: session.id },
    });

    const recentEvents = session.records.slice(0, 20).map((r) => ({
      type: "ATTENDANCE_DETECTED",
      studentId: r.student ? r.student.studentId : r.studentId, // This is the USN
      studentName: r.studentName,
      confidence: r.confidence,
      time: r.markedAt.toLocaleTimeString(),
    }));

    const presentStudents = session.records.map((r) => ({
      id: r.student ? r.student.studentId : r.studentId, // USN
      name: r.studentName,
      confidence: r.confidence,
    }));

    return {
      sessionId: session.sessionId,
      classroomId: session.classroomId,
      classroomName: classroom ? classroom.roomNumber : session.classroomId,
      subjectName: session.subjectName || "Subject",
      teacherName: teacher ? teacher.fullName : "Teacher",
      status: session.status,
      totalPresent,
      totalStudents: session.totalStudents,
      startedAt: session.startedAt,
      recentEvents,
      presentStudents,
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

  async getUnknownFaces(page: number = 1, limit: number = 10) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces?page=${page}&limit=${limit}`, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        result.data = result.data.map((item: any) => ({
          ...item,
          preview_image: item.preview_image ? `${aiServiceUrl}/${item.preview_image}` : null,
          image_path: item.image_path ? `${aiServiceUrl}/${item.image_path}` : null,
        }));
      }
      return result;
    } catch (err) {
      console.error("Error fetching unknown faces from AI service:", err);
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }
  }

  async getUnknownFaceById(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/${id}`, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const item = await response.json();
      return {
        ...item,
        preview_image: item.preview_image ? `${aiServiceUrl}/${item.preview_image}` : null,
        image_path: item.image_path ? `${aiServiceUrl}/${item.image_path}` : null,
      };
    } catch (err) {
      console.error(`Error fetching unknown face ${id} from AI service:`, err);
      throw err;
    }
  }

  async deleteUnknownFace(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/${id}`, {
        method: "DELETE",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error(`Error deleting unknown face ${id} from AI service:`, err);
      throw err;
    }
  }

  async enrollUnknown(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}: ${await response.text()}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error enrolling unknown face in AI service:", err);
      throw err;
    }
  }

  async markVisitor(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/visitor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}: ${await response.text()}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error marking visitor in AI service:", err);
      throw err;
    }
  }

  async ignoreUnknown(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/ignore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}: ${await response.text()}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error ignoring unknown face in AI service:", err);
      throw err;
    }
  }

  async triggerAlert(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/unknown-faces/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}: ${await response.text()}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error triggering security alert in AI service:", err);
      throw err;
    }
  }

  async runOptimizer() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/optimizer/run`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error triggering face optimizer:", err);
      throw err;
    }
  }

  async rollbackProfile(dto: any) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/optimizer/rollback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
        body: JSON.stringify(dto),
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error rolling back student profile version:", err);
      throw err;
    }
  }

  async getClustersList() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/clusters`, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
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
      console.error("Error fetching clusters from AI service:", err);
      return [];
    }
  }

  async getClusterById(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/clusters/${id}`, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
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
            image_path: face.image_path ? `${aiServiceUrl}/${face.image_path}` : null,
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
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/clusters/${id}`, {
        method: "DELETE",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
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

  async getCandidates(page: number = 1, limit: number = 10, status?: string, search?: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      let url = `${aiServiceUrl}/api/v1/learning/candidates?page=${page}&limit=${limit}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const response = await fetch(url, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        result.data = result.data.map((item: any) => ({
          ...item,
          image_path: item.image_path ? `${aiServiceUrl}/${item.image_path}` : null,
        }));
      }
      return result;
    } catch (err) {
      console.error("Error fetching candidates from AI service:", err);
      return { success: false, data: [], total: 0, page, limit, total_pages: 0 };
    }
  }

  async getCandidateStats() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/learning/candidates/stats`, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error("Error fetching candidate stats from AI service:", err);
      return { success: false, data: { total: 0, approved: 0, rejected: 0, pending: 0 } };
    }
  }

  async getCandidateById(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/learning/candidates/${id}`, {
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      const result = await response.json();
      if (result && result.data) {
        result.data.image_path = result.data.image_path ? `${aiServiceUrl}/${result.data.image_path}` : null;
      }
      return result;
    } catch (err) {
      console.error(`Error fetching candidate ${id} from AI service:`, err);
      throw err;
    }
  }

  async approveCandidate(id: string) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/learning/candidates/${id}/approve`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
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
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/learning/candidates/${id}/reject`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY || "dev-encryption-key-32-bytes-long!!",
        },
      });
      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`);
      }
      return response.json();
    } catch (err) {
      console.error(`Error rejecting candidate ${id} via AI service:`, err);
      throw err;
    }
  }
}
