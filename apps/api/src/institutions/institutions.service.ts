import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstitutionDto, UpdateInstitutionDto } from './institutions.dto';

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.institution.findMany({
      include: { _count: { select: { users: true } } },
    });
  }

  async findById(id: string) {
    const inst = await this.prisma.institution.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!inst) throw new NotFoundException('Institution not found');
    return inst;
  }

  async create(dto: CreateInstitutionDto) {
    return this.prisma.institution.create({ data: dto });
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    const inst = await this.prisma.institution.findUnique({ where: { id } });
    if (!inst) throw new NotFoundException('Institution not found');
    return this.prisma.institution.update({ where: { id }, data: dto });
  }
}
