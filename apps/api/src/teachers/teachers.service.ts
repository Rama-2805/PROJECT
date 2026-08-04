import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeacherDto, UpdateTeacherDto } from "./teachers.dto";

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string, departmentId?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.teacher.findMany({
      where,
      include: { department: true, _count: { select: { subjects: true, classSessions: true } } },
    });
  }

  async findById(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: { department: true, subjects: true, classSessions: { include: { classroom: true } } },
    });
    if (!teacher) throw new NotFoundException("Teacher not found");
    return teacher;
  }

  async create(dto: CreateTeacherDto) {
    const argon2 = await import("argon2");

    const teacher = await this.prisma.teacher.create({
      data: {
        institutionId: dto.institutionId,
        departmentId: dto.departmentId,
        employeeId: dto.employeeId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        specialization: dto.specialization,
      },
      include: { department: true },
    });

    const isHod = dto.isHod || dto.role?.toUpperCase() === "HOD" || dto.designation?.toUpperCase().includes("HOD") || dto.designation?.toUpperCase().includes("HEAD");
    const targetRoleName = isHod ? "HOD" : "TEACHER";
    const roleRecord = await this.prisma.role.upsert({
      where: { name: targetRoleName },
      update: {},
      create: { name: targetRoleName, label: targetRoleName },
    });

    const tempPassword = isHod ? "hod123" : "demo123";
    const passwordHash = await argon2.hash(tempPassword);

    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      update: {
        fullName: dto.fullName,
        mustChangePassword: true,
      },
      create: {
        institutionId: dto.institutionId,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
      update: {},
      create: { userId: user.id, roleId: roleRecord.id },
    });

    await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: { userId: user.id },
    });

    return { ...teacher, userId: user.id };
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException("Teacher not found");
    return this.prisma.teacher.update({ where: { id }, data: dto, include: { department: true } });
  }

  async remove(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException("Teacher not found");
    return this.prisma.teacher.delete({ where: { id } });
  }
}
