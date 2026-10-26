import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { EnrollmentService } from "./enrollment.service";
import { multerStorage } from "./enrollment.module";
import {
  CreateEnrollmentJobDto,
  UpdateEnrollmentJobDto,
  AssignClusterDto,
  MergeClustersDto,
  SyncClustersDto,
  ManualEnrollmentDto,
  ApproveUnknownClusterDto,
  BulkImportBiometricsDto,
  CreateAutomaticSessionDto,
  UploadSessionVideosDto,
  AssignClusterStudentDto,
  FinalizeSessionDto,
} from "./enrollment.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("enrollment")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentController {
  constructor(private enrollment: EnrollmentService) {}

  @Post("upload-video")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  createJob(@Body() dto: CreateEnrollmentJobDto) {
    return this.enrollment.createJob(dto);
  }

  @Get("jobs")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.DEVICE_MANAGER)
  findAll(
    @Query("institutionId") institutionId?: string,
    @Query("status") status?: string,
  ) {
    return this.enrollment.findAll(institutionId, status);
  }

  @Get("jobs/:id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  findById(@Param("id") id: string) {
    return this.enrollment.findById(id);
  }

  @Post("jobs/:id/progress")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  updateProgress(
    @Param("id") id: string,
    @Body() dto: UpdateEnrollmentJobDto,
  ) {
    return this.enrollment.updateJob(id, dto);
  }

  @Post("jobs/:id/clusters/sync")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  syncClusters(@Param("id") id: string, @Body() dto: SyncClustersDto) {
    return this.enrollment.syncClusters(id, dto);
  }

  @Get("jobs/:id/clusters")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getClusters(@Param("id") id: string) {
    return this.enrollment.getClusters(id);
  }

  @Post("clusters/:id/assign")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  assignCluster(@Param("id") id: string, @Body() dto: AssignClusterDto) {
    return this.enrollment.assignCluster(id, dto);
  }

  @Post("clusters/merge")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  mergeClusters(@Body() dto: MergeClustersDto) {
    return this.enrollment.mergeClusters(dto.sourceClusterId, dto.targetClusterId);
  }

  @Delete("clusters/:id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  deleteCluster(@Param("id") id: string) {
    return this.enrollment.deleteCluster(id);
  }

  @Delete("clusters/:id/images")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  deleteClusterImage(
    @Param("id") id: string,
    @Body() dto: { imageId?: string; imageUrl?: string; imagePath?: string },
  ) {
    return this.enrollment.deleteClusterImage(id, dto);
  }

  @Post("manual")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  manualEnroll(@Body() dto: ManualEnrollmentDto) {
    return this.enrollment.manualEnroll(dto);
  }

  @Get("student/:studentId/gallery")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.STUDENT)
  getStudentGallery(@Param("studentId") studentId: string) {
    return this.enrollment.getStudentGallery(studentId);
  }

  @Post("student/:studentId/gallery/:imageId/primary")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  setPrimaryImage(
    @Param("studentId") studentId: string,
    @Param("imageId") imageId: string
  ) {
    return this.enrollment.setPrimaryImage(studentId, imageId);
  }

  @Delete("student/:studentId/gallery/:imageId")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  deleteFaceImage(
    @Param("studentId") studentId: string,
    @Param("imageId") imageId: string
  ) {
    return this.enrollment.deleteFaceImage(studentId, imageId);
  }

  @Get("unknown-clusters")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getUnknownClusters() {
    return this.enrollment.getUnknownClusters();
  }

  @Post("unknown-clusters/:clusterId/approve")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  approveUnknownCluster(
    @Param("clusterId") clusterId: string,
    @Body("studentId") studentId: string
  ) {
    return this.enrollment.approveUnknownCluster(clusterId, studentId);
  }

  @Post("unknown-clusters/:clusterId/reject")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  rejectUnknownCluster(@Param("clusterId") clusterId: string) {
    return this.enrollment.rejectUnknownCluster(clusterId);
  }

  @Get("sessions")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getSessions(
    @Query("institutionId") institutionId?: string,
    @Query("status") status?: string,
  ) {
    return this.enrollment.getSessions(institutionId, status);
  }

  @Post("sessions")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  createAutomaticSession(@Body() dto: CreateAutomaticSessionDto) {
    return this.enrollment.createAutomaticSession(dto);
  }

  @Post("sessions/:id/videos")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  uploadSessionVideos(
    @Param("id") id: string,
    @Body("videoPaths") videoPaths: string[]
  ) {
    return this.enrollment.uploadSessionVideos(id, videoPaths);
  }

  @Post("sessions/:id/upload")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  @UseInterceptors(
    FilesInterceptor("videos", 20, {
      storage: multerStorage,
      limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB per file
    })
  )
  uploadVideoFiles(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.enrollment.uploadVideoFiles(id, files);
  }

  @Get("sessions/:id/status")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getSessionStatus(@Param("id") id: string) {
    return this.enrollment.getSessionStatus(id);
  }

  @Post("sessions/:id/start")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  startSessionProcessing(
    @Param("id") id: string,
    @Body("detector") detector?: string
  ) {
    return this.enrollment.startSessionProcessing(id, detector);
  }

  @Get("sessions/:id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getSessionDetails(@Param("id") id: string) {
    return this.enrollment.getSessionDetails(id);
  }

  @Get("sessions/:id/clusters")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getSessionClusters(
    @Param("id") id: string,
    @Query("status") status?: string
  ) {
    return this.enrollment.getSessionClusters(id, status);
  }

  @Get("sessions/:id/diagnostics")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getSessionDiagnostics(@Param("id") id: string) {
    return this.enrollment.getSessionDiagnostics(id);
  }

  @Post("clusters/assign-student")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  assignClusterStudent(@Body() dto: AssignClusterStudentDto) {
    return this.enrollment.assignClusterStudent(dto);
  }

  @Post("clusters/:id/confirm")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  confirmCluster(@Param("id") id: string, @Body() dto: { sessionId?: string }) {
    return this.enrollment.confirmCluster(id, dto);
  }

  @Post("sessions/:id/finalize")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  finalizeEnrollmentSession(@Param("id") id: string) {
    return this.enrollment.finalizeEnrollmentSession(id);
  }

  @Post("sessions/:id/process")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  processSessionVideos(@Param("id") id: string) {
    return this.enrollment.processSessionVideos(id);
  }

  @Post("sessions/:id/sync-clusters")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  syncAiClusters(@Param("id") id: string) {
    return this.enrollment.syncAiClusters(id);
  }

  @Post("sessions/:id/pause")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  pauseSessionProcessing(@Param("id") id: string) {
    return this.enrollment.pauseSessionProcessing(id);
  }

  @Post("sessions/:id/resume")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  resumeSessionProcessing(@Param("id") id: string) {
    return this.enrollment.resumeSessionProcessing(id);
  }

  @Post("sessions/:id/stop")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  stopSessionProcessing(@Param("id") id: string) {
    return this.enrollment.stopSessionProcessing(id);
  }

  @Delete("sessions/:id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  deleteEnrollmentSession(@Param("id") id: string) {
    return this.enrollment.deleteEnrollmentSession(id);
  }

  @Post("clusters/:id/reject")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  rejectCluster(@Param("id") id: string) {
    return this.enrollment.rejectStudentCluster(id);
  }
}
