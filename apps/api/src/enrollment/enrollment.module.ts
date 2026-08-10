import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentService } from "./enrollment.service";

// Multer storage — saves to AI service storage dir so FastAPI can read files directly
const multerStorage = diskStorage({
  destination: (req: any, file: Express.Multer.File, cb: (err: any, destination: string) => void) => {
    const sessionId: string = (req.params?.["id"] as string) || "unknown";
    // Save into AI service storage so the AI can read directly by absolute path
    const dir: string = path.join(
      process.cwd(),
      "..",
      "ai-service",
      "storage",
      "enrollment",
      sessionId,
      "videos",
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file: Express.Multer.File, cb: (err: any, filename: string) => void) => {
    const ts = Date.now();
    const ext: string = path.extname(file.originalname) || ".mp4";
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
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
