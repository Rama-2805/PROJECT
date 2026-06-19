import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEnrollmentJobDto, UpdateEnrollmentJobDto, AssignClusterDto, SyncClustersDto } from "./enrollment.dto";

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
}
