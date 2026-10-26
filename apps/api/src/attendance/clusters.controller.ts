import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('clusters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClustersController {
  constructor(private attendance: AttendanceService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getClusters() {
    return this.attendance.getClustersList();
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getClusterById(@Param('id') id: string) {
    return this.attendance.getClusterById(id);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  deleteCluster(@Param('id') id: string) {
    return this.attendance.deleteCluster(id);
  }
}
