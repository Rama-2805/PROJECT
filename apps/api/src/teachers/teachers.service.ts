import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './teachers.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string, departmentId?: string) {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    if (departmentId) where.departmentId = departmentId;
    return this.prisma.teacher.findMany({
      where,
      include: {
        department: true,
        _count: { select: { subjects: true, classSessions: true } },
      },
    });
  }

  async findById(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        department: true,
        subjects: true,
        classSessions: { include: { classroom: true } },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async create(dto: CreateTeacherDto) {
    const argon2 = await import('argon2');

    // 1. Resolve institutionId if missing
    let institutionId = dto.institutionId;
    if (!institutionId) {
      const defaultInst = await this.prisma.institution.findFirst();
      institutionId = defaultInst?.id || 'inst_default';
    }

    // 2. Resolve departmentId if code or missing
    let departmentId = dto.departmentId;
    let dept = await this.prisma.department.findFirst({
      where: {
        institutionId,
        OR: [
          { id: departmentId || '' },
          { code: departmentId || 'CSE' },
          { code: 'CSE' },
        ],
      },
    });
    if (!dept) {
      dept = await this.prisma.department.create({
        data: {
          institutionId,
          name: dto.departmentId || 'Computer Science & Engineering',
          code: dto.departmentId || 'CSE',
        },
      });
    }
    departmentId = dept.id;

    // 3. Resolve employeeId if missing
    let employeeId = dto.employeeId;
    if (!employeeId) {
      const count = await this.prisma.teacher.count({ where: { institutionId } });
      employeeId = `EMP-${String(1200 + count + 1)}`;
    }

    const isHod =
      dto.isHod ||
      dto.role?.toUpperCase() === 'HOD' ||
      dto.designation?.toUpperCase().includes('HOD') ||
      dto.designation?.toUpperCase().includes('HEAD');
    const targetRoleName = isHod ? 'HOD' : 'TEACHER';
    const roleRecord = await this.prisma.role.upsert({
      where: { name: targetRoleName },
      update: {},
      create: { name: targetRoleName, label: targetRoleName },
    });

    const passwordToSet = dto.password || (isHod ? 'hod123' : 'demo123');
    const passwordHash = await argon2.hash(passwordToSet);

    // Normalize email (lowercase and trimmed)
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Upsert User
    const user = await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        fullName: dto.fullName,
        passwordHash,
        mustChangePassword: false,
      },
      create: {
        institutionId,
        fullName: dto.fullName,
        email: normalizedEmail,
        passwordHash,
        emailVerified: true,
        mustChangePassword: false,
      },
    });

    // Assign Role
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
      update: {},
      create: { userId: user.id, roleId: roleRecord.id },
    });

    // Upsert Teacher
    const teacher = await this.prisma.teacher.upsert({
      where: {
        institutionId_employeeId: {
          institutionId,
          employeeId,
        },
      },
      update: {
        departmentId,
        fullName: dto.fullName,
        email: normalizedEmail,
        phone: dto.phone,
        specialization:
          dto.specialization ||
          (isHod
            ? 'Department Administration'
            : 'Artificial Intelligence & Software Systems'),
        userId: user.id,
      },
      create: {
        institutionId,
        departmentId,
        employeeId,
        fullName: dto.fullName,
        email: normalizedEmail,
        phone: dto.phone,
        specialization:
          dto.specialization ||
          (isHod
            ? 'Department Administration'
            : 'Artificial Intelligence & Software Systems'),
        userId: user.id,
      },
      include: { department: true },
    });

    return { ...teacher, userId: user.id, defaultPassword: passwordToSet };
  }

  async resetPassword(email: string, newPassword?: string) {
    const argon2 = await import('argon2');
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });
    if (!user) throw new NotFoundException(`User with email '${email}' not found`);

    const passwordToSet = newPassword || 'demo123';
    const passwordHash = await argon2.hash(passwordToSet);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return {
      success: true,
      email: user.email,
      message: 'Password updated successfully',
    };
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return this.prisma.teacher.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }

  async remove(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return this.prisma.teacher.delete({ where: { id } });
  }
}
