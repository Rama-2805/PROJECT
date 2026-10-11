import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import * as fs from "fs";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Resiliently streams a video file by its EnrollmentVideo database ID with HTTP 206 Range support.
   */
  async streamEnrollmentVideo(videoId: string, req: Request, res: Response): Promise<void> {
    const video = await this.prisma.enrollmentVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException(`Video record with ID '${videoId}' not found`);
    }

    const resolvedPath = this.storage.resolveFilePath(video.filePath);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      this.logger.warn(`Video file not found on disk: id=${videoId}, filePath=${video.filePath}`);
      throw new NotFoundException(`Video file '${video.fileName}' is unavailable on storage`);
    }

    return this.pipeVideoRange(resolvedPath, req, res);
  }

  /**
   * Streams a video by storage key, relative path, or filename with HTTP 206 Range support.
   */
  async streamVideoByKey(keyOrPath: string, req: Request, res: Response): Promise<void> {
    const resolvedPath = this.storage.resolveFilePath(keyOrPath);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      this.logger.warn(`Video key not found on disk: ${keyOrPath}`);
      throw new NotFoundException(`Requested video '${keyOrPath}' is unavailable`);
    }

    return this.pipeVideoRange(resolvedPath, req, res);
  }

  /**
   * Returns metadata and playable streaming URL for an enrollment video.
   */
  async getVideoDetails(videoId: string) {
    const video = await this.prisma.enrollmentVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException(`Video with ID '${videoId}' not found`);
    }

    const resolvedPath = this.storage.resolveFilePath(video.filePath);
    const exists = Boolean(resolvedPath && fs.existsSync(resolvedPath));
    const fileSize = exists ? fs.statSync(resolvedPath!).size : (video.fileSize || 0);

    return {
      id: video.id,
      sessionId: video.enrollmentSessionId,
      fileName: video.fileName,
      fileSize,
      status: video.status,
      duration: video.duration,
      fps: video.fps,
      isAvailable: exists,
      streamUrl: `/api/videos/${video.id}/stream`,
      createdAt: video.createdAt,
    };
  }

  /**
   * List available classroom camera footage clips.
   */
  listFootage() {
    const files = this.storage.listFootageVideos();
    return files.map((f, idx) => ({
      id: `footage-${idx + 1}`,
      fileName: f.fileName,
      size: f.size,
      streamUrl: `/api/videos/stream?key=${encodeURIComponent(f.fileName)}`,
    }));
  }

  /**
   * Core HTTP Range request handler implementing RFC 7233 partial content delivery.
   */
  private pipeVideoRange(filePath: string, req: Request, res: Response): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      throw new NotFoundException("Unable to inspect video file");
    }

    const fileSize = stat.size;
    const mimeType = this.storage.getMimeType(filePath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && isNaN(end)) || end >= fileSize || start > end) {
        res.status(416);
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunkSize);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "no-cache, private");

      req.on("close", () => {
        fileStream.destroy();
      });

      fileStream.on("error", (err) => {
        this.logger.error(`Stream error for ${filePath}: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      fileStream.pipe(res);
    } else {
      res.status(200);
      res.setHeader("Content-Length", fileSize);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-cache, private");

      const fileStream = fs.createReadStream(filePath);

      req.on("close", () => {
        fileStream.destroy();
      });

      fileStream.on("error", (err) => {
        this.logger.error(`Stream error for ${filePath}: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      fileStream.pipe(res);
    }
  }
}
