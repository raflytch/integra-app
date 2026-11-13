import { ClaimNotFoundError } from '../../domain/claims/claim-not-found.error';
import type { ClaimRepository } from '../../domain/claims/claim.repository';
import {
  CLAIM_STATUS_BY_DECISION_ACTION,
  type Decision,
  type NewDecision,
} from '../../domain/decisions/decision';
import type { DecisionRepository } from '../../domain/decisions/decision.repository';
import { MissingDocumentsRequiredError } from '../../domain/decisions/missing-documents-required.error';

export class RecordDecisionUseCase {
  constructor(
    private readonly claimRepository: ClaimRepository,
    private readonly decisionRepository: DecisionRepository,
  ) {}

  async execute(newDecision: NewDecision): Promise<Decision> {
    const claimExists = await this.claimRepository.exists(newDecision.claimId);
    if (!claimExists) throw new ClaimNotFoundError(newDecision.claimId);
    const isClarification = newDecision.action === 'REQUEST_CLARIFICATION';
    if (isClarification && newDecision.missingDocumentTypes.length === 0) {
      throw new MissingDocumentsRequiredError();
    }

    return this.decisionRepository.recordWithClaimStatus(
      {
        ...newDecision,
        reason: newDecision.reason.trim(),
        missingDocumentTypes: isClarification
          ? [...new Set(newDecision.missingDocumentTypes)]
          : [],
      },
      CLAIM_STATUS_BY_DECISION_ACTION[newDecision.action],
    );
  }
}
