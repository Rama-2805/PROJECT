// ─── SmartCampus AI — Mobile API Controller ─────────────

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MobileService } from './mobile.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('mobile')
@UseGuards(JwtAuthGuard)
export class MobileController {
  constructor(private readonly mobile: MobileService) {}

  // ── Student Endpoints ─────────────────────────────────
  @Get('student/dashboard')
  getStudentDashboard(@Query('studentId') studentId: string) {
    return this.mobile.getStudentDashboard(studentId || 'default');
  }

  @Get('student/attendance')
  getStudentAttendance(@Query('studentId') studentId: string) {
    return this.mobile.getStudentAttendance(studentId || 'default');
  }

  @Get('student/insights')
  getStudentInsights(@Query('studentId') studentId: string) {
    return this.mobile.getStudentInsights(studentId || 'default');
  }

  @Get('student/schedule')
  getStudentSchedule(@Query('studentId') studentId: string) {
    return this.mobile.getStudentSchedule(studentId || 'default');
  }

  @Post('chat')
  sendChatMessage(@Body() body: { message: string }) {
    return this.mobile.sendChatMessage(body.message);
  }

  // ── Parent Endpoints ──────────────────────────────────
  @Get('parent/dashboard')
  getParentDashboard(@Query('parentId') parentId: string) {
    return this.mobile.getParentDashboard(parentId || 'default');
  }

  @Get('parent/analytics')
  getParentAnalytics(@Query('parentId') parentId: string) {
    return this.mobile.getParentAnalytics(parentId || 'default');
  }

  @Get('parent/notifications')
  getParentNotifications(@Query('parentId') parentId: string) {
    return this.mobile.getParentNotifications(parentId || 'default');
  }

  // ── Teacher Endpoints ─────────────────────────────────
  @Get('teacher/classes')
  getTeacherClasses(@Query('teacherId') teacherId: string) {
    return this.mobile.getTeacherClasses(teacherId || 'default');
  }

  @Post('teacher/session/start')
  startSession(@Body() body: { classroomId: string; subjectName: string }) {
    return this.mobile.startSession(body.classroomId, body.subjectName);
  }

  @Post('teacher/session/end')
  endSession(@Body() body: { sessionId: string }) {
    return this.mobile.endSession(body.sessionId);
  }

  @Get('teacher/alerts')
  getTeacherAlerts(@Query('teacherId') teacherId: string) {
    return this.mobile.getTeacherAlerts(teacherId || 'default');
  }

  @Get('teacher/session/:sessionId/qr')
  generateQRCode(@Param('sessionId') sessionId: string) {
    return this.mobile.generateQRCode(sessionId);
  }

  // ── QR Attendance ─────────────────────────────────────
  @Post('attendance/qr')
  scanQRCode(@Body() body: { qrData: string }) {
    return this.mobile.scanQRCode(body.qrData);
  }

  // ── Notifications ─────────────────────────────────────
  @Get('notifications')
  getNotifications(@Query('userId') userId: string) {
    return this.mobile.getNotifications(userId || 'default');
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@Param('id') id: string) {
    return this.mobile.markNotificationRead(id);
  }

  @Post('notifications/device')
  registerDeviceToken(@Body() body: { userId: string; token: string }) {
    return this.mobile.registerDeviceToken(
      body.userId || 'default',
      body.token,
    );
  }
}
