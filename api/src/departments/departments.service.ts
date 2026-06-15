import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./departments.dto";

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};
    return this.prisma.department.findMany({
      where,
      include: {
        _count: { select: { students: true, teachers: true, classrooms: true, courses: true } },
      },
    });
  }

  async findById(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true, teachers: true, classrooms: true, courses: true } },
      },
    });
    if (!dept) throw new NotFoundException("Department not found");
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException("Department not found");
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException("Department not found");
    return this.prisma.department.delete({ where: { id } });
  }
}
