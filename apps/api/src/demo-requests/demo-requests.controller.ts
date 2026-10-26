import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DemoRequestsService } from './demo-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('demo-requests')
export class DemoRequestsController {
  constructor(private readonly demoRequestsService: DemoRequestsService) {}

  @Post()
  create(@Body() dto: any) {
    return this.demoRequestsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SUPER_ADMIN)
  findAll() {
    return this.demoRequestsService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.demoRequestsService.updateStatus(id, status);
  }
}
