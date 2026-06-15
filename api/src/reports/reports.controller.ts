import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { GenerateReportDto, ReportHistoryQueryDto, ScheduledReportDto } from "./reports.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Post("generate")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  generateReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.reports.generateReport(dto, userId);
  }

  @Get("history")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getReportHistory(@Query() query: ReportHistoryQueryDto) {
    return this.reports.getReportHistory(query);
  }

  @Get(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  getReport(@Param("id") id: string) {
    return this.reports.getReport(id);
  }

  @Get(":id/download")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.RESEARCH_ANALYST)
  downloadReport(@Param("id") id: string) {
    return this.reports.getReport(id);
  }

  @Post("schedule")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  scheduleReport(
    @Body() dto: ScheduledReportDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.reports.scheduleReport(dto, userId);
  }
}
