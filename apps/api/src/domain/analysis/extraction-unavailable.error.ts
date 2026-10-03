import { DomainError } from '../shared/domain-error';

/** The AI could not read the clinical documents, so the claim stays unanalyzed. */
export class ExtractionUnavailableError extends DomainError {
  readonly code = 'EXTRACTION_UNAVAILABLE';

  constructor() {
    super('Clinical documents could not be extracted right now');
  }
}
