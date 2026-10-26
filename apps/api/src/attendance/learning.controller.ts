import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('learning/candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LearningController {
  constructor(private attendance: AttendanceService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getCandidates(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.attendance.getCandidates(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      status,
      search,
    );
  }

  @Get('stats')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getCandidateStats() {
    return this.attendance.getCandidateStats();
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  getCandidateById(@Param('id') id: string) {
    return this.attendance.getCandidateById(id);
  }

  @Post(':id/approve')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  approveCandidate(@Param('id') id: string) {
    return this.attendance.approveCandidate(id);
  }

  @Post(':id/reject')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  rejectCandidate(@Param('id') id: string) {
    return this.attendance.rejectCandidate(id);
  }
}
