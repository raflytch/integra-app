/**
 * Seeds the Uji Ada evidence rules only, without claims or an LLM call.
 * Idempotent, so the production `migrate` service runs it on every deploy.
 *
 *   npm run seed:rules
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { EVIDENCE_RULES } from './synthetic/scenarios';
import { upsertEvidenceRules } from './synthetic/upsert-evidence-rules';

const API_ENV_FILE_PATH = join(__dirname, '../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class SeedEvidenceRulesModule {}

async function main(): Promise<void> {
  const logger = new Logger('SeedEvidenceRules');
  const app = await NestFactory.createApplicationContext(
    SeedEvidenceRulesModule,
    { logger: ['log', 'error', 'warn'] },
  );
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));

  try {
    await upsertEvidenceRules(prisma, EVIDENCE_RULES);
    const icd10Codes = [
      ...new Set(EVIDENCE_RULES.map((rule) => rule.icd10Code)),
    ];
    logger.log(
      `Aturan Uji Ada: ${EVIDENCE_RULES.length} (${icd10Codes.join(', ')})`,
    );
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
