import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto, UpdateClassroomDto } from './classrooms.dto';

@Injectable()
export class ClassroomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string, departmentId?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.classroom.findMany({
      where,
      include: {
        department: true,
        _count: { select: { classSessions: true } },
      },
    });
  }

  async findById(id: string) {
    const room = await this.prisma.classroom.findUnique({
      where: { id },
      include: {
        department: true,
        classSessions: { include: { teacher: true } },
      },
    });
    if (!room) throw new NotFoundException('Classroom not found');
    return room;
  }

  async create(dto: CreateClassroomDto) {
    let institutionId = dto.institutionId;
    let departmentId = dto.departmentId;

    if (!institutionId) {
      const inst = await this.prisma.institution.findFirst();
      if (inst) institutionId = inst.id;
    }
    if (departmentId) {
      const existingDept = await this.prisma.department.findFirst({
        where: {
          OR: [
            { id: departmentId },
            { code: { equals: departmentId.replace(/^dept-/i, ''), mode: 'insensitive' } },
            { name: { contains: departmentId.replace(/^dept-/i, ''), mode: 'insensitive' } },
          ],
        },
      });
      if (existingDept) {
        departmentId = existingDept.id;
      } else {
        departmentId = undefined;
      }
    }

    if (!departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: institutionId ? { institutionId } : undefined,
      }) || await this.prisma.department.findFirst();
      if (dept) departmentId = dept.id;
    }

    if (!institutionId || !departmentId) {
      throw new Error('Unable to resolve institution or department for classroom creation');
    }

    return this.prisma.classroom.create({
      data: {
        institutionId,
        departmentId,
        roomNumber: dto.roomNumber,
        building: dto.building || 'Main Block',
        floor: dto.floor || 1,
        capacity: dto.capacity || 40,
        devices: dto.devices ? JSON.stringify(dto.devices) : '[]',
      },
      include: { department: true },
    });
  }

  async update(id: string, dto: UpdateClassroomDto) {
    const room = await this.prisma.classroom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Classroom not found');
    return this.prisma.classroom.update({
      where: { id },
      data: {
        ...dto,
        devices: dto.devices ? JSON.stringify(dto.devices) : undefined,
      },
      include: { department: true },
    });
  }

  async remove(id: string) {
    const room = await this.prisma.classroom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Classroom not found');
    return this.prisma.classroom.delete({ where: { id } });
  }
}
