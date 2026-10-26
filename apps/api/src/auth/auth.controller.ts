import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  ChangePasswordDto,
  ForgotPasswordDto,
} from './auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../_shared/types/jwt';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.auth.setRefreshCookie(res, result.tokens.refreshToken);
    return { success: true, data: result };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.auth.setRefreshCookie(res, result.tokens.refreshToken);
    return { success: true, data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() dto: Partial<RefreshDto>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken || dto?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const result = await this.auth.refresh(token);
    this.auth.setRefreshCookie(res, result.tokens.refreshToken);
    return { success: true, data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Attempt to log audit log if user token is valid
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const payload: any = this.auth.decodeToken(token);
        if (payload?.sub) {
          await this.auth.logout(payload.sub);
        }
      }
    } catch {
      // Non-blocking for logout
    }
    this.auth.clearRefreshCookie(res);
    return { success: true, message: 'Logged out' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.sub, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@CurrentUser() user: JwtPayload) {
    const data = await this.auth.getProfile(user.sub);
    return { success: true, data };
  }
}
