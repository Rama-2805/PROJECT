import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import {
  IngestBehaviorDto,
  ResolveBehaviorDto,
  BehaviorQueryDto,
  AcknowledgeAlertDto,
  CreateEngagementRecordDto,
} from './behavior.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('behavior')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BehaviorController {
  constructor(private behavior: BehaviorService) {}

  @Post('ingest')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.DEVICE_MANAGER,
  )
  ingest(@Body() dto: IngestBehaviorDto) {
    return this.behavior.ingest(dto);
  }

  @Post('resolve')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.DEVICE_MANAGER,
  )
  resolve(@Body() dto: ResolveBehaviorDto) {
    return this.behavior.resolve(dto);
  }

  @Get('live')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
  )
  getLiveBehavior(@Query('cameraId') cameraId?: string) {
    return this.behavior.getLiveBehavior(cameraId);
  }

  @Get('events')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.RESEARCH_ANALYST,
  )
  getEvents(@Query() query: BehaviorQueryDto) {
    return this.behavior.queryEvents(query);
  }

  @Get('student/:studentId')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
  )
  getStudentBehavior(@Param('studentId') studentId: string) {
    return this.behavior.getStudentBehavior(studentId);
  }

  @Get('analytics')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.RESEARCH_ANALYST,
  )
  getAnalytics() {
    return this.behavior.getAnalytics();
  }

  @Get('alerts')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
  )
  getAlerts(
    @Query('severity') severity?: string,
    @Query('section') section?: string,
  ) {
    return this.behavior.getAlerts(severity, section);
  }

  @Patch('alerts/:alertId/acknowledge')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
  )
  acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() dto: AcknowledgeAlertDto,
  ) {
    return this.behavior.acknowledgeAlert(alertId, dto);
  }

  @Patch('alerts/:alertId/dismiss')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
  )
  dismissAlert(@Param('alertId') alertId: string) {
    return this.behavior.dismissAlert(alertId);
  }

  @Get('engagement/trend')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
  )
  getEngagementTrend(@Query('sessionId') sessionId?: string) {
    return this.behavior.getEngagementTrend(sessionId);
  }

  @Post('engagement')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.DEVICE_MANAGER,
  )
  recordEngagement(@Body() dto: CreateEngagementRecordDto) {
    return this.behavior.recordEngagement(dto);
  }
}
