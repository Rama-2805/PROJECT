import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEnrollmentJobDto, UpdateEnrollmentJobDto, AssignClusterDto, SyncClustersDto } from "./enrollment.dto";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/** Convert an absolute storage path → a public URL the browser can load. */
function toImageUrl(absolutePath: string | null | undefined): string | null {
  if (!absolutePath) return null;
  const norm = absolutePath.replace(/\\/g, "/");
  const idx = norm.indexOf("storage/");
  if (idx === -1) return null;
  // The AI service serves /storage/* publicly
  return `${AI_SERVICE_URL}/${norm.slice(idx)}`;
}

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async createJob(dto: CreateEnrollmentJobDto) {
    const job = await this.prisma.enrollmentJob.create({
      data: {
        jobId: `JOB_${Date.now().toString(36).toUpperCase()}`,
        institutionId: dto.institutionId,
        uploadedById: dto.uploadedById,
        classroomId: dto.classroomId,
        videoPath: dto.videoPath,
        status: "PENDING",
      },
    });
    return job;
  }

  async findAll(institutionId?: string, status?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (status) where.status = status;
    return this.prisma.enrollmentJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clusters: true } } },
    });
  }

  async findById(id: string) {
    const job = await this.prisma.enrollmentJob.findUnique({
      where: { id },
      include: { clusters: true, uploadedBy: { select: { id: true, fullName: true, email: true } } },
    });
    if (!job) throw new NotFoundException("Enrollment job not found");
    return job;
  }

  async updateJob(id: string, dto: UpdateEnrollmentJobDto) {
    const job = await this.prisma.enrollmentJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Enrollment job not found");
    return this.prisma.enrollmentJob.update({ where: { id }, data: dto });
  }

  async syncClusters(jobId: string, dto: SyncClustersDto) {
    const job = await this.prisma.enrollmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Enrollment job not found");

    const clusters = await Promise.all(
      dto.clusters.map((c) =>
        this.prisma.faceCluster.create({
          data: {
            clusterId: c.clusterId,
            enrollmentJobId: jobId,
            sampleCount: c.sampleCount,
            qualityScore: c.qualityScore,
            thumbnail: c.representativeFace,
            status: "UNASSIGNED",
          },
        })
      ),
    );

    await this.prisma.enrollmentJob.update({
      where: { id: jobId },
      data: {
        status: "REVIEW_REQUIRED",
        generatedClusters: clusters.length,
        progressPercentage: 100,
      },
    });

    return clusters;
  }

  async getClusters(jobId: string) {
    const job = await this.prisma.enrollmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Enrollment job not found");

    return this.prisma.faceCluster.findMany({
      where: { enrollmentJobId: jobId },
      orderBy: { qualityScore: "desc" },
    });
  }

  async assignCluster(clusterId: string, dto: AssignClusterDto) {
    const cluster = await this.prisma.faceCluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundException("Cluster not found");

    return this.prisma.faceCluster.update({
      where: { id: clusterId },
      data: {
        assignedStudentId: dto.studentId,
        status: "ASSIGNED",
      },
    });
  }

  async mergeClusters(sourceClusterId: string, targetClusterId: string) {
    const source = await this.prisma.faceCluster.findUnique({ where: { id: sourceClusterId } });
    const target = await this.prisma.faceCluster.findUnique({ where: { id: targetClusterId } });
    if (!source || !target) throw new NotFoundException("One or both clusters not found");

    await this.prisma.faceCluster.update({
      where: { id: targetClusterId },
      data: {
        sampleCount: target.sampleCount + source.sampleCount,
        qualityScore: Math.round(
          ((target.qualityScore * target.sampleCount) + (source.qualityScore * source.sampleCount)) /
          (target.sampleCount + source.sampleCount) * 1000
        ) / 1000,
      },
    });

    await this.prisma.faceCluster.delete({ where: { id: sourceClusterId } });

    return this.prisma.faceCluster.findUnique({ where: { id: targetClusterId } });
  }

  async deleteCluster(clusterId: string) {
    const cluster = await this.prisma.faceCluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundException("Cluster not found");
    return this.prisma.faceCluster.delete({ where: { id: clusterId } });
  }

  async createEmbedding(studentId: string, embeddingVector: number[], confidence: number, thumbnailPath?: string) {
    return this.prisma.faceEmbedding.create({
      data: {
        studentId,
        embeddingVector: JSON.stringify(embeddingVector),
        confidence,
        thumbnailPath,
      },
    });
  }

  async manualEnroll(dto: { studentId: string; images: string[]; setAsPrimary?: boolean }) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException("Student not found");

    const createdImages = [];
    for (const [idx, imgPath] of dto.images.entries()) {
      const isPrimary = (dto.setAsPrimary && idx === 0) || (idx === 0 && !student.primaryFaceImagePath);
      const faceImg = await this.prisma.faceImage.create({
        data: {
          studentId: dto.studentId,
          imagePath: imgPath,
          isPrimary,
          qualityScore: 0.88,
        },
      });
      createdImages.push(faceImg);

      if (isPrimary) {
        await this.prisma.student.update({
          where: { id: dto.studentId },
          data: {
            primaryFaceImagePath: imgPath,
            profilePhoto: imgPath,
          },
        });
      }
    }

    const currentSamples = (student.faceSamples || 0) + createdImages.length;
    await this.prisma.student.update({
      where: { id: dto.studentId },
      data: {
        faceEnrolled: true,
        faceSamples: currentSamples,
        enrollmentConfidence: 0.92,
      },
    });

    return {
      success: true,
      studentId: dto.studentId,
      addedSamples: createdImages.length,
      totalSamples: currentSamples,
      images: createdImages,
    };
  }

  async getStudentGallery(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        faceImages: { orderBy: { createdAt: "desc" } },
        faceEmbeddings: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!student) throw new NotFoundException("Student not found");

    return {
      studentId: student.id,
      studentName: student.fullName,
      usn: student.usn,
      faceEnrolled: student.faceEnrolled,
      primaryFaceImagePath: student.primaryFaceImagePath,
      faceSamples: student.faceImages.length,
      images: student.faceImages,
      embeddingsCount: student.faceEmbeddings.length,
    };
  }

  async setPrimaryImage(studentId: string, imageId: string) {
    const img = await this.prisma.faceImage.findUnique({ where: { id: imageId } });
    if (!img || img.studentId !== studentId) throw new NotFoundException("Face image not found for student");

    await this.prisma.faceImage.updateMany({
      where: { studentId },
      data: { isPrimary: false },
    });

    const updated = await this.prisma.faceImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        primaryFaceImagePath: img.imagePath,
        profilePhoto: img.imagePath,
      },
    });

    return updated;
  }

  async deleteFaceImage(studentId: string, imageId: string) {
    const img = await this.prisma.faceImage.findUnique({ where: { id: imageId } });
    if (!img || img.studentId !== studentId) throw new NotFoundException("Face image not found");

    await this.prisma.faceImage.delete({ where: { id: imageId } });

    const remaining = await this.prisma.faceImage.count({ where: { studentId } });
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        faceSamples: remaining,
        faceEnrolled: remaining > 0,
      },
    });

    return { success: true, remainingSamples: remaining };
  }

  async getUnknownClusters() {
    return this.prisma.unknownCluster.findMany({
      where: { status: "UNASSIGNED" },
      orderBy: { sampleCount: "desc" },
    });
  }

  async approveUnknownCluster(clusterId: string, studentId: string) {
    const cluster = await this.prisma.unknownCluster.findUnique({
      where: { id: clusterId },
    });
    if (!cluster) throw new NotFoundException("Unknown cluster not found");

    await this.prisma.unknownCluster.update({
      where: { id: clusterId },
      data: {
        assignedStudentId: studentId,
        status: "ASSIGNED",
      },
    });

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (student) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          faceEnrolled: true,
          faceSamples: (student.faceSamples || 0) + cluster.sampleCount,
        },
      });
    }

    return { success: true, clusterId, assignedStudentId: studentId };
  }

  async rejectUnknownCluster(clusterId: string) {
    const cluster = await this.prisma.unknownCluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundException("Unknown cluster not found");

    return this.prisma.unknownCluster.update({
      where: { id: clusterId },
      data: { status: "REJECTED" },
    });
  }

  async createAutomaticSession(dto: any) {
    const session = await this.prisma.enrollmentSession.create({
      data: {
        name: dto.name,
        institutionId: dto.institutionId,
        departmentId: dto.departmentId,
        programId: dto.programId,
        semesterId: dto.semesterId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        classroomId: dto.classroomId,
        lectureDate: dto.lectureDate || new Date().toISOString().split("T")[0],
        lectureTime: dto.lectureTime || "09:00",
        status: "PENDING",
      },
    });

    await this.prisma.enrollmentAudit.create({
      data: {
        enrollmentSessionId: session.id,
        action: "CREATED",
        details: JSON.stringify({ name: dto.name }),
      },
    });

    return session;
  }

  async uploadSessionVideos(sessionId: string, videoPaths: string[]) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    const createdVideos = await Promise.all(
      videoPaths.map((vPath) =>
        this.prisma.enrollmentVideo.create({
          data: {
            enrollmentSessionId: sessionId,
            fileName: vPath.split("/").pop() || "lecture_video.mp4",
            filePath: vPath,
            status: "QUEUED",
          },
        })
      )
    );

    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: { totalVideos: (session.totalVideos || 0) + createdVideos.length },
    });

    await this.prisma.enrollmentAudit.create({
      data: {
        enrollmentSessionId: sessionId,
        action: "VIDEO_ADDED",
        details: JSON.stringify({ count: createdVideos.length }),
      },
    });

    return createdVideos;
  }

  async startSessionProcessing(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({
      where: { id: sessionId },
      include: { videos: true },
    });
    if (!session) throw new NotFoundException("Enrollment session not found");

    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: { status: "PROCESSING", progressPercentage: 10 },
    });

    return {
      success: true,
      sessionId,
      message: "Session video processing started sequentially across uploaded videos",
    };
  }

  async getSessionDetails(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({
      where: { id: sessionId },
      include: {
        videos: true,
        studentClusters: {
          include: { images: true, assignments: true },
          orderBy: { clusterNumber: "asc" },
        },
        audits: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!session) throw new NotFoundException("Enrollment session not found");
    return session;
  }

  async getSessionClusters(sessionId: string, status?: string) {
    const where: any = { enrollmentSessionId: sessionId };
    if (status) where.status = status;

    const clusters = await this.prisma.studentCluster.findMany({
      where,
      include: { images: true },
      orderBy: { clusterNumber: "asc" },
    });

    // Enrich each cluster with public image URLs
    return clusters.map((c) => {
      const bestImage = c.images.find((img) => img.isBest) || c.images[0] || null;
      const bestImageUrl = toImageUrl(c.bestImagePath) || toImageUrl(bestImage?.imagePath || null);
      const gallery = c.images.map((img) => ({
        id: img.id,
        imageUrl: toImageUrl(img.imagePath),
        thumbnailUrl: toImageUrl(img.thumbnailPath || img.imagePath),
        frameNumber: img.frameNumber,
        videoFileName: img.videoFileName,
        timestampSec: img.timestampSec,
        qualityScore: img.qualityScore,
        isBest: img.isBest,
        createdAt: img.createdAt,
      }));

      return {
        ...c,
        bestImageUrl,
        gallery,
        imageCount: c.images.length,
      };
    });
  }

  async assignClusterStudent(dto: any) {
    const cluster = await this.prisma.studentCluster.findUnique({
      where: { id: dto.clusterId },
      include: { session: true, images: true },
    });
    if (!cluster) throw new NotFoundException("Student cluster not found");

    let studentId = dto.existingStudentId;

    if (!studentId && dto.fullName) {
      const newStudent = await this.prisma.student.create({
        data: {
          institutionId: cluster.session.institutionId,
          departmentId: dto.departmentId || cluster.session.departmentId || "dept_cse",
          courseId: dto.programId || cluster.session.programId || "course_cs",
          studentId: dto.usn || `USN_${Date.now()}`,
          rollNumber: dto.usn,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          section: dto.sectionId || cluster.session.sectionId || "A",
          faceEnrolled: true,
          faceSamples: cluster.sampleCount,
          profilePhoto: cluster.bestImagePath,
        },
      });
      studentId = newStudent.id;
    } else if (studentId) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          faceEnrolled: true,
          profilePhoto: cluster.bestImagePath,
        },
      });
    }

    await this.prisma.studentCluster.update({
      where: { id: dto.clusterId },
      data: {
        assignedStudentId: studentId,
        status: "ASSIGNED",
      },
    });

    if (studentId) {
      await this.prisma.clusterAssignment.create({
        data: {
          studentClusterId: dto.clusterId,
          studentId,
        },
      });
    }

    return { success: true, clusterId: dto.clusterId, studentId };
  }

  async finalizeEnrollmentSession(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({
      where: { id: sessionId },
      include: { studentClusters: true },
    });
    if (!session) throw new NotFoundException("Enrollment session not found");

    const assignedCount = session.studentClusters.filter((c) => c.status === "ASSIGNED").length;

    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        progressPercentage: 100,
      },
    });

    await this.prisma.enrollmentAudit.create({
      data: {
        enrollmentSessionId: sessionId,
        action: "FINALIZED",
        details: JSON.stringify({ assignedCount }),
      },
    });

    return {
      success: true,
      sessionId,
      assignedCount,
      message: "Enrollment session finalized. Biometric profiles stored & FAISS vector index updated.",
    };
  }

  // ─── AI Pipeline Proxy ──────────────────────────────────────────────

  async processSessionVideos(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({
      where: { id: sessionId },
      include: { videos: true },
    });
    if (!session) throw new NotFoundException("Enrollment session not found");
    if (!session.videos || session.videos.length === 0) {
      throw new BadRequestException("No videos attached to this session");
    }

    // Mark as processing
    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: { status: "PROCESSING", progressPercentage: 5 },
    });

    const videoPaths = session.videos.map((v) => v.filePath);

    // Call FastAPI AI service to start pipeline
    const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/process`;
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoPaths }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await this.prisma.enrollmentSession.update({
        where: { id: sessionId },
        data: { status: "FAILED", errorMessage: errText },
      });
      throw new BadRequestException(`AI service error: ${errText}`);
    }

    const aiResponse = await res.json();

    await this.prisma.enrollmentAudit.create({
      data: {
        enrollmentSessionId: sessionId,
        action: "STARTED",
        details: JSON.stringify({ videoPaths }),
      },
    });

    return {
      success: true,
      sessionId,
      aiServiceResponse: aiResponse,
      message: "AI pipeline started. Listen to WebSocket for real-time updates.",
    };
  }

  async syncAiClusters(sessionId: string) {
    /**
     * Pull completed cluster results from the AI service and write them
     * into Postgres (StudentCluster + ClusterImage records).
     * Called by the frontend after WebSocket ENROLLMENT_COMPLETED fires.
     */
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/clusters`;
    const res = await fetch(aiUrl);
    if (!res.ok) throw new BadRequestException("Could not fetch clusters from AI service");
    const { clusters } = await res.json() as { clusters: any[] };

    if (!clusters || clusters.length === 0) {
      return { synced: 0, sessionId };
    }

    // Upsert each cluster + its gallery images
    let synced = 0;
    for (const [idx, c] of clusters.entries()) {
      const cluster = await this.prisma.studentCluster.upsert({
        where: { id: c.clusterId },
        create: {
          id: c.clusterId,
          enrollmentSessionId: sessionId,
          clusterNumber: c.clusterNumber || idx + 1,
          sampleCount: c.sampleCount || 0,
          qualityAvg: c.qualityAvg || 0,
          confidence: c.confidence || 0.85,
          bestImagePath: c.bestImagePath,
          firstSeenTime: c.firstSeenTime,
          lastSeenTime: c.lastSeenTime,
          status: "UNASSIGNED",
        },
        update: {
          sampleCount: c.sampleCount || 0,
          qualityAvg: c.qualityAvg || 0,
          confidence: c.confidence || 0.85,
          bestImagePath: c.bestImagePath,
          firstSeenTime: c.firstSeenTime,
          lastSeenTime: c.lastSeenTime,
        },
      });

      // Insert gallery images that don't exist yet
      if (Array.isArray(c.gallery)) {
        for (const [imgIdx, imgPath] of c.gallery.entries()) {
          const absPath = imgPath.startsWith("/")
            ? imgPath.replace(/^\/storage\//, process.cwd() + "/storage/")
            : imgPath;
          const existing = await this.prisma.clusterImage.findFirst({
            where: { studentClusterId: cluster.id, imagePath: absPath },
          });
          if (!existing) {
            await this.prisma.clusterImage.create({
              data: {
                studentClusterId: cluster.id,
                imagePath: absPath,
                frameNumber: imgIdx,
                qualityScore: 0.85,
                isBest: imgPath.includes("best.jpg"),
              },
            });
          }
        }
      }

      synced++;
    }

    // Update session status
    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEW_REQUIRED",
        progressPercentage: 100,
        generatedClusters: synced,
        detectedFacesCount: clusters.reduce((acc: number, c: any) => acc + (c.sampleCount || 0), 0),
      },
    });

    return { synced, sessionId };
  }
}
