// ─── SmartCampus AI — Campus Digital Twin Controller ──

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CampusService } from './campus.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('campus')
@UseGuards(JwtAuthGuard)
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get('overview')
  getOverview() {
    return this.campusService.getOverview();
  }

  @Get('buildings')
  getBuildings() {
    return this.campusService.getBuildings();
  }

  @Get('buildings/:id')
  getBuilding(@Param('id') id: string) {
    return this.campusService.getBuilding(id);
  }

  @Get('devices')
  getDevices() {
    return this.campusService.getDevices();
  }

  @Get('devices/building/:buildingId')
  getDevicesByBuilding(@Param('buildingId') buildingId: string) {
    return this.campusService.getDevicesByBuilding(buildingId);
  }

  @Get('predictions')
  getPredictions() {
    return this.campusService.getPredictions();
  }

  @Get('occupancy')
  getOccupancy() {
    return this.campusService.getOccupancy();
  }

  @Get('status')
  getStatus() {
    return {
      overview: this.campusService.getOverview(),
      statusUpdates: this.campusService.getStatusUpdates(),
    };
  }

  @Get('3d-model')
  get3dModel() {
    return {
      buildings: this.campusService.getBuildings(),
      devices: this.campusService.getDevices(),
    };
  }
}
