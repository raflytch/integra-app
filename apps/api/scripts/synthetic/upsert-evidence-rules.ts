import type { EvidenceRule } from '../../src/domain/analysis/claim-evidence';
import type { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

/** Idempotent: inserts missing rules and refreshes the guideline reference of existing ones. */
export async function upsertEvidenceRules(
  prisma: PrismaService,
  evidenceRules: readonly EvidenceRule[],
): Promise<void> {
  for (const evidenceRule of evidenceRules) {
    await prisma.evidenceRule.upsert({
      where: {
        icd10Code_evidenceType_expected: {
          icd10Code: evidenceRule.icd10Code,
          evidenceType: evidenceRule.evidenceType,
          expected: evidenceRule.expected,
        },
      },
      create: evidenceRule,
      update: { guidelineRef: evidenceRule.guidelineRef },
    });
  }
}
