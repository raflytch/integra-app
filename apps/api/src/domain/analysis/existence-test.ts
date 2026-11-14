import type { EvidenceType, FindingCitation } from '../claims/claim-detail';
import type { ClaimEvidence, EvidenceRule } from './claim-evidence';

const MIN_MISSING_EVIDENCE_RATIO = 0.5;

export interface UnsupportedDiagnosis {
  diagnosis: { id: string; icd10Code: string; name: string };
  missingRules: EvidenceRule[];
  missingEvidenceRatio: number;
  mentions: Extract<FindingCitation, { kind: 'QUOTE' }>[];
}

type QuoteCitation = Extract<FindingCitation, { kind: 'QUOTE' }>;

const LOOKALIKE_EVIDENCE: Readonly<
  Record<string, { terms: string[]; note: string }>
> = {
  'resusitasi cairan': {
    terms: [
      'infus',
      'cairan',
      'ringer',
      'asering',
      'nacl',
      'normal saline',
      'dekstrosa',
      'd5',
      'ka-en',
      'kaen',
      'kristaloid',
      'koloid',
      'gelofusin',
      'loading',
      'guyur',
      'grojok',
    ],
    note: 'Ada pemberian cairan, tetapi tidak tertulis sebagai resusitasi. Resusitasi syok adalah cairan cepat dalam jumlah besar (bolus, misalnya 10–20 ml/kgBB dalam 15–60 menit), sedangkan infus dengan tetesan per menit biasanya cairan rumatan. Cek dosis dan kecepatannya.',
  },
};

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

export function findLookalikeEvidence(
  documents: ClaimEvidence['documents'],
  expected: string,
): { note: string; quotes: Omit<QuoteCitation, 'kind'>[] } | undefined {
  const lookalike = LOOKALIKE_EVIDENCE[normalizeClinicalText(expected)];
  if (!lookalike) return undefined;
  const quotes = documents.flatMap(({ id, extracted }) =>
    [...(extracted?.medications ?? []), ...(extracted?.procedures ?? [])]
      .filter((item) => {
        const itemText = normalizeClinicalText(`${item.name} ${item.quote}`);
        return lookalike.terms.some((term) => itemText.includes(term));
      })
      .map((item) => ({ documentId: id, quote: item.quote })),
  );
  const uniqueQuotes = quotes.filter(
    (quote, index) =>
      quotes.findIndex(
        (other) =>
          other.documentId === quote.documentId && other.quote === quote.quote,
      ) === index,
  );
  return uniqueQuotes.length > 0
    ? { note: lookalike.note, quotes: uniqueQuotes }
    : undefined;
}

function evidencePresenceChecker(
  documents: ClaimEvidence['documents'],
): (rule: EvidenceRule) => boolean {
  const evidenceTexts = collectEvidenceTexts(documents);
  return (rule) => {
    const expectedEvidence = normalizeClinicalText(rule.expected);
    return evidenceTexts[rule.evidenceType].some((evidenceText) =>
      evidenceText.includes(expectedEvidence),
    );
  };
}

function secondaryDiagnosisRules(
  claim: ClaimEvidence,
  evidenceRules: EvidenceRule[],
): { diagnosis: ClaimEvidence['diagnoses'][number]; rules: EvidenceRule[] }[] {
  return claim.diagnoses
    .filter((diagnosis) => !diagnosis.isPrimary)
    .map((diagnosis) => ({
      diagnosis,
      rules: evidenceRules.filter(
        (rule) => rule.icd10Code === diagnosis.icd10Code,
      ),
    }));
}

export interface EvidenceCount {
  requiredCount: number;
  foundCount: number;
}

export function countSecondaryDiagnosisEvidence(
  claim: ClaimEvidence,
  evidenceRules: EvidenceRule[],
): EvidenceCount {
  const isEvidencePresent = evidencePresenceChecker(claim.documents);
  const rules = secondaryDiagnosisRules(claim, evidenceRules).flatMap(
    (diagnosisRules) => diagnosisRules.rules,
  );
  return {
    requiredCount: rules.length,
    foundCount: rules.filter(isEvidencePresent).length,
  };
}

export function findUnsupportedDiagnoses(
  claim: ClaimEvidence,
  evidenceRules: EvidenceRule[],
): UnsupportedDiagnosis[] {
  const isEvidencePresent = evidencePresenceChecker(claim.documents);

  const unsupportedDiagnoses = secondaryDiagnosisRules(
    claim,
    evidenceRules,
  ).flatMap(({ diagnosis, rules: diagnosisRules }) => {
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
