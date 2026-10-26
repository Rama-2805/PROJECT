import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  GenerateReportDto,
  ReportHistoryQueryDto,
  ScheduledReportDto,
} from './reports.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../_shared/types/jwt';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Post('generate')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  generateReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.generateReport(dto, user.id, user.institutionId);
  }

  @Get('history')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getReportHistory(
    @Query() query: ReportHistoryQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.getReportHistory(query, user.institutionId);
  }

  @Get(':id')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getReport(@Param('id') id: string) {
    return this.reports.getReport(id);
  }

  @Get(':id/download')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  downloadReport(
    @Param('id') id: string,
    @Query('format') format?: string,
  ) {
    return this.reports.downloadReport(id, format);
  }

  @Post('schedule')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  scheduleReport(
    @Body() dto: ScheduledReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.scheduleReport(dto, user.id, user.institutionId);
  }
}
