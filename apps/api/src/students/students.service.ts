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
    return this.prisma.student.create({
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
}
