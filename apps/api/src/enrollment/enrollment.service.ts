import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEnrollmentJobDto, UpdateEnrollmentJobDto, AssignClusterDto, SyncClustersDto } from "./enrollment.dto";
import { resolveStorageDir } from "./enrollment.module";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

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

  private get internalApiKey(): string {
    return (
      process.env.INTERNAL_API_KEY ||
      (process.env.NODE_ENV === "production"
        ? ""
        : "sc-internal-service-key-dev-only")
    );
  }

  private get internalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const key = this.internalApiKey;
    if (key) {
      headers["x-api-key"] = key;
    }
    return headers;
  }

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
    const studentCluster = await this.prisma.studentCluster.findFirst({
      where: {
        OR: [
          { id: clusterId },
          { bestImagePath: { contains: clusterId } },
        ],
      },
    });
    if (studentCluster) {
      await this.prisma.clusterImage.deleteMany({ where: { studentClusterId: studentCluster.id } });
      await this.prisma.clusterAssignment.deleteMany({ where: { studentClusterId: studentCluster.id } });
      return this.prisma.studentCluster.delete({ where: { id: studentCluster.id } });
    }
    const faceCluster = await this.prisma.faceCluster.findUnique({ where: { id: clusterId } });
    if (faceCluster) {
      return this.prisma.faceCluster.delete({ where: { id: clusterId } });
    }
    return { success: true, message: `Cluster ${clusterId} removed` };
  }

  async deleteClusterImage(clusterId: string, dto: { imageId?: string; imageUrl?: string; imagePath?: string }) {
    const studentCluster = await this.prisma.studentCluster.findFirst({
      where: {
        OR: [
          { id: clusterId },
          { bestImagePath: { contains: clusterId } },
        ],
      },
      include: { images: true },
    });

    if (studentCluster && studentCluster.images.length > 0) {
      const targetFname = (dto.imageUrl || dto.imagePath || "").split("/").pop()?.split("?")[0];
      const target = studentCluster.images.find(img => 
        (dto.imageId && img.id === dto.imageId) ||
        (targetFname && img.imagePath && img.imagePath.includes(targetFname)) ||
        (dto.imageUrl && img.imagePath && (img.imagePath.includes(dto.imageUrl) || dto.imageUrl.includes(img.imagePath)))
      );

      if (target) {
        await this.prisma.clusterImage.delete({ where: { id: target.id } });
        const remaining = studentCluster.images.filter(img => img.id !== target.id);
        const newBest = remaining.length > 0 ? (remaining[0].imagePath || null) : null;
        await this.prisma.studentCluster.update({
          where: { id: studentCluster.id },
          data: {
            sampleCount: remaining.length,
            bestImagePath: newBest,
          },
        });
      }
    }

    return { success: true, clusterId };
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

  async getSessions(institutionId?: string, status?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (status) where.status = status;
    const sessions = await this.prisma.enrollmentSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        videos: { select: { id: true, fileName: true, status: true, fileSize: true } },
        _count: { select: { studentClusters: true } },
      },
    });

    // Merge live AI service status for each session
    return Promise.all(
      sessions.map(async (s) => {
        let aiStatus: any = null;
        try {
          const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${s.id}/status`;
          const res = await fetch(aiUrl, { signal: AbortSignal.timeout(2000), headers: this.internalHeaders });
          if (res.ok) aiStatus = await res.json();
        } catch {}

        if (aiStatus) {
          return {
            ...s,
            status: aiStatus.status || s.status,
            progressPercentage: aiStatus.progressPercentage ?? s.progressPercentage,
            processedFrames: aiStatus.processedFrames ?? aiStatus.evaluated_frames ?? s.processedFrames,
            evaluatedFrames: aiStatus.evaluated_frames ?? aiStatus.processedFrames ?? s.processedFrames,
            detectedFacesCount: aiStatus.detectedFacesCount ?? aiStatus.face_detections ?? s.detectedFacesCount,
            framesWithFaces: aiStatus.frames_with_faces ?? aiStatus.diagnostics?.frames_with_faces ?? 0,
            currentFrameFaces: aiStatus.current_frame_faces ?? 0,
            activeDetector: aiStatus.activeDetector || aiStatus.diagnostics?.active_detector || "YOLO26-S-Face",
            generatedClusters: aiStatus.generatedClusters ?? s.generatedClusters,
            errorMessage: (aiStatus.status && aiStatus.status !== "FAILED") ? null : s.errorMessage,
            aiStatus,
          };
        }

        return s;
      })
    );
  }

  async uploadVideoFiles(sessionId: string, files: Express.Multer.File[]) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");
    if (!files || files.length === 0) throw new BadRequestException("No video files provided");

    const createdVideos = await Promise.all(
      files.map(async (file) => {
        let finalPath = file.path;
        if (!finalPath && file.destination && file.filename) {
          finalPath = path.join(file.destination, file.filename);
        }
        if (!finalPath) {
          const destDir = resolveStorageDir(sessionId);
          finalPath = path.join(destDir, `${Date.now()}_${file.originalname || "video.mp4"}`);
          if (file.buffer) {
            fs.writeFileSync(finalPath, file.buffer);
          }
        }

        // Ensure file is inside the target session directory
        const correctDir = resolveStorageDir(sessionId);
        if (finalPath && !finalPath.includes(sessionId) && fs.existsSync(finalPath)) {
          const filename = path.basename(finalPath);
          const correctPath = path.join(correctDir, filename);
          try {
            fs.renameSync(finalPath, correctPath);
            finalPath = correctPath;
          } catch {
            /* best effort */
          }
        }

        const fileSize = file.size || (fs.existsSync(finalPath) ? fs.statSync(finalPath).size : 0);

        return this.prisma.enrollmentVideo.create({
          data: {
            enrollmentSessionId: sessionId,
            fileName: file.originalname || path.basename(finalPath),
            filePath: finalPath,
            fileSize,
            status: "QUEUED",
          },
        });
      })
    );

    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: { totalVideos: (session.totalVideos || 0) + createdVideos.length },
    });

    await this.prisma.enrollmentAudit.create({
      data: {
        enrollmentSessionId: sessionId,
        action: "VIDEOS_UPLOADED",
        details: JSON.stringify({
          count: createdVideos.length,
          files: createdVideos.map((v) => ({ name: v.fileName, size: v.fileSize, path: v.filePath })),
        }),
      },
    });

    return {
      success: true,
      sessionId,
      uploadedCount: createdVideos.length,
      videos: createdVideos,
    };
  }

  async getSessionStatus(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({
      where: { id: sessionId },
      include: { videos: true, _count: { select: { studentClusters: true } } },
    });
    if (!session) throw new NotFoundException("Enrollment session not found");

    // Also try to get live status from AI service
    let aiStatus: any = null;
    try {
      const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/status`;
      const res = await fetch(aiUrl, { signal: AbortSignal.timeout(3000), headers: this.internalHeaders });
      if (res.ok) aiStatus = await res.json();
    } catch {
      // AI service may not be running — use DB status
    }

    return {
      ...session,
      status: aiStatus?.status || session.status,
      progressPercentage: aiStatus?.progressPercentage ?? session.progressPercentage,
      processedFrames: aiStatus?.processedFrames ?? aiStatus?.evaluated_frames ?? session.processedFrames,
      evaluatedFrames: aiStatus?.evaluated_frames ?? aiStatus?.processedFrames ?? session.processedFrames,
      detectedFacesCount: aiStatus?.detectedFacesCount ?? aiStatus?.face_detections ?? session.detectedFacesCount,
      framesWithFaces: aiStatus?.frames_with_faces ?? aiStatus?.diagnostics?.frames_with_faces ?? 0,
      currentFrameFaces: aiStatus?.current_frame_faces ?? 0,
      activeDetector: aiStatus?.activeDetector || aiStatus?.diagnostics?.active_detector || "YOLO26-S-Face",
      errorMessage: (aiStatus?.status && aiStatus.status !== "FAILED") ? null : session.errorMessage,
      aiStatus,
      clusterCount: session._count.studentClusters,
    };
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
    // Resolve institutionId — use the one passed, or fall back to the first
    // institution in the DB, or use the first existing session's institutionId.
    let institutionId: string = dto.institutionId || "";

    if (!institutionId || institutionId === "inst_default") {
      // Try to find a real institution
      try {
        const inst = await (this.prisma as any).institution?.findFirst?.();
        if (inst?.id) {
          institutionId = inst.id;
        }
      } catch { /* institution table may not exist yet */ }

      if (!institutionId || institutionId === "inst_default") {
        // Fall back to any existing session's institutionId
        const existing = await this.prisma.enrollmentSession.findFirst({
          select: { institutionId: true },
          orderBy: { createdAt: "desc" },
        });
        institutionId = existing?.institutionId || "default";
      }
    }

    // The schema stores these as plain strings (not enforced FK references),
    // so we can store department names, semester labels, etc. directly.
    const session = await this.prisma.enrollmentSession.create({
      data: {
        id: dto.id || undefined,
        name: dto.name || `Enrollment — ${new Date().toLocaleDateString()}`,
        institutionId,
        // Store plain string values (department name, semester label, etc.)
        departmentId: dto.departmentId || dto.department || null,
        programId:    dto.programId    || dto.program    || null,
        semesterId:   dto.semesterId   || dto.semester   || null,
        sectionId:    dto.sectionId    || dto.section    || null,
        subjectId:    dto.subjectId    || dto.subject    || null,
        teacherId:    dto.teacherId    || dto.teacher    || null,
        classroomId:  dto.classroomId  || null,
        lectureDate:  dto.lectureDate  || new Date().toISOString().split("T")[0],
        lectureTime:  dto.lectureTime  || "09:00",
        status: "PENDING",
        totalVideos: 0,
      },
    });

    // Best-effort audit log
    try {
      await this.prisma.enrollmentAudit.create({
        data: {
          enrollmentSessionId: session.id,
          action: "CREATED",
          details: JSON.stringify({
            name: session.name,
            department: session.departmentId,
            semester: session.semesterId,
          }),
        },
      });
    } catch { /* non-critical */ }

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

  async startSessionProcessing(sessionId: string, detector?: string) {
    const activeDetector = detector || "yolo26";
    return this.processSessionVideos(sessionId, activeDetector);
  }

  async getSessionDetails(sessionId: string) {
    let session = await this.prisma.enrollmentSession.findUnique({
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

    // Fetch live status from AI service
    let aiStatus: any = null;
    try {
      const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/status`;
      const res = await fetch(aiUrl, { signal: AbortSignal.timeout(3000), headers: this.internalHeaders });
      if (res.ok) aiStatus = await res.json();
    } catch {}

    // Auto-sync clusters if Postgres clusters are empty but AI service completed processing
    if (
      session.studentClusters.length === 0 &&
      aiStatus &&
      (aiStatus.status === "REVIEW_REQUIRED" || aiStatus.status === "COMPLETED" || (aiStatus.generatedClusters && aiStatus.generatedClusters > 0))
    ) {
      try {
        await this.syncAiClusters(sessionId);
        session = await this.prisma.enrollmentSession.findUnique({
          where: { id: sessionId },
          include: {
            videos: true,
            studentClusters: {
              include: { images: true, assignments: true },
              orderBy: { clusterNumber: "asc" },
            },
            audits: { orderBy: { createdAt: "desc" } },
          },
        }) || session;
      } catch {}
    }

    const diag = aiStatus?.diagnostics || {};
    return {
      ...session,
      status: aiStatus?.status || session.status,
      progressPercentage: aiStatus?.progressPercentage ?? session.progressPercentage,
      processedFrames: aiStatus?.processedFrames ?? aiStatus?.evaluated_frames ?? session.processedFrames,
      evaluatedFrames: aiStatus?.evaluated_frames ?? aiStatus?.processedFrames ?? session.processedFrames,
      detectedFacesCount: aiStatus?.detectedFacesCount ?? aiStatus?.face_detections ?? session.detectedFacesCount,
      framesWithFaces: aiStatus?.frames_with_faces ?? diag.frames_with_faces ?? 0,
      currentFrameFaces: aiStatus?.current_frame_faces ?? 0,
      qualitySamples: aiStatus?.qualitySamples ?? diag.quality_samples ?? 0,
      arcfaceEmbeddings: aiStatus?.arcfaceEmbeddings ?? diag.arcface_embeddings ?? 0,
      processingFps: aiStatus?.processingFps ?? diag.processing_fps ?? 0.0,
      generatedClusters: session.studentClusters.length || session.generatedClusters || aiStatus?.generatedClusters || 0,
      aiStatus,
    };
  }

  async getSessionClusters(sessionId: string, status?: string) {
    let where: any = { enrollmentSessionId: sessionId };
    if (status) where.status = status;

    let clusters = await this.prisma.studentCluster.findMany({
      where,
      include: { images: true, assignments: true },
      orderBy: { clusterNumber: "asc" },
    });

    if (clusters.length === 0) {
      try {
        await this.syncAiClusters(sessionId);
        clusters = await this.prisma.studentCluster.findMany({
          where,
          include: { images: true, assignments: true },
          orderBy: { clusterNumber: "asc" },
        });
      } catch {}
    }

    // Lookup assigned students if assignedStudentId is present
    const assignedIds = clusters.map(c => c.assignedStudentId).filter(Boolean) as string[];
    let studentMap: Record<string, { fullName: string; usn: string; faceEnrolled: boolean }> = {};
    if (assignedIds.length > 0) {
      const students = await this.prisma.student.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, fullName: true, rollNumber: true, studentId: true, faceEnrolled: true },
      });
      for (const s of students) {
        studentMap[s.id] = {
          fullName: s.fullName,
          usn: s.rollNumber || s.studentId || "",
          faceEnrolled: Boolean(s.faceEnrolled),
        };
      }
    }

    // Enrich each cluster with public image URLs, tracks count, and assigned student details
    return clusters.map((c) => {
      const bestImage = c.images.find((img: any) => img.isBest) || c.images[0] || null;
      const bestImageUrl = toImageUrl(c.bestImagePath) || toImageUrl(bestImage?.imagePath || null);
      const gallery = c.images.map((img: any) => ({
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

      const assigned = c.assignedStudentId ? studentMap[c.assignedStudentId] : undefined;
      const assignedStudentName = assigned?.fullName || (c.assignedStudentId ? c.assignedStudentId : undefined);
      const assignedStudentUsn = assigned?.usn;
      const isEnrolled = Boolean(assigned?.faceEnrolled);

      // Extract unique tracks
      const tracksSet = new Set<string>();
      for (const img of c.images) {
        if (img.imagePath) {
          const match = img.imagePath.match(/track_(\d+)/i);
          if (match) tracksSet.add(match[1]);
        }
      }
      const trackCount = tracksSet.size > 0 ? tracksSet.size : 1;

      return {
        ...c,
        bestImageUrl,
        gallery,
        imageCount: c.images.length,
        trackCount,
        assignedStudentName,
        assignedStudentUsn,
        isEnrolled,
        enrolled: isEnrolled,
      };
    });
  }

  async assignClusterStudent(dto: any) {
    let cluster: any = null;
    if (dto.clusterId) {
      try {
        cluster = await this.prisma.studentCluster.findFirst({
          where: {
            id: dto.clusterId,
            ...(dto.sessionId ? { enrollmentSessionId: dto.sessionId } : {}),
          },
          include: { session: true, images: true },
        });
      } catch {}
    }

    if (!cluster && dto.sessionId) {
      const clusterNum = parseInt(String(dto.clusterId).replace(/\D/g, ""), 10);
      if (!isNaN(clusterNum)) {
        cluster = await this.prisma.studentCluster.findFirst({
          where: { enrollmentSessionId: dto.sessionId, clusterNumber: clusterNum },
          include: { session: true, images: true },
        });
      }
    }

    if (!cluster && dto.sessionId) {
      try {
        await this.syncAiClusters(dto.sessionId);
        const clusterNum = parseInt(String(dto.clusterId).replace(/\D/g, ""), 10);
        cluster = await this.prisma.studentCluster.findFirst({
          where: { enrollmentSessionId: dto.sessionId, ...(isNaN(clusterNum) ? { id: dto.clusterId } : { clusterNumber: clusterNum }) },
          include: { session: true, images: true },
        });
      } catch {}
    }

    if (!cluster) throw new NotFoundException("Student cluster not found");

    let studentId = dto.existingStudentId || dto.studentId;

    // Check if student exists by USN or name if studentId was not provided
    if (!studentId && dto.usn) {
      const rawUsn = String(dto.usn).trim();
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

      const found = await this.prisma.student.findFirst({
        where: {
          OR: [
            { rollNumber: { in: usnVariants } },
            { studentId: { in: usnVariants } },
            { usn: { in: usnVariants } },
            { rollNumber: { contains: rawUsn.slice(-6), mode: "insensitive" } },
            { studentId: { contains: rawUsn.slice(-6), mode: "insensitive" } },
            { fullName: { equals: dto.fullName || dto.usn, mode: "insensitive" } },
          ],
        },
      });
      if (found) studentId = found.id;
    }

    // Check for duplicate student assignment within the same session
    if (studentId && !dto.force) {
      const alreadyAssigned = await this.prisma.studentCluster.findFirst({
        where: {
          enrollmentSessionId: cluster.enrollmentSessionId,
          assignedStudentId: studentId,
          id: { not: cluster.id },
        },
      });
      if (alreadyAssigned) {
        Logger.warn(`Student is already assigned to Cluster #${alreadyAssigned.clusterNumber}`, "EnrollmentService");
      }
    }

    // Determine target section based on student USN and session
    let targetSection = dto.sectionId || dto.section || cluster.session?.sectionId || "A";
    const checkUsn = (dto.usn || "").toUpperCase();
    if (/^1VI23CS0(0[1-9]|[1-5][0-9]|6[0-4])$/.test(checkUsn)) {
      targetSection = "A";
    } else if (/^1VI23CS0(6[5-9]|[7-9][0-9])$/.test(checkUsn) || /^1VI23CS1/.test(checkUsn) || /^1VI24CS4/.test(checkUsn)) {
      targetSection = "B";
    }

    if (!studentId && dto.fullName) {
      const defaultDept = await this.prisma.department.findFirst();
      const defaultCourse = await this.prisma.course.findFirst();

      // 1. Resolve valid department ID from database
      let resolvedDeptId = defaultDept?.id || "cmqnr5yph0006p16ezp5u56wb";
      if (dto.departmentId) {
        let dept: any = null;
        try {
          dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
        } catch {}
        if (!dept) {
          dept = await this.prisma.department.findFirst({
            where: {
              OR: [
                { name: { contains: dto.departmentId, mode: "insensitive" } },
                { code: { equals: dto.departmentId, mode: "insensitive" } },
              ],
            },
          });
        }
        if (dept) resolvedDeptId = dept.id;
      }

      // 2. Resolve valid course ID from database
      let resolvedCourseId = defaultCourse?.id || "cmqnr5ypm0007p16e3k3rxm7g";
      const programQuery = dto.programId || dto.courseId;
      if (programQuery) {
        let course: any = null;
        try {
          course = await this.prisma.course.findUnique({ where: { id: programQuery } });
        } catch {}
        if (!course) {
          course = await this.prisma.course.findFirst({
            where: {
              OR: [
                { name: { contains: programQuery, mode: "insensitive" } },
                { code: { equals: programQuery, mode: "insensitive" } },
              ],
            },
          });
        }
        if (course) resolvedCourseId = course.id;
      }

      // 3. Resolve semester integer
      let semNum = 6;
      if (dto.semester) {
        const parsed = parseInt(String(dto.semester).replace(/\D/g, ""), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 8) semNum = parsed;
      }

      const instId =
        cluster.session?.institutionId ||
        defaultDept?.institutionId ||
        "cmqnr5ypa0005p16e5ri9s2hh";

      const newStudent = await this.prisma.student.create({
        data: {
          institutionId: instId,
          departmentId: resolvedDeptId,
          courseId: resolvedCourseId,
          studentId: dto.usn || `USN_${Date.now()}`,
          rollNumber: dto.usn,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          semester: semNum,
          section: targetSection,
          sectionId: targetSection,
          batchYear: 2023,
          faceEnrolled: true,
          faceSamples: cluster.sampleCount || 1,
          profilePhoto: cluster.bestImagePath,
          primaryFaceImagePath: cluster.bestImagePath,
        },
      });

      if (cluster.bestImagePath) {
        await this.prisma.faceImage.create({
          data: {
            studentId: newStudent.id,
            imagePath: cluster.bestImagePath,
            isPrimary: true,
            qualityScore: cluster.qualityAvg ? cluster.qualityAvg / 100 : 0.85,
          },
        });
      }

      studentId = newStudent.id;
    } else if (studentId) {
      // 1. Purge all other cluster assignments for this student so old clusters are deleted/unassigned
      const oldClusters = await this.prisma.studentCluster.findMany({
        where: {
          assignedStudentId: studentId,
          id: { not: cluster.id },
        },
      });

      if (oldClusters.length > 0) {
        const oldClusterIds = oldClusters.map((c) => c.id);
        await this.prisma.clusterAssignment.deleteMany({
          where: {
            studentId,
            studentClusterId: { in: oldClusterIds },
          },
        });
        await this.prisma.studentCluster.updateMany({
          where: { id: { in: oldClusterIds } },
          data: {
            assignedStudentId: null,
            status: "UNASSIGNED",
          },
        });
        Logger.log(`Unassigned ${oldClusters.length} old clusters for student ${studentId}`, "EnrollmentService");
      }

      // 2. Clear old FaceImage records so only new face representations exist
      await this.prisma.faceImage.deleteMany({
        where: { studentId },
      });

      // 3. Create new FaceImage record for the new cluster
      if (cluster.bestImagePath) {
        await this.prisma.faceImage.create({
          data: {
            studentId,
            imagePath: cluster.bestImagePath,
            isPrimary: true,
            qualityScore: cluster.qualityAvg ? cluster.qualityAvg / 100 : 0.85,
          },
        });
      }

      // 4. Update student with new face profile and ensure target class section
      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          faceEnrolled: true,
          faceSamples: cluster.sampleCount || 1,
          profilePhoto: cluster.bestImagePath || undefined,
          primaryFaceImagePath: cluster.bestImagePath || undefined,
          section: targetSection,
          sectionId: targetSection,
        },
      });
    }

    // Handle Reassignment: If cluster was previously assigned to a different student, invalidate old state
    const oldStudentId = cluster.assignedStudentId;
    if (oldStudentId && oldStudentId !== studentId) {
      await this.prisma.clusterAssignment.deleteMany({
        where: { studentClusterId: cluster.id, studentId: oldStudentId },
      });

      await this.prisma.faceEmbedding.deleteMany({
        where: {
          studentId: oldStudentId,
          metadata: { contains: cluster.id },
        },
      });

      const remainingOldClusters = await this.prisma.studentCluster.count({
        where: {
          assignedStudentId: oldStudentId,
          id: { not: cluster.id },
          status: "ASSIGNED",
        },
      });

      if (remainingOldClusters === 0) {
        await this.prisma.student.update({
          where: { id: oldStudentId },
          data: { faceEnrolled: false, faceSamples: 0 },
        });

        try {
          const oldStudent = await this.prisma.student.findUnique({ where: { id: oldStudentId } });
          const oldUsn = oldStudent?.rollNumber || oldStudent?.studentId || oldStudent?.usn;
          if (oldUsn) {
            await fetch(`${AI_SERVICE_URL}/api/v1/sessions/purge-student-vectors`, {
              method: "POST",
              headers: { ...this.internalHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ usn: oldUsn }),
              signal: AbortSignal.timeout(3000),
            }).catch(() => {});
          }
        } catch {}
      }
    }

    await this.prisma.studentCluster.update({
      where: { id: cluster.id },
      data: {
        assignedStudentId: studentId,
        status: "ASSIGNED",
      },
    });

    let assignedStudentName = dto.fullName;
    let assignedStudentUsn = dto.usn;

    if (studentId) {
      const existingAssign = await this.prisma.clusterAssignment.findFirst({
        where: { studentClusterId: cluster.id, studentId },
      });
      if (!existingAssign) {
        await this.prisma.clusterAssignment.create({
          data: {
            studentClusterId: cluster.id,
            studentId,
            confidence: cluster.confidence || 0.95,
            assignedBy: "MANUAL",
          },
        });
      }

      // Sync cluster embedding and enroll in FAISS vector index in AI Service
      const studentObj = await this.prisma.student.findUnique({ where: { id: studentId } });
      const usn = studentObj?.rollNumber || studentObj?.studentId || studentObj?.usn || dto.usn;
      assignedStudentName = studentObj?.fullName || dto.fullName;
      assignedStudentUsn = usn;
      const sId = cluster.session?.id || dto.sessionId;

      if (usn && sId) {
        const aiCid = cluster.clusterNumber
          ? `cluster_${String(cluster.clusterNumber).padStart(3, "0")}`
          : (dto.clusterId?.startsWith("cluster_") ? dto.clusterId : "cluster_001");

        try {
          // 1. Assign in AI service
          await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sId}/clusters/${aiCid}/assign`, {
            method: "POST",
            headers: { ...this.internalHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ usn, name: studentObj?.fullName || dto.fullName, studentId, force: true }),
            signal: AbortSignal.timeout(3000),
          });

          // 2. Enroll in FAISS
          await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sId}/enroll-cluster`, {
            method: "POST",
            headers: { ...this.internalHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ usn, clusterId: aiCid }),
            signal: AbortSignal.timeout(3000),
          });
        } catch {
          /* non-critical FAISS sync fallback */
        }

        // 3. Persist FaceEmbedding in PostgreSQL
        try {
          const aiRes = await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sId}/clusters`, {
            headers: this.internalHeaders,
            signal: AbortSignal.timeout(3000),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const clustersList = Array.isArray(aiData) ? aiData : (aiData.clusters || []);
            const matchedAi = clustersList.find(
              (c: any) =>
                c.clusterId === aiCid ||
                c.cluster_id === aiCid ||
                String(c.clusterNumber) === String(cluster.clusterNumber),
            );
            if (matchedAi) {
              const repEmb = matchedAi.representative_embedding || matchedAi.centroid_embedding || matchedAi.centroid;
              if (Array.isArray(repEmb) && repEmb.length === 512) {
                const vecStr = JSON.stringify(repEmb);
                const existingEmb = await this.prisma.faceEmbedding.findFirst({
                  where: {
                    studentId,
                    metadata: { contains: cluster.id },
                  },
                });
                if (!existingEmb) {
                  await this.prisma.faceEmbedding.create({
                    data: {
                      studentId,
                      embeddingVector: vecStr,
                      confidence: cluster.confidence || 0.95,
                      thumbnailPath: dto.bestImagePath || cluster.bestImagePath,
                      metadata: JSON.stringify({
                        sessionId: sId,
                        clusterId: cluster.id,
                        clusterNumber: cluster.clusterNumber,
                        source: "MANUAL_ASSIGNMENT",
                      }),
                    },
                  });
                }
              }
            }
          }
        } catch (e) {
          Logger.warn(`Could not persist FaceEmbedding to PostgreSQL: ${e}`, "EnrollmentService");
        }
      }
    }

    return {
      success: true,
      clusterId: cluster.id,
      studentId,
      studentName: assignedStudentName,
      studentUsn: assignedStudentUsn,
    };
  }

  async confirmCluster(clusterId: string, dto: { sessionId?: string }) {
    let cluster = await this.prisma.studentCluster.findFirst({
      where: {
        id: clusterId,
        ...(dto?.sessionId ? { enrollmentSessionId: dto.sessionId } : {}),
      },
      include: { session: true, images: true },
    });

    if (!cluster && dto?.sessionId) {
      const clusterNum = parseInt(String(clusterId).replace(/\D/g, ""), 10);
      if (!isNaN(clusterNum)) {
        cluster = await this.prisma.studentCluster.findFirst({
          where: {
            enrollmentSessionId: dto.sessionId,
            clusterNumber: clusterNum,
          },
          include: { session: true, images: true },
        });
      }
    }

    if (!cluster) throw new NotFoundException("Student cluster not found");

    const sId = dto?.sessionId || cluster.enrollmentSessionId;
    const aiCid = cluster.clusterNumber
      ? `cluster_${String(cluster.clusterNumber).padStart(3, "0")}`
      : clusterId;

    let aiConfirmedCluster: any = null;
    try {
      const aiRes = await fetch(
        `${AI_SERVICE_URL}/api/v1/sessions/${sId}/clusters/${aiCid}/confirm`,
        {
          method: "POST",
          headers: this.internalHeaders,
          signal: AbortSignal.timeout(3000),
        },
      );
      if (aiRes.ok) {
        const body = await aiRes.json();
        aiConfirmedCluster = body.cluster;
      }
    } catch {}

    const targetUsn =
      aiConfirmedCluster?.assignedUsn ||
      aiConfirmedCluster?.usn ||
      (aiConfirmedCluster?.assignedStudent && aiConfirmedCluster.assignedStudent.usn);
    const targetName =
      aiConfirmedCluster?.assignedStudentName ||
      aiConfirmedCluster?.name ||
      (aiConfirmedCluster?.assignedStudent && aiConfirmedCluster.assignedStudent.name);

    if (targetUsn) {
      return this.assignClusterStudent({
        clusterId: cluster.id,
        sessionId: sId,
        usn: targetUsn,
        fullName: targetName,
        force: true,
      });
    }

    if (cluster.assignedStudentId) {
      const updated = await this.prisma.studentCluster.update({
        where: { id: cluster.id },
        data: { status: "ASSIGNED" },
      });
      return { success: true, cluster: updated };
    }

    throw new BadRequestException("Cannot confirm cluster without an identified student");
  }

  async finalizeEnrollmentSession(sessionId: string) {
    // 1. VALIDATION
    const session = await this.prisma.enrollmentSession.findUnique({
      where: { id: sessionId },
      include: {
        studentClusters: {
          include: { images: true, assignments: true },
        },
      },
    });
    if (!session) throw new NotFoundException("Enrollment session not found");

    // Idempotent retry safety: if already completed and embeddings exist, return immediately
    if (session.status === "COMPLETED") {
      const existingEmbeddingsCount = await this.prisma.faceEmbedding.count({
        where: {
          metadata: { contains: sessionId },
        },
      });
      if (existingEmbeddingsCount > 0) {
        return {
          success: true,
          sessionId,
          assignedCount: session.studentClusters.filter((c) => c.status === "ASSIGNED").length,
          embeddingsPersisted: existingEmbeddingsCount,
          status: "COMPLETED",
          message: "Enrollment session already finalized. Durable biometric profiles are active.",
        };
      }
    }

    // 1. Trigger AI service batch FAISS enrollment & on-demand ArcFace vector extraction for all confirmed students
    try {
      const finalizeFaissUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/finalize-faiss`;
      await fetch(finalizeFaissUrl, { method: "POST", headers: this.internalHeaders });
    } catch (fErr) {
      console.warn(`[Finalize] FAISS batch finalize notification notice: ${fErr}`);
    }

    // 2. Fetch freshly updated cluster data from AI service (now populated with 512D ArcFace embeddings and isEnrolled=true)
    let aiClusters: any[] = [];
    try {
      const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/clusters`;
      const res = await fetch(aiUrl, { headers: this.internalHeaders });
      if (res.ok) {
        const body = await res.json();
        aiClusters = body.clusters || [];
      }
    } catch (err) {
      console.warn(`[Finalize] AI service clusters fetch notice: ${err}`);
    }

    // Auto-sync clusters into Postgres if Postgres clusters are empty or fewer than AI clusters
    if (session.studentClusters.length === 0 && aiClusters.length > 0) {
      await this.syncAiClusters(sessionId);
    }

    // Re-query refreshed clusters
    const freshClusters = await this.prisma.studentCluster.findMany({
      where: { enrollmentSessionId: sessionId },
      include: { images: true, assignments: true },
      orderBy: { clusterNumber: "asc" },
    });

    if (freshClusters.length === 0 && aiClusters.length === 0) {
      throw new BadRequestException("Session contains no usable face cluster data to finalize.");
    }

    // 2. PERSIST CONFIRMED STUDENT IDENTITIES & 512D ARCFACE EMBEDDINGS
    let confirmedCount = 0;
    let embeddingsPersisted = 0;

    // Build map of AI cluster details by clusterId or clusterNumber
    const aiClusterMap = new Map<string, any>();
    for (const ac of aiClusters) {
      if (ac.clusterId) aiClusterMap.set(ac.clusterId, ac);
      if (ac.cluster_id) aiClusterMap.set(ac.cluster_id, ac);
      if (ac.clusterNumber) aiClusterMap.set(String(ac.clusterNumber), ac);
    }

    for (const cluster of freshClusters) {
      // Find matching AI cluster
      const aiC = aiClusterMap.get(cluster.id) ||
                  aiClusterMap.get(`cluster_${String(cluster.clusterNumber).padStart(3, "0")}`) ||
                  aiClusterMap.get(String(cluster.clusterNumber)) ||
                  {};

      // Determine assigned student
      let studentId = cluster.assignedStudentId || cluster.assignments?.[0]?.studentId || aiC.assignedStudent?.studentId || aiC.student_id;
      let studentUsn = aiC.assignedStudent?.usn || aiC.usn || aiC.assignedUsn;

      if (!studentId && studentUsn) {
        const matchedStudent = await this.prisma.student.findFirst({
          where: {
            OR: [
              { rollNumber: studentUsn },
              { studentId: studentUsn },
              { usn: studentUsn },
              { rollNumber: { equals: studentUsn, mode: "insensitive" } },
              { studentId: { equals: studentUsn, mode: "insensitive" } },
            ],
          },
        });
        if (matchedStudent) {
          studentId = matchedStudent.id;
        }
      }

      // Check if cluster is confirmed
      const isConfirmed = cluster.status === "ASSIGNED" ||
                          aiC.identity_status === "CONFIRMED" ||
                          aiC.isEnrolled === true ||
                          aiC.enrolled === true ||
                          Boolean(studentId);

      if (!isConfirmed || !studentId) {
        // Skip unassigned or pending review clusters — DO NOT force every cluster to become a student
        continue;
      }

      const student = await this.prisma.student.findUnique({ where: { id: studentId } });
      if (!student) continue;

      const usn = student.rollNumber || student.studentId || student.usn || "";

      // Extract valid 512D ArcFace embeddings
      const embeddingsToPersist: number[][] = [];

      const candidateEmbeddings = [
        aiC.representative_embedding,
        aiC.centroid_embedding,
        aiC.centroid,
        aiC.medoid_embedding,
        ...(Array.isArray(aiC.embeddings) ? aiC.embeddings : []),
      ];

      for (const emb of candidateEmbeddings) {
        if (Array.isArray(emb) && emb.length === 512) {
          // Validate embedding data integrity (no NaNs, finite floats)
          const isValid = emb.every((v: any) => typeof v === "number" && !isNaN(v) && isFinite(v));
          if (isValid) {
            embeddingsToPersist.push(emb);
          }
        }
      }

      // Persist embeddings durably into Postgres FaceEmbedding table (idempotent: avoid duplicates)
      const bestImage = cluster.images.find((img) => img.isBest) || cluster.images[0];
      const thumbnailPath = cluster.bestImagePath || bestImage?.imagePath || aiC.bestImagePath || null;

      for (const embVec of embeddingsToPersist) {
        const vecStr = JSON.stringify(embVec);
        const existing = await this.prisma.faceEmbedding.findFirst({
          where: {
            studentId: student.id,
            thumbnailPath: thumbnailPath || undefined,
          },
        });

        if (!existing) {
          await this.prisma.faceEmbedding.create({
            data: {
              studentId: student.id,
              embeddingVector: vecStr,
              confidence: cluster.confidence || aiC.identity_mean_similarity || 0.90,
              thumbnailPath: thumbnailPath,
              metadata: JSON.stringify({
                sessionId,
                clusterId: cluster.id,
                clusterNumber: cluster.clusterNumber,
                sampleCount: cluster.sampleCount || aiC.sampleCount || 1,
                qualityAvg: cluster.qualityAvg || aiC.qualityAvg || 0.85,
                source: "SESSION_FINALIZATION",
              }),
            },
          });
          embeddingsPersisted++;
        }
      }

      // Update student profile status in Postgres
      await this.prisma.student.update({
        where: { id: student.id },
        data: {
          faceEnrolled: true,
          faceSamples: Math.max(student.faceSamples || 0, cluster.sampleCount || aiC.sampleCount || 1),
          primaryFaceImagePath: thumbnailPath || student.primaryFaceImagePath || undefined,
          profilePhoto: thumbnailPath || student.profilePhoto || undefined,
        },
      });

      // Update cluster status
      await this.prisma.studentCluster.update({
        where: { id: cluster.id },
        data: {
          status: "ASSIGNED",
          assignedStudentId: student.id,
        },
      });

      // Audit trail
      await this.prisma.enrollmentHistory.create({
        data: {
          studentId: student.id,
          performedById: "system",
          action: "ENROLLED",
          metadata: JSON.stringify({
            sessionId,
            clusterId: cluster.id,
            usn,
            embeddingsCount: embeddingsToPersist.length,
          }),
        },
      });

      confirmedCount++;
    }

    // Batch update FAISS vector index in AI service
    try {
      const finalizeFaissUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/finalize-faiss`;
      await fetch(finalizeFaissUrl, { method: "POST", headers: this.internalHeaders });
    } catch (fErr) {
      console.warn(`[Finalize] FAISS batch finalize notification notice: ${fErr}`);
    }

    // 3. MARK SESSION AS FINALIZED
    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        progressPercentage: 100,
      },
    });

    // Auto-mark attendance for all confirmed enrolled students for this class with timestamp
    let attendanceRecordsMarked = 0;
    try {
      const now = new Date();
      const effectiveClassroomId = session.classroomId || "room-023";
      const effectiveSubject = session.name || "7th Sem - Machine Learning & AI (Section A)";

      let attSession = await this.prisma.attendanceSession.findFirst({
        where: {
          classroomId: effectiveClassroomId,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!attSession) {
        attSession = await this.prisma.attendanceSession.create({
          data: {
            sessionId: `SESS_${Date.now().toString(36).toUpperCase()}`,
            institutionId: session.institutionId || "inst-001",
            classroomId: effectiveClassroomId,
            subjectName: effectiveSubject,
            status: "ACTIVE",
            startedAt: now,
          },
        });
      }

      for (const cluster of freshClusters) {
        const studentId = cluster.assignedStudentId;
        if (!studentId) continue;
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        if (!student) continue;

        await this.prisma.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: attSession.id,
              studentId: student.id,
            },
          },
          update: {
            confidence: cluster.confidence || 0.95,
            confidenceScore: cluster.confidence || 0.95,
            markedAt: now,
            studentName: student.fullName,
            cameraId: effectiveClassroomId,
            statusEnum: "PRESENT",
            recognitionSource: "FACE_AI",
            method: "FACE_RECOGNITION",
            isVerified: true,
          },
          create: {
            sessionId: attSession.id,
            studentId: student.id,
            studentName: student.fullName,
            confidence: cluster.confidence || 0.95,
            confidenceScore: cluster.confidence || 0.95,
            cameraId: effectiveClassroomId,
            method: "FACE_RECOGNITION",
            statusEnum: "PRESENT",
            recognitionSource: "FACE_AI",
            isVerified: true,
            markedAt: now,
          },
        });

        await this.prisma.student.update({
          where: { id: student.id },
          data: { lastAttendanceTime: now },
        });

        attendanceRecordsMarked++;
      }

      await this.prisma.attendanceSession.update({
        where: { id: attSession.id },
        data: {
          totalPresent: attendanceRecordsMarked,
          totalStudents: Math.max(attSession.totalStudents, attendanceRecordsMarked),
        },
      });
      console.log(`[Finalize] Marked attendance with timestamp for ${attendanceRecordsMarked} enrolled students`);
    } catch (attErr) {
      console.warn(`[Finalize] Attendance auto-marking notice: ${attErr}`);
    }

    await this.prisma.enrollmentAudit.create({
      data: {
        enrollmentSessionId: sessionId,
        action: "FINALIZED",
        details: JSON.stringify({
          confirmedCount,
          embeddingsPersisted,
          attendanceRecordsMarked,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // 4. CLEAN UP TEMPORARY CAPTURE DATA ONLY AFTER PERSISTENCE SUCCEEDS
    // Safely delete intermediate debug frames and temporary captures
    // NEVER delete confirmed student records, durable embeddings, permanent clusters, or tracks gallery
    try {
      const sessDirCandidates = [
        path.join(process.cwd(), "..", "ai-service", "storage", "enrollment", sessionId),
        path.join(process.cwd(), "storage", "enrollment", sessionId),
      ];
      for (const sDir of sessDirCandidates) {
        if (fs.existsSync(sDir)) {
          const debugFramesDir = path.join(sDir, "debug_frames");
          if (fs.existsSync(debugFramesDir)) {
            fs.rmSync(debugFramesDir, { recursive: true, force: true });
          }
        }
      }
    } catch (cleanupErr) {
      console.warn(`[Finalize] Temporary capture cleanup notice: ${cleanupErr}`);
    }

    return {
      success: true,
      sessionId,
      assignedCount: confirmedCount,
      embeddingsPersisted,
      status: "COMPLETED",
      message: `Enrollment session finalized successfully. ${confirmedCount} confirmed student identities and ${embeddingsPersisted} durable embeddings stored.`,
    };
  }

  // ─── AI Pipeline Proxy ──────────────────────────────────────────────

  async processSessionVideos(sessionId: string, detector?: string) {
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

    const videoPaths = session.videos.map((v) => {
      if (path.isAbsolute(v.filePath) && fs.existsSync(v.filePath)) return v.filePath;
      const candidates = [
        path.resolve(v.filePath),
        path.resolve(process.cwd(), v.filePath),
        path.resolve(process.cwd(), "..", "..", v.filePath),
        path.resolve(process.cwd(), "..", v.filePath),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      return v.filePath;
    });

    console.log(`[DIAGNOSTIC-NESTJS] Processing session '${sessionId}': total videos = ${session.videos.length}`);
    for (const v of session.videos) {
      const exists = fs.existsSync(v.filePath);
      const size = exists ? fs.statSync(v.filePath).size : 0;
      console.log(`[DIAGNOSTIC-NESTJS] Video file '${v.fileName}': path='${v.filePath}', exists=${exists}, sizeBytes=${size}`);
    }

    // Call FastAPI AI service to start pipeline
    const activeDetector = detector || "yolo26";
    const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/process`;
    let res: Response;
    try {
      res = await fetch(aiUrl, {
        method: "POST",
        headers: { ...this.internalHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ videoPaths, detector: activeDetector }),
      });
    } catch (fetchErr: any) {
      await this.prisma.enrollmentSession.updateMany({
        where: { id: sessionId },
        data: { status: "FAILED", errorMessage: "AI service on port 8000 is unreachable" },
      });
      throw new BadRequestException(
        `AI Service (port 8000) is not running. Please start the AI service using 'npm run dev:ai' or 'bash apps/ai-service/start.sh'.`
      );
    }

    if (!res.ok) {
      const errText = await res.text();
      await this.prisma.enrollmentSession.updateMany({
        where: { id: sessionId },
        data: { status: "FAILED", errorMessage: errText },
      });
      throw new BadRequestException(`AI service error: ${errText}`);
    }

    const aiResponse = await res.json();

    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: {
        status: "PROCESSING",
        errorMessage: null,
      },
    });

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

  async getSessionDiagnostics(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/diagnostics`;
      const res = await fetch(aiUrl, { headers: this.internalHeaders, signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return data.diagnostics || data;
      }
    } catch {}

    const clusterCount = await this.prisma.studentCluster.count({ where: { enrollmentSessionId: sessionId } });
    return {
      frames_processed: session.processedFrames || 0,
      face_detections: session.detectedFacesCount || 0,
      quality_accepted: session.detectedFacesCount || 0,
      quality_rejected: 0,
      embeddings_generated: session.detectedFacesCount || 0,
      embeddings_used_for_clustering: session.detectedFacesCount || 0,
      clusters_generated: clusterCount || session.generatedClusters || 0,
      average_cluster_size: clusterCount > 0 ? Number(((session.detectedFacesCount || 0) / clusterCount).toFixed(2)) : 0,
      largest_cluster: 0,
      smallest_cluster: 0,
      average_cluster_quality: 85.0,
    };
  }

  async pauseSessionProcessing(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/pause`, {
        method: "POST",
        headers: this.internalHeaders,
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        await this.prisma.enrollmentSession.update({
          where: { id: sessionId },
          data: { status: "PAUSED" },
        });
        return { success: true, sessionId, status: "PAUSED", message: "Session processing paused at current segment." };
      }
    } catch (err) {
      console.warn(`[pauseSessionProcessing] AI service call warning: ${err}`);
    }
    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: { status: "PAUSED" },
    });
    return { success: true, sessionId, status: "PAUSED" };
  }

  async resumeSessionProcessing(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/resume`, {
        method: "POST",
        headers: this.internalHeaders,
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        await this.prisma.enrollmentSession.update({
          where: { id: sessionId },
          data: { status: "PROCESSING" },
        });
        return { success: true, sessionId, status: "PROCESSING", message: "Session processing resumed." };
      }
    } catch (err) {
      console.warn(`[resumeSessionProcessing] AI service call warning: ${err}`);
    }
    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: { status: "PROCESSING" },
    });
    return { success: true, sessionId, status: "PROCESSING" };
  }

  async stopSessionProcessing(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/stop`, {
        method: "POST",
        headers: this.internalHeaders,
        signal: AbortSignal.timeout(10000),
      });
    } catch {}

    try {
      await this.syncAiClusters(sessionId);
    } catch (syncErr) {
      console.warn(`[stopSessionProcessing] Error syncing AI clusters for ${sessionId}:`, syncErr);
    }

    const clusterCount = await this.prisma.studentCluster.count({ where: { enrollmentSessionId: sessionId } });
    const finalStatus = clusterCount > 0 ? "REVIEW_REQUIRED" : "STOPPED";

    await this.prisma.enrollmentSession.update({
      where: { id: sessionId },
      data: {
        status: finalStatus,
        progressPercentage: 100,
        errorMessage: clusterCount > 0 ? null : "Stopped by user",
      },
    });

    return { success: true, sessionId, status: finalStatus, clusterCount };
  }

  async deleteEnrollmentSession(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers: this.internalHeaders,
        signal: AbortSignal.timeout(3000),
      });
    } catch {}

    const clusters = await this.prisma.studentCluster.findMany({
      where: { enrollmentSessionId: sessionId },
      select: { id: true },
    });
    const clusterIds = clusters.map(c => c.id);

    if (clusterIds.length > 0) {
      await this.prisma.clusterImage.deleteMany({
        where: { studentClusterId: { in: clusterIds } },
      });
      await this.prisma.clusterAssignment.deleteMany({
        where: { studentClusterId: { in: clusterIds } },
      });
      await this.prisma.studentCluster.deleteMany({
        where: { id: { in: clusterIds } },
      });
    }
    await this.prisma.enrollmentVideo.deleteMany({
      where: { enrollmentSessionId: sessionId },
    });
    await this.prisma.enrollmentAudit.deleteMany({
      where: { enrollmentSessionId: sessionId },
    });
    await this.prisma.enrollmentSession.delete({
      where: { id: sessionId },
    });

    return { success: true, sessionId, message: "Enrollment session deleted" };
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
    const res = await fetch(aiUrl, { headers: this.internalHeaders });
    if (!res.ok) throw new BadRequestException("Could not fetch clusters from AI service");
    const { clusters } = await res.json() as { clusters: any[] };

    if (!clusters || clusters.length === 0) {
      return { synced: 0, sessionId };
    }

    // Upsert each cluster + its gallery images
    // FIX: Use findFirst by AI clusterId string (not Prisma id), then create or update
    let synced = 0;
    for (const [idx, c] of clusters.entries()) {
      const aiClusterId = c.clusterId;

      // Check if AI suggested or confirmed a student
      let matchedStudentId: string | null = null;
      const studentUsn = c.assignedStudent?.usn || c.usn || c.assignedUsn;
      if (studentUsn) {
        const student = await this.prisma.student.findFirst({
          where: {
            OR: [
              { rollNumber: studentUsn },
              { studentId: studentUsn },
              { usn: studentUsn },
              { rollNumber: { equals: studentUsn, mode: "insensitive" } },
              { studentId: { equals: studentUsn, mode: "insensitive" } },
              { fullName: { equals: studentUsn, mode: "insensitive" } },
            ],
          },
        });
        if (student) {
          matchedStudentId = student.id;
        }
      }

      const isEnrolled = Boolean(c.isEnrolled || c.enrolled);
      const isExplicitlyConfirmed =
        c.identity_status === "CONFIRMED" || isEnrolled || c.status === "ASSIGNED";
      const clusterStatus = isExplicitlyConfirmed
        ? "ASSIGNED"
        : (c.identity_status === "REJECTED" ? "REJECTED" : "UNASSIGNED");

      const finalStudentId = isExplicitlyConfirmed ? matchedStudentId : null;

      // Try to find existing cluster by clusterNumber
      let cluster = await this.prisma.studentCluster.findFirst({
        where: {
          enrollmentSessionId: sessionId,
          clusterNumber: c.clusterNumber || idx + 1,
        },
      });

      if (cluster) {
        // Update existing - preserve manual assignment if already established in DB and not rejected
        const preservedStudentId =
          cluster.status === "ASSIGNED" && cluster.assignedStudentId
            ? cluster.assignedStudentId
            : finalStudentId;
        const preservedStatus =
          c.identity_status === "REJECTED"
            ? "REJECTED"
            : cluster.status === "ASSIGNED"
              ? "ASSIGNED"
              : clusterStatus;

        cluster = await this.prisma.studentCluster.update({
          where: { id: cluster.id },
          data: {
            sampleCount: c.sampleCount || 0,
            qualityAvg: c.qualityAvg || 0,
            confidence: c.identity_mean_similarity || c.confidence || 0.85,
            bestImagePath: c.bestImagePath,
            firstSeenTime: c.firstSeenTime,
            lastSeenTime: c.lastSeenTime,
            assignedStudentId: preservedStudentId,
            status: preservedStatus,
          },
        });
      } else {
        // Create new
        cluster = await this.prisma.studentCluster.create({
          data: {
            enrollmentSessionId: sessionId,
            clusterNumber: c.clusterNumber || idx + 1,
            sampleCount: c.sampleCount || 0,
            qualityAvg: c.qualityAvg || 0,
            confidence: c.identity_mean_similarity || c.confidence || 0.85,
            bestImagePath: c.bestImagePath,
            firstSeenTime: c.firstSeenTime,
            lastSeenTime: c.lastSeenTime,
            assignedStudentId: finalStudentId,
            status: clusterStatus,
          },
        });
      }

      if (cluster.assignedStudentId && cluster.status === "ASSIGNED") {
        const assignedSid = cluster.assignedStudentId;
        if (isEnrolled) {
          try {
            await this.prisma.student.update({
              where: { id: assignedSid },
              data: {
                faceEnrolled: true,
                faceSamples: c.sampleCount || 1,
                profilePhoto: c.bestImagePath || undefined,
                primaryFaceImagePath: c.bestImagePath || undefined,
              },
            });
          } catch {}
        }

        const existingAss = await this.prisma.clusterAssignment.findFirst({
          where: { studentClusterId: cluster.id, studentId: assignedSid },
        });
        if (!existingAss) {
          await this.prisma.clusterAssignment.create({
            data: {
              studentClusterId: cluster.id,
              studentId: assignedSid,
              confidence: c.identity_mean_similarity || c.confidence || 0.85,
              assignedBy: c.assignment_source || "MANUAL",
            },
          });
        }
      }

      // Replace gallery images so old tracks or previous runs never contaminate the cluster
      if (Array.isArray(c.gallery)) {
        await this.prisma.clusterImage.deleteMany({
          where: { studentClusterId: cluster.id },
        });

        for (const [imgIdx, imgUrl] of c.gallery.entries()) {
          // Convert /storage/... URL to absolute path
          const absPath = imgUrl.startsWith("/")
            ? path.join(process.cwd(), "..", "ai-service", imgUrl.replace(/^\//, ""))
            : imgUrl;

          await this.prisma.clusterImage.create({
            data: {
              studentClusterId: cluster.id,
              imagePath: absPath,
              frameNumber: imgIdx,
              qualityScore: 0.85,
              isBest: imgUrl.includes("best.jpg") || imgIdx === 0,
            },
          });
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
  async rejectStudentCluster(clusterId: string) {
    const cluster = await this.prisma.studentCluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundException("Student cluster not found");
    return this.prisma.studentCluster.update({
      where: { id: clusterId },
      data: { status: "REJECTED" },
    });
  }
}
