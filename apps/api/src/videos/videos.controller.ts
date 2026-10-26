import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { VideosService } from './videos.service';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '../_shared/enums/roles';

@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly jwtService: JwtService,
  ) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException(
          'Server configuration error: JWT secret not defined',
        );
      }
      return 'dev-jwt-secret-do-not-use-in-production-123';
    }
    return secret;
  }

  private authenticateStreamRequest(req: Request): any {
    const secret = this.getJwtSecret();

    // 1. Check Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        return this.jwtService.verify(token, { secret });
      } catch {
        // Fall through to query token
      }
    }

    // 2. Check query param token for native browser <video> tags
    const queryToken = req.query.token as string;
    if (queryToken) {
      try {
        return this.jwtService.verify(queryToken, { secret });
      } catch {
        // Fall through to cookie
      }
    }

    // 3. Check cookie
    const cookieToken =
      req.cookies?.['smartcampus_access_token'] || req.cookies?.['accessToken'];
    if (cookieToken) {
      try {
        return this.jwtService.verify(cookieToken, { secret });
      } catch {
        // Fall through
      }
    }

    // Allow streaming in local development only if non-production
    if (process.env.NODE_ENV !== 'production') {
      return { role: RoleName.TEACHER, id: 'dev-stream-user' };
    }

    throw new UnauthorizedException(
      'Authentication token required for video access',
    );
  }

  @Get('footage')
  listFootage(@Req() req: Request) {
    this.authenticateStreamRequest(req);
    return this.videosService.listFootage();
  }

  @Get(':id/details')
  getVideoDetails(@Param('id') id: string, @Req() req: Request) {
    this.authenticateStreamRequest(req);
    return this.videosService.getVideoDetails(id);
  }

  @Get(':id/stream')
  async streamEnrollmentVideo(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.authenticateStreamRequest(req);
    await this.videosService.streamEnrollmentVideo(id, req, res);
  }

  @Get('stream')
  async streamVideoByKey(
    @Query('key') key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.authenticateStreamRequest(req);
    await this.videosService.streamVideoByKey(key || '', req, res);
  }
}
