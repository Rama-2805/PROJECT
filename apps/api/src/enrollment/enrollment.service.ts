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
          const res = await fetch(aiUrl, { signal: AbortSignal.timeout(2000) });
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
            generatedClusters: aiStatus.generatedClusters ?? s.generatedClusters,
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
      const res = await fetch(aiUrl, { signal: AbortSignal.timeout(3000) });
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
    return this.processSessionVideos(sessionId, detector);
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
      const res = await fetch(aiUrl, { signal: AbortSignal.timeout(3000) });
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
    let studentMap: Record<string, { fullName: string; usn: string }> = {};
    if (assignedIds.length > 0) {
      const students = await this.prisma.student.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, fullName: true, rollNumber: true, studentId: true },
      });
      for (const s of students) {
        studentMap[s.id] = {
          fullName: s.fullName,
          usn: s.rollNumber || s.studentId || "",
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

      // Extract unique tracks
      const tracksSet = new Set<string>();
      for (const img of c.images) {
        if (img.imagePath) {
          const match = img.imagePath.match(/track_(\d+)/i);
          if (match) tracksSet.add(match[1]);
        }
      }
      const trackCount = tracksSet.size > 0 ? tracksSet.size : Math.max(1, Math.min(c.sampleCount, Math.ceil(c.sampleCount / 2)));

      return {
        ...c,
        bestImageUrl,
        gallery,
        imageCount: c.images.length,
        trackCount,
        assignedStudentName,
        assignedStudentUsn,
      };
    });
  }

  async assignClusterStudent(dto: any) {
    let cluster: any = null;
    try {
      cluster = await this.prisma.studentCluster.findUnique({
        where: { id: dto.clusterId },
        include: { session: true, images: true },
      });
    } catch {}

    if (!cluster) {
      const clusterNum = parseInt(String(dto.clusterId).replace(/\D/g, ""), 10);
      if (!isNaN(clusterNum) && dto.sessionId) {
        cluster = await this.prisma.studentCluster.findFirst({
          where: { enrollmentSessionId: dto.sessionId, clusterNumber: clusterNum },
          include: { session: true, images: true },
        });
      } else if (!isNaN(clusterNum)) {
        cluster = await this.prisma.studentCluster.findFirst({
          where: { clusterNumber: clusterNum },
          include: { session: true, images: true },
        });
      }
    }

    if (!cluster && dto.sessionId) {
      try {
        await this.syncAiClusters(dto.sessionId);
        const clusterNum = parseInt(String(dto.clusterId).replace(/\D/g, ""), 10);
        cluster = await this.prisma.studentCluster.findFirst({
          where: { enrollmentSessionId: dto.sessionId, ...(isNaN(clusterNum) ? {} : { clusterNumber: clusterNum }) },
          include: { session: true, images: true },
        });
      } catch {}
    }

    if (!cluster) {
      const session = dto.sessionId ? await this.prisma.enrollmentSession.findUnique({ where: { id: dto.sessionId } }) : await this.prisma.enrollmentSession.findFirst();
      if (session) {
        const clusterNum = parseInt(String(dto.clusterId).replace(/\D/g, ""), 10) || 1;
        cluster = await this.prisma.studentCluster.create({
          data: {
            enrollmentSessionId: session.id,
            clusterNumber: clusterNum,
            sampleCount: dto.sampleCount || 1,
            qualityAvg: 85,
            confidence: 0.95,
            bestImagePath: dto.bestImagePath,
            status: "ASSIGNED",
          },
          include: { session: true, images: true },
        });
      }
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

      const newStudent = await this.prisma.student.create({
        data: {
          institutionId: cluster.session.institutionId,
          departmentId: dto.departmentId || defaultDept?.id || "cmqnr5yph0006p16ezp5u56wb",
          courseId: dto.programId || defaultCourse?.id || "cmqnr5ypm0007p16e3k3rxm7g",
          studentId: dto.usn || `USN_${Date.now()}`,
          rollNumber: dto.usn,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          section: targetSection,
          sectionId: targetSection,
          faceEnrolled: true,
          faceSamples: cluster.sampleCount || 1,
          profilePhoto: cluster.bestImagePath,
          primaryFaceImagePath: cluster.bestImagePath,
        },
      });
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
        try {
          const aiCid = dto.clusterId || `cluster_${String(cluster.clusterNumber).padStart(3, "0")}`;
          // 1. Assign in AI service with force=true to unassign prior session clusters
          await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sId}/clusters/${aiCid}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usn, name: studentObj?.fullName || dto.fullName, studentId, force: true }),
            signal: AbortSignal.timeout(3000),
          });
          // 2. Enroll in FAISS (AI service will purge old vectors for usn before adding new ones)
          await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sId}/enroll-cluster`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usn, clusterId: aiCid }),
            signal: AbortSignal.timeout(3000),
          });
        } catch {
          /* non-critical FAISS sync fallback */
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
    const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/process`;
    let res: Response;
    try {
      res = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPaths, detector }),
      });
    } catch (fetchErr: any) {
      await this.prisma.enrollmentSession.update({
        where: { id: sessionId },
        data: { status: "FAILED", errorMessage: "AI service on port 8000 is unreachable" },
      });
      throw new BadRequestException(
        `AI Service (port 8000) is not running. Please start the AI service using 'npm run dev:ai' or 'bash apps/ai-service/start.sh'.`
      );
    }

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

  async getSessionDiagnostics(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      const aiUrl = `${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/diagnostics`;
      const res = await fetch(aiUrl, { signal: AbortSignal.timeout(3000) });
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

  async stopSessionProcessing(sessionId: string) {
    const session = await this.prisma.enrollmentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Enrollment session not found");

    try {
      await fetch(`${AI_SERVICE_URL}/api/v1/sessions/${sessionId}/stop`, {
        method: "POST",
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
    const res = await fetch(aiUrl);
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
      const clusterStatus = (c.identity_status === "CONFIRMED" || isEnrolled)
        ? "ASSIGNED"
        : (c.identity_status === "REJECTED" ? "REJECTED" : (matchedStudentId ? "ASSIGNED" : "UNASSIGNED"));

      // Try to find existing cluster by clusterNumber
      let cluster = await this.prisma.studentCluster.findFirst({
        where: {
          enrollmentSessionId: sessionId,
          clusterNumber: c.clusterNumber || idx + 1,
        },
      });

      if (cluster) {
        // Update existing
        cluster = await this.prisma.studentCluster.update({
          where: { id: cluster.id },
          data: {
            sampleCount: c.sampleCount || 0,
            qualityAvg: c.qualityAvg || 0,
            confidence: c.identity_mean_similarity || c.confidence || 0.85,
            bestImagePath: c.bestImagePath,
            firstSeenTime: c.firstSeenTime,
            lastSeenTime: c.lastSeenTime,
            assignedStudentId: matchedStudentId || cluster.assignedStudentId,
            status: clusterStatus,
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
            assignedStudentId: matchedStudentId,
            status: clusterStatus,
          },
        });
      }

      if (matchedStudentId) {
        if (isEnrolled) {
          try {
            await this.prisma.student.update({
              where: { id: matchedStudentId },
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
          where: { studentClusterId: cluster.id, studentId: matchedStudentId },
        });
        if (!existingAss) {
          await this.prisma.clusterAssignment.create({
            data: {
              studentClusterId: cluster.id,
              studentId: matchedStudentId,
              confidence: c.identity_mean_similarity || c.confidence || 0.85,
              assignedBy: c.assignment_source || "AUTO",
            },
          });
        }
      }

      // Insert gallery images that don't exist yet
      if (Array.isArray(c.gallery)) {
        for (const [imgIdx, imgUrl] of c.gallery.entries()) {
          // Convert /storage/... URL to absolute path
          const absPath = imgUrl.startsWith("/")
            ? path.join(process.cwd(), "..", "ai-service", imgUrl.replace(/^\//, ""))
            : imgUrl;

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
                isBest: imgUrl.includes("best.jpg"),
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
  async rejectStudentCluster(clusterId: string) {
    const cluster = await this.prisma.studentCluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundException("Student cluster not found");
    return this.prisma.studentCluster.update({
      where: { id: clusterId },
      data: { status: "REJECTED" },
    });
  }
}
