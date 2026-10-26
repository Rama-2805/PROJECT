import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CameraService } from './camera.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('camera')
@UseGuards(JwtAuthGuard)
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Get('stream')
  getStream(
    @Query('camera_id') cameraId: string,
    @Query('mode') mode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.cameraService.pipeStream(cameraId, mode, req, res);
  }

  @Get('frame')
  getFrame(
    @Query('camera_id') cameraId: string,
    @Query('mode') mode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.cameraService.pipeFrame(cameraId, mode, req, res);
  }

  @Post('control')
  controlPlayback(@Body() payload: any) {
    return this.cameraService.controlPlayback(payload);
  }

  @Get('status')
  getStatus(@Query('camera_id') cameraId: string) {
    return this.cameraService.getStatus(cameraId || 'webcam');
  }

  @Get('playback-status')
  getPlaybackStatus(@Query('camera_id') cameraId: string) {
    return this.cameraService.getPlaybackStatus(cameraId || 'room-023');
  }
}
