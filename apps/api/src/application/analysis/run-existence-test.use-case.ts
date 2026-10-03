import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  EvidenceRule,
  NewFinding,
} from '../../domain/analysis/claim-evidence';
import { findUnsupportedDiagnoses } from '../../domain/analysis/existence-test';
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
    const tariffGaps = calculateTariffGaps(
      claim.severityLevel,
      unsupportedDiagnoses.length,
      (severityLevel) =>
        this.tariffSchedule.findTariff(inacbgGroupCode, severityLevel),
    );

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
          })),
          ...mentions,
        ],
        documentId: mentions[0]?.documentId ?? null,
        relatedDocumentId: null,
        diagnosisId: diagnosis.id,
        relatedClaimId: null,
        similarity: null,
        tariffGap: tariffGaps[index],
      }),
    );

    await this.analysisRepository.replaceFindings(
      claim.claimId,
      'EXISTENCE',
      existenceFindings,
    );
  }
}
