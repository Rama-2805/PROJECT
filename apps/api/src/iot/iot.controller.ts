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
import { IotService } from './iot.service';
import {
  RegisterDeviceDto,
  HeartbeatDto,
  DeviceLogDto,
  DeviceCommandDto,
  DeviceFilterDto,
  AuthDeviceDto,
} from './iot.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('iot')
export class IotController {
  constructor(private iot: IotService) {}

  /* ─── Authentication & Registration ─────────────────────────── */

  @Post('auth')
  authenticate(@Body() dto: AuthDeviceDto) {
    return this.iot.authenticate(dto);
  }

  @Post('devices/register')
  register(@Body() dto: RegisterDeviceDto) {
    return this.iot.register(dto);
  }

  /* ─── Heartbeat ──────────────────────────────────────────────── */

  @Post('heartbeat')
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.iot.processHeartbeat(dto);
  }

  /* ─── Device Management (Authenticated) ──────────────────────── */

  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getDevices(@Query() filter: DeviceFilterDto) {
    return this.iot.queryDevices(filter);
  }

  @Get('devices/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getDeviceStats() {
    return this.iot.getDeviceStats();
  }

  @Get('devices/offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getOfflineDevices(@Query('threshold') threshold?: string) {
    return this.iot.getOfflineDevices(threshold ? parseInt(threshold) : 2);
  }

  @Get('devices/:deviceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getDevice(@Param('deviceId') deviceId: string) {
    return this.iot.getDevice(deviceId);
  }

  @Get('devices/:deviceId/heartbeats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getDeviceHeartbeats(
    @Param('deviceId') deviceId: string,
    @Query('hours') hours?: string,
  ) {
    return this.iot.getDeviceHeartbeats(deviceId, hours ? parseInt(hours) : 24);
  }

  /* ─── Logs & Commands ────────────────────────────────────────── */

  @Post('logs')
  addLog(@Body() dto: DeviceLogDto) {
    return this.iot.addDeviceLog(dto);
  }

  @Get('devices/:deviceId/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getDeviceLogs(
    @Param('deviceId') deviceId: string,
    @Query('level') level?: string,
  ) {
    return this.iot.getDeviceLogs(deviceId, level);
  }

  @Post('devices/:deviceId/commands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  sendCommand(
    @Param('deviceId') deviceId: string,
    @Body() dto: DeviceCommandDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.iot.sendCommand(deviceId, dto, userId);
  }

  @Get('devices/:deviceId/commands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
    RoleName.HOD,
    RoleName.TEACHER,
  )
  getCommandHistory(@Param('deviceId') deviceId: string) {
    return this.iot.getCommandHistory(deviceId);
  }

  /* ─── AI Model Registry ──────────────────────────────────────── */

  @Get('models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getModels() {
    return this.iot.getModelRegistry();
  }
}
