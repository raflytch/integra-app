import type { ClaimEvidence } from '../../src/domain/analysis/claim-evidence';
import type { ClinicalExtraction } from '../../src/domain/analysis/clinical-extraction';
import type { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import {
  DEMO_DATASET_SEED,
  generateBpjsSampleClaims,
} from './bpjs-sample-claims';

export type TemplateExtractions = Map<string, ClinicalExtraction>;

function documentKey(
  claimNo: string,
  type: string,
  recordedAt: Date,
  content: string,
): string {
  return `${claimNo}|${type}|${recordedAt.getTime()}|${content}`;
}

export function buildTemplateExtractions(
  claimCount: number,
): TemplateExtractions {
  const { claims } = generateBpjsSampleClaims(claimCount, DEMO_DATASET_SEED);
  return new Map(
    claims.flatMap((claim) =>
      claim.documents.map((document) => [
        documentKey(
          claim.claimNo,
          document.type,
          document.recordedAt,
          document.content,
        ),
        document.extracted,
      ]),
    ),
  );
}

export function withTemplateExtractions(
  evidence: ClaimEvidence,
  templates: TemplateExtractions,
): ClaimEvidence {
  return {
    ...evidence,
    documents: evidence.documents.map((document) => ({
      ...document,
      extracted:
        templates.get(
          documentKey(
            evidence.claimNo,
            document.type,
            document.recordedAt,
            document.content,
          ),
        ) ?? null,
    })),
  };
}

export async function resetDemoAnalysis(
  prisma: PrismaService,
  claimIds: string[],
): Promise<void> {
  await prisma.$transaction([
    prisma.finding.deleteMany({ where: { claimId: { in: claimIds } } }),
    prisma.claimDiagnosis.updateMany({
      where: { claimId: { in: claimIds } },
      data: { evidenceStatus: null },
    }),
    prisma.claim.updateMany({
      where: { id: { in: claimIds } },
      data: {
        potentialGap: 0,
        priorityScore: 0,
        analyzedAt: null,
        requiredEvidenceCount: null,
        foundEvidenceCount: null,
        comparedClaimCount: null,
        maxSimilarity: null,
        similarityMean: null,
        similarityThreshold: null,
      },
    }),
  ]);
}
