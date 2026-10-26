import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);

  private get aiServiceUrl(): string {
    return (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(
      /\/$/,
      '',
    );
  }

  /**
   * Proxies the MJPEG stream from the internal AI service directly to the client browser.
   */
  pipeStream(
    cameraId: string,
    mode: string,
    req: Request,
    res: Response,
  ): void {
    const targetUrl = new URL(`${this.aiServiceUrl}/api/v1/camera/stream`);
    targetUrl.searchParams.set('camera_id', cameraId || 'webcam');
    targetUrl.searchParams.set('mode', mode || 'attendance');
    targetUrl.searchParams.set('_t', Date.now().toString());

    const client = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.get(targetUrl.toString(), (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 200, {
        'Content-Type':
          upstreamRes.headers['content-type'] ||
          'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      upstreamRes.pipe(res);

      upstreamRes.on('error', (err) => {
        this.logger.warn(`Upstream camera stream error: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).end();
        }
      });
    });

    proxyReq.on('error', (err) => {
      this.logger.warn(
        `Failed to connect to AI camera stream at ${targetUrl.toString()}: ${err.message}`,
      );
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Camera service unavailable',
          message: 'Could not connect to internal AI stream gateway.',
        });
      }
    });

    // Abort upstream connection if the client browser disconnects or closes tab
    req.on('close', () => {
      proxyReq.destroy();
    });
  }

  /**
   * Proxies a single snapshot frame from the internal AI service.
   */
  async pipeFrame(
    cameraId: string,
    mode: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const targetUrl = new URL(`${this.aiServiceUrl}/api/v1/camera/frame`);
    targetUrl.searchParams.set('camera_id', cameraId || 'webcam');
    targetUrl.searchParams.set('mode', mode || 'attendance');
    targetUrl.searchParams.set('_t', Date.now().toString());

    const client = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.get(targetUrl.toString(), (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 200, {
        'Content-Type': upstreamRes.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Access-Control-Allow-Origin': '*',
      });

      upstreamRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      this.logger.warn(
        `Failed to fetch camera frame from ${targetUrl.toString()}: ${err.message}`,
      );
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Camera snapshot unavailable',
        });
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  }

  /**
   * Forwards playback control actions (seek, next, prev, speed) to the AI service.
   */
  async controlPlayback(payload: any): Promise<any> {
    try {
      const res = await fetch(`${this.aiServiceUrl}/api/v1/camera/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (e: any) {
      this.logger.warn(`Camera control error: ${e.message}`);
      return { status: 'offline', error: e.message };
    }
  }

  /**
   * Forwards camera health and metrics inquiry.
   */
  async getStatus(cameraId: string): Promise<any> {
    try {
      const res = await fetch(
        `${this.aiServiceUrl}/api/v1/camera/status?camera_id=${encodeURIComponent(cameraId)}`,
      );
      return await res.json();
    } catch (e: any) {
      return {
        camera_online: false,
        resolution: '0x0',
        fps: 0.0,
        detection_rate: 0.0,
        recognition_rate: 0.0,
        last_frame_timestamp: 0.0,
        error: 'AI camera service unreachable',
      };
    }
  }

  /**
   * Forwards active playback status.
   */
  async getPlaybackStatus(cameraId: string): Promise<any> {
    try {
      const res = await fetch(
        `${this.aiServiceUrl}/api/v1/camera/playback-status?camera_id=${encodeURIComponent(cameraId)}`,
      );
      return await res.json();
    } catch (e: any) {
      return { status: 'unknown', error: e.message };
    }
  }
}
