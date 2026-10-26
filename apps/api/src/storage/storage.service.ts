import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private storageDir: string;
  private footageDir: string;

  constructor() {
    this.storageDir = this.initStorageDir();
    this.footageDir = this.initFootageDir();
    this.logger.log(
      `Initialized StorageService: storageDir="${this.storageDir}", footageDir="${this.footageDir}"`,
    );
  }

  private initStorageDir(): string {
    if (process.env.STORAGE_DIR && fs.existsSync(process.env.STORAGE_DIR)) {
      return path.resolve(process.env.STORAGE_DIR);
    }

    const candidates = [
      process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : null,
      '/app/storage',
      path.resolve(process.cwd(), '..', '..', 'apps', 'ai-service', 'storage'),
      path.resolve(process.cwd(), '..', 'ai-service', 'storage'),
      path.resolve(process.cwd(), 'apps', 'ai-service', 'storage'),
      path.resolve(process.cwd(), 'storage'),
      path.resolve(process.cwd(), '..', '..', 'storage'),
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }

    // Default to creating one in workspace or current directory
    const defaultDir = candidates[0] || path.resolve(process.cwd(), 'storage');
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {
      /* ignore */
    }
    return defaultDir;
  }

  private initFootageDir(): string {
    if (process.env.FOOTAGE_DIR && fs.existsSync(process.env.FOOTAGE_DIR)) {
      return path.resolve(process.env.FOOTAGE_DIR);
    }

    const candidates = [
      process.env.FOOTAGE_DIR ? path.resolve(process.env.FOOTAGE_DIR) : null,
      '/app/footage',
      path.resolve(process.cwd(), '..', '..', 'footage'),
      path.resolve(process.cwd(), '..', 'footage'),
      path.resolve(process.cwd(), 'footage'),
      path.join(this.storageDir, 'footage'),
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }

    return path.resolve(process.cwd(), 'footage');
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  public getFootageDir(): string {
    return this.footageDir;
  }

  public resolveSessionStorageDir(sessionId: string): string {
    const dir = path.join(this.storageDir, 'enrollment', sessionId, 'videos');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Validates that a candidate path is strictly contained within allowed storage/footage directories.
   */
  public isWithinAllowedRoots(targetPath: string): boolean {
    if (!targetPath) return false;
    const resolvedTarget = path.resolve(targetPath);
    const allowedRoots = [
      path.resolve(this.storageDir),
      path.resolve(this.footageDir),
      path.resolve(process.cwd(), 'storage'),
      path.resolve(process.cwd(), 'footage'),
      path.resolve(process.cwd(), '..', '..', 'storage'),
      path.resolve(process.cwd(), '..', '..', 'footage'),
      path.resolve('/app/storage'),
      path.resolve('/app/footage'),
    ];

    return allowedRoots.some(
      (root) =>
        resolvedTarget === root || resolvedTarget.startsWith(root + path.sep),
    );
  }

  /**
   * Resiliently resolves a video file path across local dev paths, Docker containers,
   * storage keys, and historical records while strictly preventing directory traversal.
   */
  public resolveFilePath(filePathOrKey: string): string | null {
    if (!filePathOrKey) return null;

    // Reject direct path traversal markers
    if (filePathOrKey.includes('..') && !path.isAbsolute(filePathOrKey)) {
      filePathOrKey = path
        .normalize(filePathOrKey)
        .replace(/^(\.\.[\/\\])+/, '');
    }

    // 1. Direct path check (must be contained within allowed roots)
    if (
      fs.existsSync(filePathOrKey) &&
      this.isWithinAllowedRoots(filePathOrKey)
    ) {
      return path.resolve(filePathOrKey);
    }

    const basename = path.basename(filePathOrKey);

    // 2. Extract relative subpath if filePath was an absolute path containing "storage/"
    const storageIdx = filePathOrKey.indexOf('storage/');
    if (storageIdx !== -1) {
      const relativeSubpath = filePathOrKey.substring(
        storageIdx + 'storage/'.length,
      );
      const inStorage = path.resolve(this.storageDir, relativeSubpath);
      if (this.isWithinAllowedRoots(inStorage) && fs.existsSync(inStorage))
        return inStorage;
    }

    // 3. Extract relative subpath if containing "enrollment/"
    const enrollmentIdx = filePathOrKey.indexOf('enrollment/');
    if (enrollmentIdx !== -1) {
      const relativeSubpath = filePathOrKey.substring(enrollmentIdx);
      const inStorage = path.resolve(this.storageDir, relativeSubpath);
      if (this.isWithinAllowedRoots(inStorage) && fs.existsSync(inStorage))
        return inStorage;
    }

    // 4. Try directly inside storageDir
    const directInStorage = path.resolve(this.storageDir, filePathOrKey);
    if (
      this.isWithinAllowedRoots(directInStorage) &&
      fs.existsSync(directInStorage)
    )
      return directInStorage;

    // 5. Try inside footage directory
    const inFootage = path.resolve(this.footageDir, basename);
    if (this.isWithinAllowedRoots(inFootage) && fs.existsSync(inFootage))
      return inFootage;

    // 6. Check common container paths
    const containerCandidates = [
      path.resolve('/app/storage', filePathOrKey),
      path.resolve('/app/storage', basename),
      path.resolve('/app/footage', basename),
    ];
    for (const cand of containerCandidates) {
      if (this.isWithinAllowedRoots(cand) && fs.existsSync(cand)) return cand;
    }

    // 7. Recursive lookup for filename inside storageDir
    const found = this.findFileRecursive(this.storageDir, basename);
    if (found && this.isWithinAllowedRoots(found)) return found;

    this.logger.warn(
      `Rejected file resolution outside authorized storage boundaries: "${filePathOrKey}"`,
    );
    return null;
  }

  private findFileRecursive(
    dir: string,
    targetFilename: string,
    depth = 0,
  ): string | null {
    if (depth > 4 || !fs.existsSync(dir)) return null;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name === targetFilename) {
          return fullPath;
        }
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const res = this.findFileRecursive(
            fullPath,
            targetFilename,
            depth + 1,
          );
          if (res) return res;
        }
      }
    } catch {
      /* ignore read errors */
    }
    return null;
  }

  /**
   * Generates a portable, durable relative storage key for database storage.
   */
  public toStorageKey(
    absoluteOrRelativePath: string,
    sessionId?: string,
  ): string {
    const basename = path.basename(absoluteOrRelativePath);
    if (sessionId) {
      return `enrollment/${sessionId}/videos/${basename}`;
    }
    const idx = absoluteOrRelativePath.indexOf('storage/');
    if (idx !== -1) {
      return absoluteOrRelativePath.substring(idx + 'storage/'.length);
    }
    return basename;
  }

  /**
   * Determine MIME type for browser video playback.
   */
  public getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.mp4':
      case '.m4v':
        return 'video/mp4';
      case '.webm':
        return 'video/webm';
      case '.mov':
        return 'video/quicktime';
      case '.mkv':
        return 'video/x-matroska';
      case '.avi':
        return 'video/x-msvideo';
      default:
        return 'video/mp4';
    }
  }

  /**
   * List available footage video files for classroom simulation.
   */
  public listFootageVideos(): Array<{
    fileName: string;
    size: number;
    path: string;
  }> {
    if (!fs.existsSync(this.footageDir)) return [];
    try {
      const files = fs.readdirSync(this.footageDir);
      const validExts = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
      return files
        .filter(
          (f) =>
            validExts.has(path.extname(f).toLowerCase()) && !f.startsWith('.'),
        )
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        )
        .map((f) => {
          const full = path.join(this.footageDir, f);
          const stat = fs.statSync(full);
          return {
            fileName: f,
            size: stat.size,
            path: full,
          };
        });
    } catch {
      return [];
    }
  }
}
