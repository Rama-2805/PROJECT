import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ClassroomsService } from "./classrooms.service";
import { CreateClassroomDto, UpdateClassroomDto } from "./classrooms.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("classrooms")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomsController {
  constructor(private classrooms: ClassroomsService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT, RoleName.DEVICE_MANAGER)
  findAll(
    @Query("institutionId") institutionId?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.classrooms.findAll(institutionId, departmentId);
  }

  @Get(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT, RoleName.DEVICE_MANAGER)
  findById(@Param("id") id: string) {
    return this.classrooms.findById(id);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  create(@Body() dto: CreateClassroomDto) {
    return this.classrooms.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateClassroomDto) {
    return this.classrooms.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param("id") id: string) {
    return this.classrooms.remove(id);
  }
}
