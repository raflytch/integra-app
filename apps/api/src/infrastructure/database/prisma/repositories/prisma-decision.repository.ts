import { Injectable } from '@nestjs/common';
import type { ClaimStatus } from '../../../../domain/claims/claim-detail';
import type {
  Decision,
  NewDecision,
} from '../../../../domain/decisions/decision';
import { DecisionRepository } from '../../../../domain/decisions/decision.repository';
import { PrismaService } from '../prisma.service';

export const DECISION_FIELDS = {
  id: true,
  action: true,
  reason: true,
  createdAt: true,
  verifier: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaDecisionRepository extends DecisionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async recordWithClaimStatus(
    newDecision: NewDecision,
    resultingClaimStatus: ClaimStatus,
  ): Promise<Decision> {
    const [decision] = await this.prisma.$transaction([
      this.prisma.decision.create({
        data: newDecision,
        select: DECISION_FIELDS,
      }),
      this.prisma.claim.update({
        where: { id: newDecision.claimId },
        data: { status: resultingClaimStatus },
      }),
    ]);
    return decision;
  }
}
