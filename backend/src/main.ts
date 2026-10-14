import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Only trust X-Forwarded-For from the number of reverse-proxy hops set by the
  // operator (e.g. TRUST_PROXY=1 behind one Nginx or Render load balancer).
  // Unset = do not trust, so clients cannot spoof their IP for rate limiting.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    if (!Number.isInteger(hops) || hops < 0) {
      throw new Error('TRUST_PROXY must be a non-negative integer (number of proxy hops).');
    }
    app.set('trust proxy', hops);
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
  // Default dev port changed to 3001 per project config.
  await app.listen(process.env.PORT ?? 3001);
  console.log('Raccoon Coffee backend running on port', process.env.PORT ?? 3001);
}
bootstrap();