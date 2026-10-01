import { Module } from '@nestjs/common';
import { LlmClient } from '../../application/ports/llm-client.port';
import { OpenAiLlmClient } from './openai-llm.client';

@Module({
  providers: [{ provide: LlmClient, useClass: OpenAiLlmClient }],
  exports: [LlmClient],
})
export class LlmModule {}
