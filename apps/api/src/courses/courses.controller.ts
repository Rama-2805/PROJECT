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
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './courses.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private courses: CoursesService) {}

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
    @Query('departmentId') departmentId?: string,
  ) {
    return this.courses.findAll(institutionId, departmentId);
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
    return this.courses.findById(id);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.courses.remove(id);
  }
}
