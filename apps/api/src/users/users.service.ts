import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { RoleName } from '../_shared/enums/roles';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(institutionId?: string) {
    const where = institutionId ? { institutionId } : {};
    return this.prisma.user.findMany({
      where,
      include: { userRoles: { include: { role: true } } },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } }, institution: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, currentUser?: any) {
    const roleName = dto.role?.toUpperCase();

    // SEC-04: Prevent unauthorized privilege escalation to SUPER_ADMIN
    if (roleName === 'SUPER_ADMIN') {
      const isSuperAdmin =
        currentUser?.roles?.includes(RoleName.SUPER_ADMIN) ||
        currentUser?.roles?.includes('SUPER_ADMIN');
      if (!isSuperAdmin) {
        throw new ForbiddenException(
          'Privilege escalation rejected: Only Super Admins can provision Super Admin accounts',
        );
      }
    }

    // Cross-tenant boundary protection: Institutional admins cannot create users in another institution
    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN')
    ) {
      if (dto.institutionId && dto.institutionId !== currentUser.institutionId) {
        throw new ForbiddenException(
          'Cross-tenant violation: Cannot provision users for another institution',
        );
      }
    }

    const passwordHash = await argon2.hash(dto.password || 'demo123');

    const user = await this.prisma.user.create({
      data: {
        institutionId: dto.institutionId,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        mustChangePassword: true,
      },
    });

    if (roleName) {
      const roleRecord = await this.prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName, label: roleName },
      });
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
        update: {},
        create: { userId: user.id, roleId: roleRecord.id },
      });
    }

    if (roleName === 'STUDENT') {
      const existingStudent = await this.prisma.student.findFirst({
        where: { email: dto.email },
      });
      if (!existingStudent) {
        const dept = await this.prisma.department.findFirst({
          where: { institutionId: dto.institutionId },
        });
        const course = await this.prisma.course.findFirst({
          where: { institutionId: dto.institutionId },
        });
        if (dept && course) {
          const studentCount = await this.prisma.student.count();
          const studentId = `STU${String(studentCount + 1).padStart(4, '0')}`;
          await this.prisma.student.create({
            data: {
              institutionId: dto.institutionId,
              departmentId: dept.id,
              courseId: course.id,
              studentId,
              fullName: dto.fullName,
              email: dto.email,
              userId: user.id,
              semester: 1,
            },
          });
        }
      } else {
        await this.prisma.student.update({
          where: { id: existingStudent.id },
          data: { userId: user.id },
        });
      }
    } else if (roleName === 'TEACHER' || roleName === 'HOD') {
      const existingTeacher = await this.prisma.teacher.findFirst({
        where: { email: dto.email },
      });
      if (!existingTeacher) {
        const dept = await this.prisma.department.findFirst({
          where: { institutionId: dto.institutionId },
        });
        if (dept) {
          const teacherCount = await this.prisma.teacher.count();
          const employeeId = `EMP${String(teacherCount + 1).padStart(4, '0')}`;
          await this.prisma.teacher.create({
            data: {
              institutionId: dto.institutionId,
              departmentId: dept.id,
              employeeId,
              fullName: dto.fullName,
              email: dto.email,
              userId: user.id,
            },
          });
        }
      } else {
        await this.prisma.teacher.update({
          where: { id: existingTeacher.id },
          data: { userId: user.id },
        });
      }
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUser?: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (
      currentUser &&
      currentUser.institutionId &&
      !currentUser.roles?.includes(RoleName.SUPER_ADMIN) &&
      !currentUser.roles?.includes('SUPER_ADMIN')
    ) {
      if (user.institutionId !== currentUser.institutionId) {
        throw new ForbiddenException(
          'Cross-tenant violation: Cannot update user from another institution',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: { userRoles: { include: { role: true } } },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.delete({ where: { id } });
  }
}
