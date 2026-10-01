export abstract class LlmError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Transient failure (rate limit, 5xx, timeout, network) after SDK retries. Skip and move on. */
export class LlmUnavailableError extends LlmError {}

/** The provider's content filter blocked the response. Log and skip. */
export class LlmRefusedError extends LlmError {
  constructor(options?: ErrorOptions) {
    super('Response blocked by the provider content filter', options);
  }
}

/** Output was truncated, empty, or failed the schema twice. Skip; raise maxTokens if truncated. */
export class LlmInvalidOutputError extends LlmError {
  constructor(
    message: string,
    readonly reason: 'truncated' | 'empty' | 'schema_mismatch',
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/** Wrong key, model, or parameters. Retrying will not help; stop the batch. */
export class LlmConfigurationError extends LlmError {}
