import { IsIn, IsOptional } from 'class-validator';
import type { ClaimStatus } from '../../domain/claims/claim-detail';

const CLAIM_STATUSES: ClaimStatus[] = [
  'PENDING',
  'APPROVED',
  'CLARIFICATION_REQUESTED',
  'ESCALATED',
];

export class ListClaimsQuery {
  @IsOptional()
  @IsIn(CLAIM_STATUSES)
  status?: ClaimStatus;
}
