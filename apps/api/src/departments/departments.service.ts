import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string) {
    let resolvedInstitutionId = institutionId;
    if (!resolvedInstitutionId) {
      const defaultInst = await this.prisma.institution.findFirst();
      resolvedInstitutionId = defaultInst?.id;
    }
    const where = resolvedInstitutionId ? { institutionId: resolvedInstitutionId } : {};
    return this.prisma.department.findMany({
      where,
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classrooms: true,
            courses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classrooms: true,
            courses: true,
          },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    let institutionId = dto.institutionId;
    if (!institutionId) {
      const defaultInst = await this.prisma.institution.findFirst();
      institutionId = defaultInst?.id || 'inst_default';
    }
    const cleanCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.department.findFirst({
      where: {
        institutionId,
        code: cleanCode,
      },
    });

    if (existing) {
      return this.prisma.department.update({
        where: { id: existing.id },
        data: {
          name: dto.name.trim(),
          hodName: dto.hodName?.trim() || existing.hodName,
          description: dto.description?.trim() || existing.description,
        },
        include: {
          _count: {
            select: {
              students: true,
              teachers: true,
              classrooms: true,
              courses: true,
            },
          },
        },
      });
    }

    return this.prisma.department.create({
      data: {
        institutionId,
        name: dto.name.trim(),
        code: cleanCode,
        hodName: dto.hodName?.trim() || null,
        description: dto.description?.trim() || null,
      },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classrooms: true,
            courses: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return this.prisma.department.delete({ where: { id } });
  }
}
