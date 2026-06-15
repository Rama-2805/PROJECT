import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { EnrollmentService } from "./enrollment.service";
import {
  CreateEnrollmentJobDto,
  UpdateEnrollmentJobDto,
  AssignClusterDto,
  MergeClustersDto,
  SyncClustersDto,
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
}
