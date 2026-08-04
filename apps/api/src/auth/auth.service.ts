import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "../_shared/types/jwt";
import { RegisterDto, LoginDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /* ─── Register ─────────────────────────────────────────────── */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await argon2.hash(dto.password);

    const institution = await this.prisma.institution.create({
      data: {
        name: dto.institutionName,
        slug: dto.institutionName.toLowerCase().replace(/\s+/g, "-"),
      },
    });

    const teacherRole = await this.prisma.role.findUnique({
      where: { name: "TEACHER" },
    });

    const user = await this.prisma.user.create({
      data: {
        institutionId: institution.id,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        userRoles: teacherRole
          ? { create: { roleId: teacherRole.id } }
          : undefined,
      },
      include: { userRoles: { include: { role: true } }, institution: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        entity: "User",
        entityId: user.id,
      },
    });

    return this.buildAuthResponse(user);
  }

  /* ─── Login ────────────────────────────────────────────────── */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: { include: { role: true } },
        institution: true,
        student: { include: { department: true, course: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
      },
    });

    return this.buildAuthResponse(user);
  }

  /* ─── Refresh ──────────────────────────────────────────────── */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "refresh-secret-dev-only",
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: { include: { role: true } },
          institution: true,
          student: { include: { department: true, course: true } },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User inactive or missing");
      }

      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  /* ─── Profile ──────────────────────────────────────────────── */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        institution: true,
        student: { include: { department: true, course: true } },
      },
    });

    if (!user) throw new UnauthorizedException("User not found");

    return this.sanitizeUser(user);
  }

  /* ─── Logout ───────────────────────────────────────────────── */
  async logout(userId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "LOGOUT",
        entity: "User",
        entityId: userId,
      },
    });

    return { message: "Logged out successfully" };
  }

  /* ─── Helpers ──────────────────────────────────────────────── */
  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || "sc-ai-access-secret-dev-only",
      expiresIn: "15m",
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || "refresh-secret-dev-only",
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return {
      ...safe,
      roles: user.userRoles?.map((ur: any) => ur.role.name) || [],
      userRoles: undefined,
    };
  }

  private buildAuthResponse(user: any) {
    const sanitized = this.sanitizeUser(user);
    const tokens = this.generateTokens({
      id: user.id,
      sub: user.id,
      email: user.email,
      institutionId: user.institutionId,
      roles: sanitized.roles,
    });

    return { user: sanitized, tokens };
  }

  /* ─── Cookie helpers ───────────────────────────────────────── */
  setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth/refresh",
    });
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  }

  /* ─── Password Management ──────────────────────────────────── */
  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");

    if (dto.currentPassword) {
      const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
      if (!valid) throw new BadRequestException("Current password is incorrect");
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    return { success: true, message: "Password changed successfully" };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: true, message: "If account exists, password reset instructions have been set." };
    }

    const newHash = await argon2.hash("demo123");
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: true,
      },
    });

    return {
      success: true,
      message: "Password reset to temporary password 'demo123'. Please log in and set a new password.",
      tempPassword: "demo123",
    };
  }
}
