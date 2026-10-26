import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../_shared/types/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    const accessSecret =
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!accessSecret && process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_ACCESS_SECRET or JWT_SECRET environment variable is missing in production.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        (req: any) =>
          req?.cookies?.['smartcampus_access_token'] ||
          req?.cookies?.['accessToken'] ||
          null,
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret || 'sc-ai-access-secret-dev-only',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      sub: user.id,
      email: user.email,
      institutionId: user.institutionId,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
