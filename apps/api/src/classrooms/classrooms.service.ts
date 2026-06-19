import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClassroomDto, UpdateClassroomDto } from "./classrooms.dto";

@Injectable()
export class ClassroomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string, departmentId?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.classroom.findMany({
      where,
      include: { department: true, _count: { select: { classSessions: true } } },
    });
  }

  async findById(id: string) {
    const room = await this.prisma.classroom.findUnique({
      where: { id },
      include: { department: true, classSessions: { include: { teacher: true } } },
    });
    if (!room) throw new NotFoundException("Classroom not found");
    return room;
  }

  async create(dto: CreateClassroomDto) {
    return this.prisma.classroom.create({
      data: {
        institutionId: dto.institutionId,
        departmentId: dto.departmentId,
        roomNumber: dto.roomNumber,
        building: dto.building,
        floor: dto.floor || 1,
        capacity: dto.capacity || 30,
        devices: dto.devices ? JSON.stringify(dto.devices) : "[]",
      },
      include: { department: true },
    });
  }

  async update(id: string, dto: UpdateClassroomDto) {
    const room = await this.prisma.classroom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException("Classroom not found");
    return this.prisma.classroom.update({
      where: { id },
      data: { ...dto, devices: dto.devices ? JSON.stringify(dto.devices) : undefined },
      include: { department: true },
    });
  }

  async remove(id: string) {
    const room = await this.prisma.classroom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException("Classroom not found");
    return this.prisma.classroom.delete({ where: { id } });
  }
}
