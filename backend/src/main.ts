import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { DEFAULT_PORT, ensureUploadDir, validateConfig } from './config';
import { ShutdownService } from './shutdown/shutdown.service';

async function bootstrap(): Promise<void> {
  // Fail fast BEFORE Nest loads any module: an invalid or incomplete
  // configuration (including the H-5 JWT_SECRET rules) aborts startup with one
  // aggregated, operator-facing report that never contains secret values or
  // connection strings (see config/config.validation.ts).
  const config = validateConfig();
  if (!config.ok) {
    console.error('Refusing to start. Invalid configuration:');
    for (const error of config.errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  if (config.warnings.length > 0) {
    // Production risk warnings: start, but make the risky setting visible.
    for (const warning of config.warnings) {
      console.warn(`Configuration warning: ${warning}`);
    }
  }

  // Create the upload directory up front so a storage misconfiguration
  // surfaces at startup, not as a 500 on the first upload. The resolved
  // absolute path is logged (M-7) so the operator can see where files land.
  const uploadDir = ensureUploadDir();
  console.log('Upload directory (absolute):', uploadDir);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Only trust X-Forwarded-For from the number of reverse-proxy hops set by the
  // operator (e.g. TRUST_PROXY=1 behind one Nginx or Render load balancer).
  // Unset = do not trust, so clients cannot spoof their IP for rate limiting.
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY.trim()));
  }
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT?.trim() ? Number(process.env.PORT.trim()) : DEFAULT_PORT;
  await app.listen(port);
  console.log('Raccoon Coffee backend running on port', port);

  // Graceful shutdown (M-13): the service owns SIGINT/SIGTERM. register() only
  // wires signal handling; shutdown starts when a signal actually arrives.
  const shutdown = app.get(ShutdownService);
  shutdown.register(app);
  await shutdown.stop;
}

bootstrap();
