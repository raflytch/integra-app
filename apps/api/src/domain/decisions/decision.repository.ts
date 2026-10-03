import type { ClaimStatus } from '../claims/claim-detail';
import type { Decision, NewDecision } from './decision';

export abstract class DecisionRepository {
  abstract recordWithClaimStatus(
    newDecision: NewDecision,
    resultingClaimStatus: ClaimStatus,
  ): Promise<Decision>;
}
