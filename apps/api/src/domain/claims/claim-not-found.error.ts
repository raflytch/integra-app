import { DomainError } from '../shared/domain-error';

export class ClaimNotFoundError extends DomainError {
  readonly code = 'CLAIM_NOT_FOUND';

  constructor(claimId: string) {
    super(`Claim ${claimId} was not found`);
  }
}
