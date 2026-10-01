import type { ZodType } from 'zod';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system?: string;
  messages: LlmMessage[];
  /** Low (0) for extraction consistency, higher (~1) for varied synthetic text. */
  temperature?: number;
  /** Overrides the configured default output limit. */
  maxTokens?: number;
}

export interface StructuredLlmRequest<T> extends LlmRequest {
  /** Output contract. Keep it JSON-representable: no transforms, dates, or refinements on shape. */
  schema: ZodType<T>;
}

export interface LlmResult<T> {
  output: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Provider-neutral text generation. Failures surface only as errors from
 * `llm.errors.ts`, never as SDK errors.
 */
export abstract class LlmClient {
  /** Free-form text, e.g. synthetic clinical documents. */
  abstract generateText(request: LlmRequest): Promise<LlmResult<string>>;

  /** JSON output validated against `request.schema`. */
  abstract generateStructured<T>(
    request: StructuredLlmRequest<T>,
  ): Promise<LlmResult<T>>;
}
