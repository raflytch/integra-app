import type {
  EvidenceStatus,
  EvidenceType,
  FindingCitation,
} from '../claims/claim-detail';
import type { ClaimEvidence, EvidenceRule } from './claim-evidence';
import {
  CLINICAL_LIMITS,
  EVIDENCE_SIGN_GROUPS,
  measureVitalSign,
} from './clinical-limit';
import { toCanonicalFinding } from './clinical-vocabulary';
import { findContradictedFindingQuotes } from './consistency-test';

export interface RefutedEvidence {
  rule: EvidenceRule;
  reason: string;
  quotes: Omit<QuoteCitation, 'kind'>[];
}

export interface DiagnosisEvidenceAssessment {
  diagnosis: { id: string; icd10Code: string; name: string };
  status: EvidenceStatus;
  requiredCount: number;
  foundCount: number;
  missingRules: EvidenceRule[];
  refutedEvidence: RefutedEvidence[];
  mentions: QuoteCitation[];
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
    note: 'Ada pemberian cairan, tetapi tidak tertulis sebagai resusitasi. Resusitasi syok adalah cairan cepat dalam jumlah besar (PNPK Dengue Dewasa hlm. 43 dan 46: kristaloid 5–10 ml/kgBB/jam pada syok terkompensasi, atau 10–20 ml/kgBB diguyur dan dievaluasi setelah 15–30 menit pada sindroma syok dengue), sedangkan infus dengan tetesan per menit biasanya cairan rumatan. Cek dosis dan kecepatannya.',
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
): QuoteCitation[] {
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
    const signGroup = EVIDENCE_SIGN_GROUPS[expectedEvidence];
    const terms = signGroup?.terms ?? [expectedEvidence];
    const searchedTexts = signGroup
      ? [...evidenceTexts.FINDING, ...evidenceTexts.VITAL_SIGN]
      : evidenceTexts[rule.evidenceType];
    if (
      searchedTexts.some((evidenceText) =>
        terms.some((term) => evidenceText.includes(term)),
      )
    ) {
      return true;
    }
    const singleLimit = CLINICAL_LIMITS[expectedEvidence];
    const limits = signGroup?.limits ?? (singleLimit ? [singleLimit] : []);
    return limits.some((limit) =>
      measureVitalSign(documents, limit).some(
        (measurement) => measurement.isMet,
      ),
    );
  };
}

function findNumericRefutation(
  documents: ClaimEvidence['documents'],
  rule: EvidenceRule,
): RefutedEvidence | null {
  const term = normalizeClinicalText(rule.expected);
  const limit = CLINICAL_LIMITS[term];
  if (!limit || measureVitalSign(documents, limit).some((m) => m.isMet)) {
    return null;
  }
  for (const document of documents) {
    const termQuote = document.extracted?.findings.find(
      (finding) =>
        finding.isPresent && toCanonicalFinding(finding.name) === term,
    )?.quote;
    const measurements = measureVitalSign([document], limit);
    if (!termQuote || measurements.length === 0) continue;
    return {
      rule,
      reason: `Tertulis ${rule.expected}, tetapi angka di catatan yang sama tidak memenuhi batas klinis (${limit.description}).`,
      quotes: [
        { documentId: document.id, quote: termQuote },
        ...measurements.map(({ documentId, quote }) => ({ documentId, quote })),
      ],
    };
  }
  return null;
}

function findRefutation(
  documents: ClaimEvidence['documents'],
  contradictedQuotes: Map<string, QuoteCitation[]>,
  rule: EvidenceRule,
): RefutedEvidence | null {
  const contradiction = contradictedQuotes.get(
    toCanonicalFinding(rule.expected),
  );
  if (contradiction) {
    return {
      rule,
      reason: `Tertulis ${rule.expected}, tetapi catatan harian dalam 24 jam menulis sebaliknya.`,
      quotes: contradiction.map(({ documentId, quote }) => ({
        documentId,
        quote,
      })),
    };
  }
  return findNumericRefutation(documents, rule);
}

// Kepmenkes 129/2008 SPM RS, indikator Rekam Medik 1: kelengkapan dinilai lengkap hanya bila 100%.
function toEvidenceStatus(
  requiredCount: number,
  foundCount: number,
  refutedCount: number,
): EvidenceStatus {
  if (refutedCount > 0) return 'REFUTED';
  if (foundCount === requiredCount) return 'SUPPORTED';
  return foundCount === 0 ? 'NOT_FOUND' : 'PARTIAL';
}

export function assessSecondaryDiagnoses(
  claim: ClaimEvidence,
  evidenceRules: EvidenceRule[],
): DiagnosisEvidenceAssessment[] {
  const isEvidencePresent = evidencePresenceChecker(claim.documents);
  const contradictedQuotes = findContradictedFindingQuotes(claim);

  const primaryIcd10Code =
    claim.diagnoses.find((diagnosis) => diagnosis.isPrimary)?.icd10Code ?? '';
  const appliesToPrimary = (rule: EvidenceRule) =>
    rule.primaryIcd10Prefixes.length === 0 ||
    rule.primaryIcd10Prefixes.some((prefix) =>
      primaryIcd10Code.startsWith(prefix),
    );

  return claim.diagnoses
    .filter((diagnosis) => !diagnosis.isPrimary)
    .flatMap((diagnosis) => {
      const rules = evidenceRules.filter(
        (rule) =>
          rule.icd10Code === diagnosis.icd10Code && appliesToPrimary(rule),
      );
      if (rules.length === 0) return [];
      const presentRules = rules.filter(isEvidencePresent);
      const refutedEvidence = presentRules.flatMap(
        (rule) =>
          findRefutation(claim.documents, contradictedQuotes, rule) ?? [],
      );
      const foundCount = presentRules.length - refutedEvidence.length;
      return [
        {
          diagnosis,
          status: toEvidenceStatus(
            rules.length,
            foundCount,
            refutedEvidence.length,
          ),
          requiredCount: rules.length,
          foundCount,
          missingRules: rules.filter((rule) => !presentRules.includes(rule)),
          refutedEvidence,
          mentions: findDiagnosisMentions(claim.documents, diagnosis.icd10Code),
        },
      ];
    });
}
