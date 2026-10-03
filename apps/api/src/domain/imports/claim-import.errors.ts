import { DomainError } from '../shared/domain-error';
import { MAX_IMPORT_CLAIMS, MAX_IMPORT_FILE_BYTES } from './imported-claim';

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

export class ImportFileTooLargeError extends DomainError {
  readonly code = 'IMPORT_FILE_TOO_LARGE';

  constructor() {
    super(`The file exceeds ${MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB`);
  }
}

export class ImportTooManyClaimsError extends DomainError {
  readonly code = 'IMPORT_TOO_MANY_CLAIMS';

  constructor() {
    super(`The file holds more than ${MAX_IMPORT_CLAIMS} claims`);
  }
}
