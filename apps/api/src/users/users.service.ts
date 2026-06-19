import { Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./users.dto";

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
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        institutionId: dto.institutionId,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
      },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: { userRoles: { include: { role: true } } },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.delete({ where: { id } });
  }
}
