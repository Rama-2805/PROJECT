import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { StartSessionDto, IngestAttendanceDto, AttendanceQueryDto, UnknownFaceDto } from "./attendance.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("attendance")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Post("sessions/start")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  startSession(@Body() dto: StartSessionDto) {
    return this.attendance.startSession(dto);
  }

  @Post("sessions/:sessionId/end")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  endSession(@Param("sessionId") sessionId: string) {
    return this.attendance.endSession(sessionId);
  }

  @Post("ingest")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.DEVICE_MANAGER)
  ingest(@Body() dto: IngestAttendanceDto) {
    return this.attendance.ingest(dto);
  }

  @Get("live")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getLiveStatus(@Query("sessionId") sessionId: string) {
    return this.attendance.getLiveStatus(sessionId);
  }

  @Get("session/:sessionId")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getSessionHistory(@Param("sessionId") sessionId: string) {
    return this.attendance.getSessionHistory(sessionId);
  }

  @Get("student/:studentId")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.RESEARCH_ANALYST)
  getStudentAnalytics(@Param("studentId") studentId: string) {
    return this.attendance.getStudentAnalytics(studentId);
  }

  @Get("records")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  query(@Query() queryDto: AttendanceQueryDto) {
    return this.attendance.query(queryDto);
  }

  @Post("unknown-face")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.DEVICE_MANAGER)
  reportUnknownFace(@Body() dto: UnknownFaceDto) {
    return this.attendance.reportUnknownFace(dto.institutionId, dto.classroomId, dto.cameraId);
  }
}
