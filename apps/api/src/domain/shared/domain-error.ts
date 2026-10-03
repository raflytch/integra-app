/**
 * Base class for business rule violations. Feature modules extend it with a
 * stable `code`; the presentation layer decides how each code maps to HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  /** Extra response fields the client needs to recover, e.g. `{ estimatedAiCalls }`. */
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
