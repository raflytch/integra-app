import type { ClaimStatus } from '../claims/claim-detail';

export type DecisionAction = 'APPROVE' | 'REQUEST_CLARIFICATION' | 'ESCALATE';

export const CLAIM_STATUS_BY_DECISION_ACTION: Record<
  DecisionAction,
  ClaimStatus
> = {
  APPROVE: 'APPROVED',
  REQUEST_CLARIFICATION: 'CLARIFICATION_REQUESTED',
  ESCALATE: 'ESCALATED',
};

export interface Decision {
  id: string;
  action: DecisionAction;
  reason: string;
  createdAt: Date;
  verifier: { id: string; name: string };
}

export interface NewDecision {
  claimId: string;
  verifierId: string;
  action: DecisionAction;
  reason: string;
}
