import { Injectable } from '@nestjs/common';
import type { ClaimStatus } from '../../../../domain/claims/claim-detail';
import type {
  Decision,
  NewDecision,
} from '../../../../domain/decisions/decision';
import { DecisionRepository } from '../../../../domain/decisions/decision.repository';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

export const DECISION_FIELDS = {
  id: true,
  action: true,
  reason: true,
  createdAt: true,
  verifier: { select: { id: true, name: true } },
  documentRequests: {
    select: { documentType: true, receivedAt: true },
    orderBy: { documentType: 'asc' },
  },
} as const;

export function toDecision({
  documentRequests,
  ...decision
}: Prisma.DecisionGetPayload<{ select: typeof DECISION_FIELDS }>): Decision {
  return { ...decision, missingDocuments: documentRequests };
}

@Injectable()
export class PrismaDecisionRepository extends DecisionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async recordWithClaimStatus(
    newDecision: NewDecision,
    resultingClaimStatus: ClaimStatus,
  ): Promise<Decision> {
    const { missingDocumentTypes, ...decisionFields } = newDecision;
    const [decision] = await this.prisma.$transaction([
      this.prisma.decision.create({
        data: {
          ...decisionFields,
          documentRequests: {
            create: missingDocumentTypes.map((documentType) => ({
              documentType,
            })),
          },
        },
        select: DECISION_FIELDS,
      }),
      this.prisma.claim.update({
        where: { id: newDecision.claimId },
        data: { status: resultingClaimStatus },
      }),
    ]);
    return toDecision(decision);
  }
}
