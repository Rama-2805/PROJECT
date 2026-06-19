import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BehaviorService } from "./behavior.service";
import {
  IngestBehaviorDto,
  BehaviorQueryDto,
  AcknowledgeAlertDto,
  CreateEngagementRecordDto,
} from "./behavior.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("behavior")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BehaviorController {
  constructor(private behavior: BehaviorService) {}

  @Post("ingest")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.DEVICE_MANAGER)
  ingest(@Body() dto: IngestBehaviorDto) {
    return this.behavior.ingest(dto);
  }

  @Get("events")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.RESEARCH_ANALYST)
  getEvents(@Query() query: BehaviorQueryDto) {
    return this.behavior.queryEvents(query);
  }

  @Get("student/:studentId")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getStudentBehavior(@Param("studentId") studentId: string) {
    return this.behavior.getStudentBehavior(studentId);
  }

  @Get("analytics")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.RESEARCH_ANALYST)
  getAnalytics() {
    return this.behavior.getAnalytics();
  }

  @Get("alerts")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getAlerts(@Query("severity") severity?: string) {
    return this.behavior.getAlerts(severity);
  }

  @Patch("alerts/:alertId/acknowledge")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  acknowledgeAlert(
    @Param("alertId") alertId: string,
    @Body() dto: AcknowledgeAlertDto,
  ) {
    return this.behavior.acknowledgeAlert(alertId, dto);
  }

  @Patch("alerts/:alertId/dismiss")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  dismissAlert(@Param("alertId") alertId: string) {
    return this.behavior.dismissAlert(alertId);
  }

  @Get("engagement/trend")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getEngagementTrend(@Query("sessionId") sessionId?: string) {
    return this.behavior.getEngagementTrend(sessionId);
  }

  @Post("engagement")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.DEVICE_MANAGER)
  recordEngagement(@Body() dto: CreateEngagementRecordDto) {
    return this.behavior.recordEngagement(dto);
  }
}
