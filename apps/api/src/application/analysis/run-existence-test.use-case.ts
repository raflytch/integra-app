import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import {
  type ClaimEvidence,
  type EvidenceRule,
  type NewFinding,
  toIcd10Category,
} from '../../domain/analysis/claim-evidence';
import {
  assessSecondaryDiagnoses,
  type DiagnosisEvidenceAssessment,
  findLookalikeEvidence,
} from '../../domain/analysis/existence-test';
import {
  calculateTariffGaps,
  toInacbgGroupCode,
} from '../../domain/analysis/tariff-gap';
import type { TariffSchedule } from '../ports/tariff-schedule.port';

const STRENGTH_DECIMALS = 2;

function describeAssessment({
  diagnosis,
  status,
  requiredCount,
  foundCount,
  missingRules,
  refutedEvidence,
}: DiagnosisEvidenceAssessment): string {
  const diagnosisLabel = `${diagnosis.name} (${diagnosis.icd10Code})`;
  const missingLabel = missingRules.map((rule) => rule.expected).join(', ');
  if (status === 'NOT_FOUND') {
    return `Diagnosis sekunder ${diagnosisLabel} tidak didukung bukti klinis: ${missingLabel} tidak ditemukan.`;
  }
  if (status === 'PARTIAL') {
    return `Diagnosis sekunder ${diagnosisLabel} baru didukung sebagian (${foundCount} dari ${requiredCount} bukti): ${missingLabel} tidak ditemukan.`;
  }
  const refutedLabel = refutedEvidence
    .map((evidence) => evidence.rule.expected)
    .join(', ');
  const missingSentence = missingLabel
    ? ` Bukti ${missingLabel} juga tidak ditemukan.`
    : '';
  return `Bukti diagnosis sekunder ${diagnosisLabel} dibantah data rekam medis: ${refutedLabel}.${missingSentence}`;
}

export class RunExistenceTestUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly tariffSchedule: TariffSchedule,
  ) {}

  async execute(
    claim: ClaimEvidence,
    evidenceRules: EvidenceRule[],
  ): Promise<void> {
    const assessments = assessSecondaryDiagnoses(claim, evidenceRules);
    const flaggedAssessments = assessments
      .filter((assessment) => assessment.status !== 'SUPPORTED')
      .sort(
        (first, second) =>
          first.foundCount / first.requiredCount -
          second.foundCount / second.requiredCount,
      );

    // Permenkes 3/2023: selisih tarif = tarif klaim - tarif INA-CBG yang berlaku bila diagnosis tanpa bukti dihapus.
    const unsupportedCategories = [
      ...new Set(
        flaggedAssessments
          .filter((assessment) => assessment.status === 'NOT_FOUND')
          .map(({ diagnosis }) => toIcd10Category(diagnosis.icd10Code)),
      ),
    ];
    const inacbgGroupCode = toInacbgGroupCode(claim.inacbgCode);
    const tariffGaps = calculateTariffGaps(
      claim.severityLevel,
      claim.tariffAmount,
      unsupportedCategories.length,
      (severityLevel) =>
        this.tariffSchedule.findTariff(inacbgGroupCode, severityLevel),
    );
    const pricedCategories = new Set<string>();
    // Codes of one ICD-10 category describe one condition, so they lower severity once.
    const findingTariffGap = (assessment: DiagnosisEvidenceAssessment) => {
      if (assessment.status !== 'NOT_FOUND') return 0;
      const category = toIcd10Category(assessment.diagnosis.icd10Code);
      const categoryGap = tariffGaps[unsupportedCategories.indexOf(category)];
      if (categoryGap === null) return null;
      if (pricedCategories.has(category)) return 0;
      pricedCategories.add(category);
      return categoryGap;
    };

    const existenceFindings: NewFinding[] = flaggedAssessments.map(
      (assessment) => ({
        testType: 'EXISTENCE',
        strength: Number(
          (1 - assessment.foundCount / assessment.requiredCount).toFixed(
            STRENGTH_DECIMALS,
          ),
        ),
        summary: describeAssessment(assessment),
        citations: [
          ...assessment.missingRules.map((rule) => ({
            kind: 'MISSING_EVIDENCE' as const,
            evidenceType: rule.evidenceType,
            expected: rule.expected,
            guidelineRef: rule.guidelineRef,
            lookalike: findLookalikeEvidence(claim.documents, rule.expected),
          })),
          ...assessment.refutedEvidence.map(({ rule, reason, quotes }) => ({
            kind: 'REFUTED_EVIDENCE' as const,
            evidenceType: rule.evidenceType,
            expected: rule.expected,
            guidelineRef: rule.guidelineRef,
            reason,
            quotes,
          })),
          ...assessment.mentions,
        ],
        documentId: assessment.mentions[0]?.documentId ?? null,
        relatedDocumentId: null,
        diagnosisId: assessment.diagnosis.id,
        relatedClaimId: null,
        similarity: null,
        tariffGap: findingTariffGap(assessment),
      }),
    );

    await this.analysisRepository.replaceFindings(
      claim.claimId,
      'EXISTENCE',
      existenceFindings,
    );
    await this.analysisRepository.saveDiagnosisEvidenceStatuses(
      claim.claimId,
      assessments.map(({ diagnosis, status }) => ({
        diagnosisId: diagnosis.id,
        status,
      })),
    );
  }
}
