import { DomainError } from '../shared/domain-error';

export class MissingDocumentsRequiredError extends DomainError {
  readonly code = 'MISSING_DOCUMENTS_REQUIRED';

  constructor() {
    super('A clarification request must list at least one missing document');
  }
}
