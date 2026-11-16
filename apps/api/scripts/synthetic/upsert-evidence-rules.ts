import type { EvidenceRule } from '../../src/domain/analysis/claim-evidence';
import type { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

/** Idempotent: inserts missing rules, refreshes guideline references, and drops rules no longer listed for the same codes. */
export async function upsertEvidenceRules(
  prisma: PrismaService,
  evidenceRules: readonly EvidenceRule[],
): Promise<void> {
  for (const evidenceRule of evidenceRules) {
    await prisma.evidenceRule.upsert({
      where: {
        icd10Code_disease_evidenceType_expected: {
          icd10Code: evidenceRule.icd10Code,
          disease: evidenceRule.disease,
          evidenceType: evidenceRule.evidenceType,
          expected: evidenceRule.expected,
        },
      },
      create: evidenceRule,
      update: {
        guidelineRef: evidenceRule.guidelineRef,
        primaryIcd10Prefixes: evidenceRule.primaryIcd10Prefixes,
      },
    });
  }
  await prisma.evidenceRule.deleteMany({
    where: {
      icd10Code: {
        in: [...new Set(evidenceRules.map((rule) => rule.icd10Code))],
      },
      NOT: evidenceRules.map(
        ({ icd10Code, disease, evidenceType, expected }) => ({
          icd10Code,
          disease,
          evidenceType,
          expected,
        }),
      ),
    },
  });
}
