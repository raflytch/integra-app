import { DomainError } from '../shared/domain-error';

export class BulkAnalysisRunningError extends DomainError {
  readonly code = 'BULK_ANALYSIS_RUNNING';

  constructor() {
    super('A bulk analysis is already running');
  }
}
