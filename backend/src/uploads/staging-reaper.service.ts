import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { UPLOAD_DIR, isStagingFileActive } from './upload.config';

/** How often abandoned staging files are swept. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/** A staging file older than this is considered abandoned. */
const STAGING_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Removes abandoned `<prefix>-<timestamp>-<random>.upload` staging files.
 *
 * Multer writes every upload under a `.upload` name before content validation
 * renames it to its canonical image name. A request that dies mid-upload (or a
 * validation path that cannot unlink) leaves that staging file behind, and
 * nothing else ever references it. Without a sweep the disk fills up.
 *
 * Only `.upload` files are eligible; stored images and unrelated files are
 * never touched. Best-effort by design: a failed sweep must not affect startup
 * or shutdown.
 */
@Injectable()
export class StagingReaperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StagingReaperService.name);
  private timer?: NodeJS.Timeout;

  onModuleInit(): void {
    void this.sweepStaleStagingFiles();
    this.timer = setInterval(() => void this.sweepStaleStagingFiles(), SWEEP_INTERVAL_MS);
    // Never keep the process (or a test runner) alive just for this timer.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Delete staging files whose mtime is older than one hour. `now` is injectable
   * so the sweep can be verified without waiting for real time to pass.
   */
  async sweepStaleStagingFiles(now: number = Date.now()): Promise<number> {
    let entries: string[];
    try {
      entries = await readdir(UPLOAD_DIR);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'ENOENT') {
        this.logger.warn(`Could not read upload directory: ${code ?? 'unknown'}`);
      }
      return 0;
    }

    let removed = 0;
    for (const entry of entries) {
      if (!entry.endsWith('.upload')) continue;

      const path = join(UPLOAD_DIR, entry);
      try {
        const info = await stat(path);
        if (!info.isFile() || now - info.mtimeMs <= STAGING_MAX_AGE_MS) continue;

        // An upload that is still in flight owns its staging file, even when the
        // mtime looks old (a paused client can stall longer than the threshold).
        if (isStagingFileActive(path)) continue;

        await unlink(path);
        removed += 1;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException)?.code;
        // The file was already removed by another sweep or by the upload path.
        if (code !== 'ENOENT') {
          this.logger.warn(`Could not remove stale staging file ${entry}: ${code ?? 'unknown'}`);
        }
      }
    }

    this.logger.log(`Removed ${removed} stale staging file(s) from ${UPLOAD_DIR}`);
    return removed;
  }
}
