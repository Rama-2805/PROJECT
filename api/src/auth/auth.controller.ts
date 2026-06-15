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
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./auth.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.auth.setRefreshCookie(res, result.tokens.refreshToken);
    return { success: true, data: result };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.auth.setRefreshCookie(res, result.tokens.refreshToken);
    return { success: true, data: result };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return { success: false, error: "No refresh token" };
    }
    const result = await this.auth.refresh(token);
    this.auth.setRefreshCookie(res, result.tokens.refreshToken);
    return { success: true, data: result };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sub);
    this.auth.clearRefreshCookie(res);
    return { success: true, message: "Logged out" };
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  async profile(@CurrentUser() user: JwtPayload) {
    const data = await this.auth.getProfile(user.sub);
    return { success: true, data };
  }
}
