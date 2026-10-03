import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { Env } from './infrastructure/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Behind a reverse proxy, the rate limiter must key on the forwarded client IP.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  // Claim import files (up to 2 MB) travel as JSON text; the Express default is 100 KB.
  app.useBodyParser('json', { limit: '3mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Credentials allow the session cookie added in M-11.
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  // Runs onModuleDestroy (e.g. Prisma disconnect) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
