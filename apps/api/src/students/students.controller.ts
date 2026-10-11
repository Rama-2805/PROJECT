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
} from "@nestjs/common";
import { StudentsService } from "./students.service";
import { CreateStudentDto, UpdateStudentDto, StudentQueryDto } from "./students.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RoleName } from "../_shared/enums/roles";

@Controller("students")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT, RoleName.RESEARCH_ANALYST)
  findAll(@Query() query: StudentQueryDto) {
    return this.students.findAll(query);
  }

  @Get("stats")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT)
  getStats(@Query("institutionId") institutionId?: string) {
    return this.students.getStats(institutionId);
  }

  @Get(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT, RoleName.RESEARCH_ANALYST)
  findById(@Param("id") id: string) {
    return this.students.findById(id);
  }

  @Get(":id/biometrics")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT, RoleName.RESEARCH_ANALYST)
  getBiometrics(@Param("id") id: string) {
    return this.students.getStudentBiometrics(id);
  }

  @Post("sync-enrollment")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.STUDENT)
  syncEnrollment(@Body() dto: { usn: string; faceSamples?: number; profilePhoto?: string }) {
    return this.students.markStudentEnrolled(dto);
  }

  @Post("update-photo")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD, RoleName.STUDENT, RoleName.RESEARCH_ANALYST)
  updatePhoto(
    @Body() dto: { studentId?: string; usn?: string; photoData: string },
    @CurrentUser() user: any,
  ) {
    return this.students.updateStudentPhoto({
      ...dto,
      userId: user?.sub || user?.id,
      email: user?.email,
    });
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  create(@Body() dto: CreateStudentDto) {
    return this.students.create(dto);
  }

  @Patch(":id")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateStudentDto) {
    return this.students.update(id, dto);
  }

  @Delete(":id")
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param("id") id: string) {
    return this.students.remove(id);
  }

  @Post("reset-all-enrollment")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  resetAllEnrollment() {
    return this.students.resetAllEnrolledStudents();
  }

  @Post(":id/reset-password")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  resetPassword(@Param("id") id: string, @Body("password") password?: string) {
    return this.students.resetStudentPassword(id, password);
  }

  @Delete(":id/face-enrollment")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD)
  clearFaceEnrollment(@Param("id") id: string) {
    return this.students.clearStudentFaceEnrollment(id);
  }

  @Post(":id/clear-enrollment")
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER, RoleName.HOD)
  clearFaceEnrollmentPost(@Param("id") id: string) {
    return this.students.clearStudentFaceEnrollment(id);
  }
}
