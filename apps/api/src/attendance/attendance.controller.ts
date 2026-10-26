import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  StartSessionDto,
  IngestAttendanceDto,
  AttendanceQueryDto,
  UnknownFaceDto,
  CorrectAttendanceDto,
} from './attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../_shared/types/jwt';
import { RoleName } from '../_shared/enums/roles';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Post('sessions/start')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  startSession(
    @Body() dto: StartSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.startSession(dto, user);
  }

  @Post('sessions/:sessionId/end')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  endSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.endSession(sessionId, user);
  }

  @Post('sessions/:sessionId/process')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  processVideoAttendance(
    @Param('sessionId') sessionId: string,
    @Body('videoPath') videoPath: string,
    @Body('classId') classId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.attendance.processVideoAttendance(
      sessionId,
      videoPath,
      classId,
      user,
    );
  }

  @Post('ingest')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.DEVICE_MANAGER,
  )
  ingest(
    @Body() dto: IngestAttendanceDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.attendance.ingest(dto, user);
  }

  @Get('live')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.STUDENT,
  )
  getLiveStatus(
    @Query('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.getLiveStatus(sessionId, user);
  }

  @Get('session/:sessionId')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.STUDENT,
  )
  getSessionHistory(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.getSessionHistory(sessionId, user);
  }

  @Get('student/:studentId')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.STUDENT,
    RoleName.RESEARCH_ANALYST,
  )
  getStudentAnalytics(
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.getStudentAnalytics(studentId, user);
  }

  @Get('records')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.STUDENT,
  )
  query(
    @Query() queryDto: AttendanceQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.query(queryDto, user);
  }

  @Post('records/:recordId/correct')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  correctAttendance(
    @Param('recordId') recordId: string,
    @Body() dto: CorrectAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.correctAttendance(recordId, dto, user);
  }

  @Patch('records/:recordId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  updateRecordStatus(
    @Param('recordId') recordId: string,
    @Body() dto: CorrectAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendance.correctAttendance(recordId, dto, user);
  }

  @Post('unknown-face')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
  )
  reportUnknownFace(@Body() dto: UnknownFaceDto) {
    return this.attendance.reportUnknownFace(
      dto.institutionId,
      dto.classroomId,
      dto.cameraId,
    );
  }

  @Get('unknown-faces')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  getUnknownFaces(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.attendance.getUnknownFaces(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('unknown-faces/:id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  getUnknownFaceById(@Param('id') id: string) {
    return this.attendance.getUnknownFaceById(id);
  }

  @Delete('unknown-faces/:id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  deleteUnknownFace(@Param('id') id: string) {
    return this.attendance.deleteUnknownFace(id);
  }

  @Post('unknown-faces/:id/assign')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  assignUnknownFace(
    @Param('id') id: string,
    @Body() dto: { studentId: string; studentUsn?: string },
    @Req() req: any,
  ) {
    return this.attendance.assignUnknownFace(id, dto, req.user?.id);
  }

  @Post('unknown-faces/:id/keep-unknown')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  keepUnknownFace(@Param('id') id: string) {
    return this.attendance.keepUnknownFace(id);
  }

  @Post('unknown-faces/:id/dismiss')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  dismissUnknownFace(@Param('id') id: string) {
    return this.attendance.dismissUnknownFace(id);
  }

  @Post('unknown-faces/enroll')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  enrollUnknown(@Body() dto: any) {
    return this.attendance.enrollUnknown(dto);
  }

  @Post('unknown-faces/visitor')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  markVisitor(@Body() dto: any) {
    return this.attendance.markVisitor(dto);
  }

  @Post('unknown-faces/ignore')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  ignoreUnknown(@Body() dto: any) {
    return this.attendance.ignoreUnknown(dto);
  }

  @Post('unknown-faces/alert')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.HOD, RoleName.TEACHER)
  triggerAlert(@Body() dto: any) {
    return this.attendance.triggerAlert(dto);
  }

  @Post('optimizer/run')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  runOptimizer() {
    return this.attendance.runOptimizer();
  }

  @Post('optimizer/rollback')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  rollbackProfile(@Body() dto: any) {
    return this.attendance.rollbackProfile(dto);
  }
}
