/**
 * Live check against the configured LLM provider (two small paid calls).
 * Confirms the model name, JSON mode support, and output limit before
 * M-02/M-03 depend on them.
 *
 *   npm run llm:smoke
 */
import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { z } from 'zod';
import { LlmClient } from '../src/application/ports/llm-client.port';
import { validateEnv } from '../src/infrastructure/config/env.schema';
import { LlmModule } from '../src/infrastructure/llm/llm.module';

// Only what the LLM needs, so the check runs without a database.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LlmModule,
  ],
})
class LlmSmokeModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(LlmSmokeModule, {
    logger: ['log', 'error', 'warn'],
  });
  const llm = app.get(LlmClient);
  const logger = new Logger('LlmSmoke');

  try {
    const text = await llm.generateText({
      messages: [
        { role: 'user', content: 'Reply with one short Indonesian greeting.' },
      ],
      maxTokens: 50,
    });
    logger.log(`generateText -> ${JSON.stringify(text)}`);

    const structured = await llm.generateStructured({
      messages: [{ role: 'user', content: 'Is 7 a prime number?' }],
      schema: z.object({ ok: z.boolean(), reason: z.string() }),
      temperature: 0,
      maxTokens: 200,
    });
    logger.log(`generateStructured -> ${JSON.stringify(structured)}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
