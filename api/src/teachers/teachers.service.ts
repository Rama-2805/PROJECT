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
    return this.prisma.teacher.create({ data: dto, include: { department: true } });
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
