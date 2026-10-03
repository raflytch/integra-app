import type { EvidenceType, FindingCitation } from '../claims/claim-detail';
import type { ClaimEvidence, EvidenceRule } from './claim-evidence';

const MIN_MISSING_EVIDENCE_RATIO = 0.5;

export interface UnsupportedDiagnosis {
  diagnosis: { id: string; icd10Code: string; name: string };
  missingRules: EvidenceRule[];
  missingEvidenceRatio: number;
  mentions: Extract<FindingCitation, { kind: 'QUOTE' }>[];
}

function normalizeClinicalText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function collectEvidenceTexts(
  documents: ClaimEvidence['documents'],
): Record<EvidenceType, string[]> {
  const evidenceTexts: Record<EvidenceType, string[]> = {
    MEDICATION: [],
    PROCEDURE: [],
    FINDING: [],
    VITAL_SIGN: [],
  };
  for (const { extracted } of documents) {
    if (!extracted) continue;
    const presentFindingNames = extracted.findings
      .filter((finding) => finding.isPresent)
      .map((finding) => finding.name);
    evidenceTexts.MEDICATION.push(
      ...extracted.medications.map((item) => item.name),
    );
    evidenceTexts.PROCEDURE.push(
      ...extracted.procedures.map((item) => item.name),
    );
    evidenceTexts.FINDING.push(...presentFindingNames);
    evidenceTexts.VITAL_SIGN.push(
      ...presentFindingNames,
      ...extracted.vitalSigns.map((vital) => `${vital.name} ${vital.value}`),
    );
  }
  for (const evidenceType of Object.keys(evidenceTexts) as EvidenceType[]) {
    evidenceTexts[evidenceType] = evidenceTexts[evidenceType].map(
      normalizeClinicalText,
    );
  }
  return evidenceTexts;
}

function findDiagnosisMentions(
  documents: ClaimEvidence['documents'],
  icd10Code: string,
): UnsupportedDiagnosis['mentions'] {
  return documents.flatMap(({ id, extracted }) =>
    (extracted?.diagnoses ?? [])
      .filter((diagnosis) => diagnosis.icd10Code === icd10Code)
      .map((diagnosis) => ({
        kind: 'QUOTE' as const,
        documentId: id,
        quote: diagnosis.quote,
      })),
  );
}

export function findUnsupportedDiagnoses(
  claim: ClaimEvidence,
  evidenceRules: EvidenceRule[],
): UnsupportedDiagnosis[] {
  const evidenceTexts = collectEvidenceTexts(claim.documents);
  const isEvidencePresent = (rule: EvidenceRule) => {
    const expectedEvidence = normalizeClinicalText(rule.expected);
    return evidenceTexts[rule.evidenceType].some((evidenceText) =>
      evidenceText.includes(expectedEvidence),
    );
  };

  const unsupportedDiagnoses = claim.diagnoses
    .filter((diagnosis) => !diagnosis.isPrimary)
    .flatMap((diagnosis) => {
      const diagnosisRules = evidenceRules.filter(
        (rule) => rule.icd10Code === diagnosis.icd10Code,
      );
      if (diagnosisRules.length === 0) return [];
      const missingRules = diagnosisRules.filter(
        (rule) => !isEvidencePresent(rule),
      );
      const missingEvidenceRatio = missingRules.length / diagnosisRules.length;
      if (missingEvidenceRatio < MIN_MISSING_EVIDENCE_RATIO) return [];
      return [
        {
          diagnosis,
          missingRules,
          missingEvidenceRatio,
          mentions: findDiagnosisMentions(claim.documents, diagnosis.icd10Code),
        },
      ];
    });

  return unsupportedDiagnoses.sort(
    (first, second) => second.missingEvidenceRatio - first.missingEvidenceRatio,
  );
}
