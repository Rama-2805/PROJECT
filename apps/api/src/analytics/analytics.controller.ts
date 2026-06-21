import {
  Controller, Get, Patch, Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AttendanceAnalyticsQueryDto, StudentRiskQueryDto } from "./analytics.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get("overview")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getOverview(@Query("institutionId") institutionId?: string) {
    return this.analytics.getOverview(institutionId);
  }

  @Get("attendance")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST, RoleName.TEACHER)
  getAttendanceAnalytics(@Query() query: AttendanceAnalyticsQueryDto) {
    return this.analytics.getAttendanceAnalytics(query);
  }

  @Get("behavior")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getBehaviorAnalytics(@Query("institutionId") institutionId?: string) {
    return this.analytics.getBehaviorAnalytics(institutionId);
  }

  @Get("risk-students")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getRiskStudents(@Query() query: StudentRiskQueryDto) {
    return this.analytics.getRiskStudents(query);
  }

  @Get("departments")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getDepartmentStats(@Query("institutionId") institutionId?: string) {
    return this.analytics.getDepartmentStats(institutionId);
  }

  @Get("ai-performance")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getAIPerformance(@Query("institutionId") institutionId?: string) {
    return this.analytics.getAIPerformance(institutionId);
  }

  @Get("recognition")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getRecognitionAnalytics(@Query("institutionId") institutionId?: string) {
    return this.analytics.getRecognitionAnalytics(institutionId);
  }

  @Get("unknown-faces")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getUnknownFaceAnalytics(@Query("institutionId") institutionId?: string) {
    return this.analytics.getUnknownFaceAnalytics(institutionId);
  }

  @Get("continuous-learning")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getContinuousLearningAnalytics(@Query("institutionId") institutionId?: string) {
    return this.analytics.getContinuousLearningAnalytics(institutionId);
  }

  @Get("devices")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.DEVICE_MANAGER)
  getDeviceAnalytics(@Query("institutionId") institutionId?: string) {
    return this.analytics.getDeviceAnalytics(institutionId);
  }

  @Get("insights")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getInsights(@Query("institutionId") institutionId?: string) {
    return this.analytics.getInsights(institutionId);
  }

  @Patch("insights/:id/read")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  markInsightRead(@Param("id") id: string) {
    return this.analytics.markInsightRead(id);
  }
}
