import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { Env } from './infrastructure/config/env.schema';

/**
 * Claim import files have no size rule; this only stops a single request from
 * exhausting the API's memory. Bodies are parsed before the session guard
 * runs, so the ceiling stays finite and applies to the import routes only.
 */
const IMPORT_BODY_LIMIT = '200mb';

async function bootstrap(): Promise<void> {
  // Body parsers are registered below so imports can take larger bodies.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Behind a reverse proxy, the rate limiter must key on the forwarded client IP.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  // Claim import files travel as JSON text; every other route keeps the
  // Express default of 100 KB. The first parser that matches handles a body.
  app.use('/imports/claims', json({ limit: IMPORT_BODY_LIMIT }));
  app.use(json());

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
