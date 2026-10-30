import { DomainError } from '../shared/domain-error';

/** The file is not in the INTEGRA format; the client must confirm the paid AI step. */
export class ImportNeedsAiError extends DomainError {
  readonly code = 'IMPORT_NEEDS_AI';
  readonly details: { estimatedAiCalls: number };

  constructor(estimatedAiCalls: number) {
    super('The file is not in the INTEGRA format and needs AI normalization');
    this.details = { estimatedAiCalls };
  }
}

export class ImportAiUnavailableError extends DomainError {
  readonly code = 'IMPORT_AI_UNAVAILABLE';

  constructor() {
    super('The AI cannot normalize the file right now');
  }
}
