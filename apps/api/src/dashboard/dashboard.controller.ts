import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("admin")
  getAdminSummary() {
    return this.dashboardService.getAdminSummary();
  }

  @Get("teacher/:teacherId")
  getTeacherSummary(@Param("teacherId") teacherId: string) {
    return this.dashboardService.getTeacherSummary(teacherId);
  }

  @Get("alerts")
  getLiveAlerts() {
    return this.dashboardService.getLiveAlerts();
  }

  @Get("attendance-overview")
  getAttendanceOverview() {
    return this.dashboardService.getAttendanceOverview();
  }

  @Get("classroom-status")
  getClassroomStatus() {
    return this.dashboardService.getClassroomStatus();
  }

  @Get("student-risk")
  getStudentRisk() {
    return this.dashboardService.getStudentRisk();
  }

  @Get("behavior-analytics")
  getBehaviorAnalytics() {
    return this.dashboardService.getBehaviorAnalytics();
  }
}
