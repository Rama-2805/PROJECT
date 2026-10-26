import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  AttendanceAnalyticsQueryDto,
  StudentRiskQueryDto,
} from './analytics.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../_shared/types/jwt';
import { RoleName } from '../_shared/enums/roles';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  private resolveInstitutionId(
    user?: JwtPayload,
    queryInstitutionId?: string,
  ): string | undefined {
    const isSuperAdmin =
      user?.roles?.includes(RoleName.SUPER_ADMIN) ||
      user?.roles?.includes('SUPER_ADMIN');
    if (isSuperAdmin) {
      return queryInstitutionId;
    }
    if (user?.institutionId) {
      if (queryInstitutionId && queryInstitutionId !== user.institutionId) {
        throw new ForbiddenException(
          'Cross-tenant violation: Access denied to other institution analytics',
        );
      }
      return user.institutionId;
    }
    return queryInstitutionId;
  }

  @Get('overview')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getOverview(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getOverview(effectiveInstId);
  }

  @Get('attendance')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
    RoleName.TEACHER,
  )
  getAttendanceAnalytics(
    @Query() query: AttendanceAnalyticsQueryDto,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getAttendanceAnalytics(query, effectiveInstId);
  }

  @Get('behavior')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getBehaviorAnalytics(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getBehaviorAnalytics(effectiveInstId);
  }

  @Get('risk-students')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getRiskStudents(
    @Query() query: StudentRiskQueryDto,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getRiskStudents(query, effectiveInstId);
  }

  @Get('departments')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getDepartmentStats(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getDepartmentStats(effectiveInstId);
  }

  @Get('ai-performance')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  getAIPerformance(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getAIPerformance(effectiveInstId);
  }

  @Get('recognition')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getRecognitionAnalytics(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getRecognitionAnalytics(effectiveInstId);
  }

  @Get('unknown-faces')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getUnknownFaceAnalytics(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getUnknownFaceAnalytics(effectiveInstId);
  }

  @Get('continuous-learning')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getContinuousLearningAnalytics(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getContinuousLearningAnalytics(effectiveInstId);
  }

  @Get('devices')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.DEVICE_MANAGER,
  )
  getDeviceAnalytics(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getDeviceAnalytics(effectiveInstId);
  }

  @Get('insights')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  getInsights(
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveInstId = this.resolveInstitutionId(user, institutionId);
    return this.analytics.getInsights(effectiveInstId);
  }

  @Patch('insights/:id/read')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.RESEARCH_ANALYST,
  )
  markInsightRead(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.analytics.markInsightRead(id, user);
  }
}
