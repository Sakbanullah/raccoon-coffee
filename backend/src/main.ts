import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  // Default dev port changed to 3001 per project config.
  await app.listen(process.env.PORT ?? 3001);
  console.log('Raccoon Coffee backend running on port', process.env.PORT ?? 3001);
}
bootstrap();
