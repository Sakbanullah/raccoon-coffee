import { Injectable, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'http';
/**
 * Graceful shutdown (M-13).
 *
 * This service OWNS SIGINT/SIGTERM handling; Nest's `enableShutdownHooks` is
 * deliberately NOT used. Nest's own signal cleanup re-raises the signal
 * (`process.kill(pid, signal)`) after hooks complete, which Windows cannot
 * re-raise natively, and mixing two signal owners invites re-entrant closes.
 *
 * Flow on a signal:
 *   1. Initiate exactly once (repeats are logged and ignored).
 *   2. `closeIdleConnections()` drops idle keep-alive sockets so the HTTP
 *      drain resolves promptly; in-flight requests keep their sockets.
 *   3. `app.close()` — verified against the installed @nestjs/platform-express
 *      10.4.22: without `forceCloseConnections` the adapter's close() is a
 *      plain `httpServer.close()` (drain semantics), and module destroy hooks
 *      run exactly once, so PrismaService.$disconnect() runs exactly once.
 *   4. Explicit deadline: only if the drain exceeds SHUTDOWN_TIMEOUT_MS does
 *      the process exit(1); normal cleanup never hits it.
 */
const SHUTDOWN_SIGNALS: ['SIGTERM', 'SIGINT'] = ['SIGTERM', 'SIGINT'];
const SHUTDOWN_TIMEOUT_MS = 10_000;

@Injectable()
export class ShutdownService {
  private readonly logger = new Logger(ShutdownService.name);
  private app: NestExpressApplication | undefined;
  private stopping = false;
  private stopPromise: Promise<void> | undefined;

  /** Wire signal handling. Never initiates shutdown. Called once from main.ts. */
  register(app: NestExpressApplication): void {
    this.app = app;
    for (const signal of SHUTDOWN_SIGNALS) {
      process.on(signal, () => this.initiateShutdown(signal));
    }
  }

  private initiateShutdown(signal: string): void {
    // Exactly-once: repeated SIGINT/SIGTERM while stopping are ignored (no
    // duplicate cleanup, no forced exit during normal cleanup).
    if (this.stopping) {
      this.logger.warn(`Shutdown already in progress; ignoring repeated ${signal}.`);
      return;
    }
    const app = this.app;
    if (!app) return;
    this.stopping = true;
    this.stopPromise = (async () => {
      this.logger.log(`Received ${signal}. Draining connections…`);
      const server = app.getHttpServer() as Server | undefined;
      if (server && typeof server.closeIdleConnections === 'function') {
        // Node >= 18.2. Live requests keep their sockets; the drain below
        // resolves promptly instead of waiting for keep-alive pools.
        server.closeIdleConnections();
      }
      const drained = app.close();
      const deadline = new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Shutdown exceeded ${SHUTDOWN_TIMEOUT_MS}ms; exiting.`)),
          SHUTDOWN_TIMEOUT_MS,
        );
        timer.unref?.();
      });
      try {
        await Promise.race([drained, deadline]);
        this.logger.log('Application shut down cleanly.');
      } catch (err) {
        // Only reached when the deadline fires — normal cleanup never does.
        this.logger.error(
          err instanceof Error ? err.message : 'Error during application shutdown.',
          err instanceof Error ? err.stack : undefined,
        );
        process.exit(1);
      }
    })();
  }

  /** Exposed for main.ts to await a clean stop. Resolves immediately until a signal arrives. */
  get stop(): Promise<void> {
    return this.stopPromise ?? Promise.resolve();
  }

  get isStopping(): boolean {
    return this.stopping;
  }
}
