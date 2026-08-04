import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto, UpdateStudentDto, StudentQueryDto } from "./students.dto";

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: StudentQueryDto) {
    const {
      institutionId,
      departmentId,
      courseId,
      semester,
      section,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (semester) where.semester = parseInt(semester);
    if (section) where.section = section;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { studentId: { contains: search, mode: "insensitive" } },
        { rollNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { department: true, course: true },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { department: true, course: true, institution: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    return student;
  }

  async create(dto: CreateStudentDto) {
    const argon2 = await import("argon2");

    const student = await this.prisma.student.create({
      data: {
        institutionId: dto.institutionId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        studentId: dto.studentId,
        rollNumber: dto.rollNumber,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        semester: dto.semester ? parseInt(dto.semester) : 1,
        section: dto.section,
        batchYear: dto.batchYear,
        status: dto.status || "ACTIVE",
      },
      include: { department: true, course: true },
    });

    const emailToUse = dto.email || `${dto.studentId.toLowerCase()}.cs2023@vemanait.edu.in`;
    const studentRole = await this.prisma.role.upsert({
      where: { name: "STUDENT" },
      update: {},
      create: { name: "STUDENT", label: "Student" },
    });
    const passwordHash = await argon2.hash("demo123");

    const user = await this.prisma.user.upsert({
      where: { email: emailToUse },
      update: {
        fullName: dto.fullName,
        mustChangePassword: true,
      },
      create: {
        institutionId: dto.institutionId,
        fullName: dto.fullName,
        email: emailToUse,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: studentRole.id } },
      update: {},
      create: { userId: user.id, roleId: studentRole.id },
    });

    await this.prisma.student.update({
      where: { id: student.id },
      data: { userId: user.id, email: emailToUse },
    });

    return { ...student, email: emailToUse, userId: user.id };
  }

  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException("Student not found");

    return this.prisma.student.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        semester: dto.semester ? parseInt(dto.semester) : undefined,
      },
      include: { department: true, course: true },
    });
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException("Student not found");
    return this.prisma.student.delete({ where: { id } });
  }

  async getStats(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};
    const students = await this.prisma.student.findMany({ where });
    const total = students.length;
    const faceEnrolled = students.filter((s) => s.faceEnrolled).length;
    const avgAttendance = total > 0
      ? students.reduce((sum, s) => sum + s.attendancePercentage, 0) / total
      : 0;
    const avgEngagement = total > 0
      ? students.reduce((sum, s) => sum + s.engagementScore, 0) / total
      : 0;

    return {
      totalStudents: total,
      faceEnrolled,
      pendingEnrollment: total - faceEnrolled,
      averageAttendance: parseFloat(avgAttendance.toFixed(1)),
      averageEngagement: parseFloat(avgEngagement.toFixed(1)),
    };
  }

  async resetStudentPassword(id: string, customPassword?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    const argon2 = await import("argon2");
    const newPass = customPassword || "demo123";
    const passwordHash = await argon2.hash(newPass);

    if (student.userId) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });
    } else if (student.email) {
      const studentRole = await this.prisma.role.findUnique({ where: { name: "STUDENT" } });
      const user = await this.prisma.user.upsert({
        where: { email: student.email },
        update: { passwordHash, mustChangePassword: true },
        create: {
          institutionId: student.institutionId,
          fullName: student.fullName,
          email: student.email,
          passwordHash,
          mustChangePassword: true,
          userRoles: studentRole ? { create: { roleId: studentRole.id } } : undefined,
        },
      });
      await this.prisma.student.update({
        where: { id: student.id },
        data: { userId: user.id },
      });
    }

    return {
      success: true,
      message: `Password for ${student.fullName} has been reset to "${newPass}".`,
      tempPassword: newPass,
    };
  }
}
