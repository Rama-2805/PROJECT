import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentService } from "./enrollment.service";

export function resolveStorageDir(sessionId: string): string {
  if (process.env.STORAGE_DIR) {
    const dir = path.join(process.env.STORAGE_DIR, "enrollment", sessionId, "videos");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  if (fs.existsSync("/app/storage")) {
    const dir = path.join("/app/storage", "enrollment", sessionId, "videos");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  let root = process.cwd();
  if (root.endsWith("apps/api") || root.endsWith("apps/api/")) {
    root = path.resolve(root, "..");
  }
  if (root.endsWith("apps") || root.endsWith("apps/")) {
    root = path.resolve(root, "..");
  }
  const dir = path.resolve(root, "apps", "ai-service", "storage", "enrollment", sessionId, "videos");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}


// Multer storage — saves to AI service storage dir so FastAPI can read files directly
export const multerStorage = diskStorage({
  destination: (req: any, file: Express.Multer.File, cb: (err: any, destination: string) => void) => {
    const sessionId: string = (req.params?.["id"] as string) || req.body?.sessionId || "default_session";
    try {
      const dir = resolveStorageDir(sessionId);
      cb(null, dir);
    } catch (err) {
      cb(err, "");
    }
  },
  filename: (req: any, file: Express.Multer.File, cb: (err: any, filename: string) => void) => {
    const ts = Date.now();
    const safe = file.originalname ? file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_") : `video_${ts}.mp4`;
    cb(null, `${ts}_${safe}`);
  },
});

@Module({
  imports: [
    MulterModule.register({
      storage: multerStorage,
      limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB max per video
    }),
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
