import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('privacy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrivacyController {
  constructor(private privacy: PrivacyService) {}

  @Get('summary')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getSummary() {
    return this.privacy.getPrivacySummary('inst-001');
  }

  @Get('student/:studentId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getStudentData(@Param('studentId') studentId: string) {
    return this.privacy.getStudentData(studentId);
  }

  @Post('student/:studentId/delete')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  requestDeletion(
    @Param('studentId') studentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.privacy.requestDataDeletion(studentId, userId);
  }

  @Get('student/:studentId/history')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getAccessHistory(@Param('studentId') studentId: string) {
    return this.privacy.getAccessHistory(studentId);
  }

  @Get('retention-policies')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getRetentionPolicies() {
    return this.privacy.getRetentionPolicies();
  }

  @Get('student/:studentId/export')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  exportStudentData(@Param('studentId') studentId: string) {
    return this.privacy.exportStudentData(studentId);
  }
}
