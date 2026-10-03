import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIConnectionError, APIError, OpenAIError } from 'openai';
import { z, type ZodType } from 'zod';
import {
  LlmClient,
  type LlmMessage,
  type LlmRequest,
  type LlmResult,
  type StructuredLlmRequest,
} from '../../application/ports/llm-client.port';
import {
  LlmConfigurationError,
  LlmError,
  LlmInvalidOutputError,
  LlmRefusedError,
  LlmUnavailableError,
} from '../../application/ports/llm.errors';
import type { Env } from '../config/env.schema';
import { Semaphore } from './semaphore';

type Usage = LlmResult<unknown>['usage'];

interface Completion {
  content: string;
  model: string;
  usage: Usage;
}

/** Statuses that signal a bad key, model, or request; retrying cannot fix them. */
const CONFIGURATION_STATUSES = new Set([400, 401, 403, 404, 422]);

/**
 * `LlmClient` backed by the `openai` SDK, pointed at any OpenAI-compatible
 * endpoint (DeepSeek V4 Flash via SumoPod by default). The SDK retries 408/409/429/5xx and network
 * errors; this class only retries once on output that fails the schema.
 */
@Injectable()
export class OpenAiLlmClient extends LlmClient {
  private readonly logger = new Logger(OpenAiLlmClient.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly semaphore: Semaphore;

  // Explicit token so the class also resolves under runtimes without decorator metadata (tsx).
  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    super();
    this.client = new OpenAI({
      apiKey: config.get('LLM_API_KEY', { infer: true }),
      baseURL: config.get('LLM_BASE_URL', { infer: true }),
      timeout: config.get('LLM_TIMEOUT_MS', { infer: true }),
      maxRetries: config.get('LLM_MAX_RETRIES', { infer: true }),
    });
    this.model = config.get('LLM_MODEL', { infer: true });
    this.maxTokens = config.get('LLM_MAX_TOKENS', { infer: true });
    this.semaphore = new Semaphore(
      config.get('LLM_CONCURRENCY', { infer: true }),
    );
  }

  async generateText(request: LlmRequest): Promise<LlmResult<string>> {
    const completion = await this.complete(request, request.messages, false);
    if (!completion.content.trim()) {
      throw new LlmInvalidOutputError('Model returned no content', 'empty');
    }
    return {
      output: completion.content,
      model: completion.model,
      usage: completion.usage,
    };
  }

  async generateStructured<T>(
    request: StructuredLlmRequest<T>,
  ): Promise<LlmResult<T>> {
    const system = withJsonInstruction(request.system, request.schema);
    const usage: Usage = { inputTokens: 0, outputTokens: 0 };
    let messages = request.messages;

    for (let attempt = 1; ; attempt++) {
      const completion = await this.complete(
        { ...request, system },
        messages,
        true,
      );
      usage.inputTokens += completion.usage.inputTokens;
      usage.outputTokens += completion.usage.outputTokens;

      const parsed = parseJson(completion.content, request.schema);
      if (parsed.success) {
        return { output: parsed.data, model: completion.model, usage };
      }
      if (attempt === 2) {
        throw new LlmInvalidOutputError(
          `Structured output invalid after retry: ${parsed.problem}`,
          completion.content.trim() ? 'schema_mismatch' : 'empty',
        );
      }

      // Show the model its own mistake; a blind repeat tends to fail the same way.
      messages = completion.content.trim()
        ? [
            ...request.messages,
            { role: 'assistant', content: completion.content },
            {
              role: 'user',
              content: `Your previous reply was invalid: ${parsed.problem}\nReply again with only the corrected JSON object.`,
            },
          ]
        : request.messages;
    }
  }

  /** One rate-limited API call with finish-reason checks and error translation. */
  private async complete(
    request: LlmRequest,
    messages: LlmMessage[],
    json: boolean,
  ): Promise<Completion> {
    const startedAt = Date.now();
    const completion = await this.semaphore
      .run(() =>
        this.client.chat.completions.create({
          model: this.model,
          max_tokens: request.maxTokens ?? this.maxTokens,
          temperature: request.temperature,
          messages: [
            ...(request.system
              ? [{ role: 'system' as const, content: request.system }]
              : []),
            ...messages,
          ],
          ...(json
            ? { response_format: { type: 'json_object' as const } }
            : {}),
        }),
      )
      .catch(translateError);

    const usage: Usage = {
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
    // Token counts only: prompts and documents contain patient data.
    this.logger.log(
      `model=${completion.model} input=${usage.inputTokens} output=${usage.outputTokens} ms=${Date.now() - startedAt}`,
    );

    const choice = completion.choices[0];
    if (!choice) {
      throw new LlmInvalidOutputError('Model returned no choices', 'empty');
    }
    if (choice.finish_reason === 'content_filter') throw new LlmRefusedError();
    if (choice.finish_reason === 'length') {
      throw new LlmInvalidOutputError(
        'Output hit the max_tokens limit',
        'truncated',
      );
    }

    return {
      content: choice.message.content ?? '',
      model: completion.model,
      usage,
    };
  }
}

/** Appends the JSON-only instruction and schema; JSON mode requires "JSON" in the prompt. */
function withJsonInstruction(
  system: string | undefined,
  schema: ZodType,
): string {
  const instruction = `Respond with a single JSON object only, matching this JSON schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
  return system ? `${system}\n\n${instruction}` : instruction;
}

function parseJson<T>(
  content: string,
  schema: ZodType<T>,
): { success: true; data: T } | { success: false; problem: string } {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { success: false, problem: 'response is not valid JSON' };
  }
  const result = schema.safeParse(value);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, problem: z.prettifyError(result.error) };
}

/** Maps SDK errors to port errors so nothing provider-specific leaks out. */
function translateError(error: unknown): never {
  if (error instanceof LlmError) throw error;
  // Includes timeouts, which subclass APIConnectionError.
  if (error instanceof APIConnectionError) {
    throw new LlmUnavailableError('LLM provider unreachable', { cause: error });
  }
  if (
    error instanceof APIError &&
    error.status !== undefined &&
    CONFIGURATION_STATUSES.has(error.status)
  ) {
    throw new LlmConfigurationError(
      `LLM request rejected with status ${error.status}`,
      { cause: error },
    );
  }
  if (error instanceof OpenAIError) {
    throw new LlmUnavailableError('LLM provider failed', { cause: error });
  }
  throw error;
}
