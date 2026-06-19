import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubjectDto, UpdateSubjectDto } from "./subjects.dto";

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string, courseId?: string, departmentId?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (courseId) where.courseId = courseId;
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.subject.findMany({
      where,
      include: { course: true, department: true, teacher: true },
    });
  }

  async findById(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: { course: true, department: true, teacher: true },
    });
    if (!subject) throw new NotFoundException("Subject not found");
    return subject;
  }

  async create(dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: dto, include: { course: true, department: true } });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException("Subject not found");
    return this.prisma.subject.update({ where: { id }, data: dto, include: { course: true, department: true, teacher: true } });
  }

  async remove(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException("Subject not found");
    return this.prisma.subject.delete({ where: { id } });
  }
}
