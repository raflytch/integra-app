import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import {
  type ClaimEvidence,
  type EvidenceRule,
  type NewFinding,
  toIcd10Category,
} from '../../domain/analysis/claim-evidence';
import {
  findLookalikeEvidence,
  findUnsupportedDiagnoses,
} from '../../domain/analysis/existence-test';
import {
  calculateTariffGaps,
  toInacbgGroupCode,
} from '../../domain/analysis/tariff-gap';
import type { TariffSchedule } from '../ports/tariff-schedule.port';

const STRENGTH_DECIMALS = 2;

export class RunExistenceTestUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly tariffSchedule: TariffSchedule,
  ) {}

  async execute(
    claim: ClaimEvidence,
    evidenceRules: EvidenceRule[],
  ): Promise<void> {
    const unsupportedDiagnoses = findUnsupportedDiagnoses(claim, evidenceRules);
    const inacbgGroupCode = toInacbgGroupCode(claim.inacbgCode);
    // Codes of one ICD-10 category describe one condition, so they lower severity once.
    const categories = unsupportedDiagnoses.map(({ diagnosis }) =>
      toIcd10Category(diagnosis.icd10Code),
    );
    const distinctCategories = [...new Set(categories)];
    const tariffGaps = calculateTariffGaps(
      claim.severityLevel,
      claim.tariffAmount,
      distinctCategories.length,
      (severityLevel) =>
        this.tariffSchedule.findTariff(inacbgGroupCode, severityLevel),
    );

    // A repeated category adds no further gap: 0 when known, null when unknown.
    const findingTariffGap = (index: number) => {
      const categoryGap =
        tariffGaps[distinctCategories.indexOf(categories[index])];
      const isFirstOfCategory = categories.indexOf(categories[index]) === index;
      return isFirstOfCategory || categoryGap === null ? categoryGap : 0;
    };

    const existenceFindings: NewFinding[] = unsupportedDiagnoses.map(
      ({ diagnosis, missingRules, missingEvidenceRatio, mentions }, index) => ({
        testType: 'EXISTENCE',
        strength: Number(missingEvidenceRatio.toFixed(STRENGTH_DECIMALS)),
        summary: `Diagnosis sekunder ${diagnosis.name} (${diagnosis.icd10Code}) belum didukung bukti klinis: ${missingRules.map((rule) => rule.expected).join(', ')}.`,
        citations: [
          ...missingRules.map((rule) => ({
            kind: 'MISSING_EVIDENCE' as const,
            evidenceType: rule.evidenceType,
            expected: rule.expected,
            guidelineRef: rule.guidelineRef,
            lookalike: findLookalikeEvidence(claim.documents, rule.expected),
          })),
          ...mentions,
        ],
        documentId: mentions[0]?.documentId ?? null,
        relatedDocumentId: null,
        diagnosisId: diagnosis.id,
        relatedClaimId: null,
        similarity: null,
        tariffGap: findingTariffGap(index),
      }),
    );

    await this.analysisRepository.replaceFindings(
      claim.claimId,
      'EXISTENCE',
      existenceFindings,
    );
  }
}
