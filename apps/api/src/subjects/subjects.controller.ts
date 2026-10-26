import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './subjects.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private subjects: SubjectsService) {}

  @Get()
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.STUDENT,
  )
  findAll(
    @Query('institutionId') institutionId?: string,
    @Query('courseId') courseId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.subjects.findAll(institutionId, courseId, departmentId);
  }

  @Get(':id')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.INSTITUTION_ADMIN,
    RoleName.TEACHER,
    RoleName.HOD,
    RoleName.STUDENT,
  )
  findById(@Param('id') id: string) {
    return this.subjects.findById(id);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  create(@Body() dto: CreateSubjectDto) {
    return this.subjects.create(dto);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjects.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.subjects.remove(id);
  }
}
