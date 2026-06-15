import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { TeachersService } from "./teachers.service";
import { CreateTeacherDto, UpdateTeacherDto } from "./teachers.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("teachers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private teachers: TeachersService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  findAll(
    @Query("institutionId") institutionId?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.teachers.findAll(institutionId, departmentId);
  }

  @Get(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  findById(@Param("id") id: string) {
    return this.teachers.findById(id);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  create(@Body() dto: CreateTeacherDto) {
    return this.teachers.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachers.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param("id") id: string) {
    return this.teachers.remove(id);
  }
}
