import type { DocumentType, FindingCitation } from '../claims/claim-detail';
import type { ClaimEvidence, ClaimEvidenceDocument } from './claim-evidence';
import {
  capitalize,
  DOCUMENT_TYPE_LABELS,
  formatJakartaDay,
  isWithinStay,
  parseItemTime,
  toStayPeriod,
} from './clinical-time';
import { toCanonicalFinding } from './clinical-vocabulary';

/** Present findings that require at least one of these medications or procedures. */
export const FINDING_REQUIRED_ACTIONS: Readonly<
  Record<string, readonly string[]>
> = {
  'sesak napas': ['oksigen'],
  'akral dingin': ['resusitasi cairan', 'ringer laktat'],
};

/** Documents whose findings justify the billed severity. */
const CLAIM_DOCUMENT_TYPES: ReadonlySet<DocumentType> = new Set([
  'EXAM_NOTE',
  'MEDICAL_RESUME',
]);
const MAX_CONTRADICTION_GAP_MS = 24 * 60 * 60 * 1000;
const RESOLVING_FINDINGS: ReadonlySet<string> = new Set([
  'demam',
  'diare',
  'muntah',
  'nyeri perut',
]);
const MAX_AFEBRILE_TEMPERATURE_C = 37.5;
const TEMPERATURE_PATTERN = /(\d{2}(?:[.,]\d+)?)/;
const FIRST_SENTENCE_PATTERN = /^[^.!?\n]*[.!?]?/;
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+|\n+/;
const ICD10_LABEL_PATTERN = /\([A-Z]\d{2}(?:\.\d{1,2})?\)/;
const CLINICAL_NOTE_TYPES: ReadonlySet<DocumentType> = new Set([
  'EXAM_NOTE',
  'DAILY_NOTE',
]);
const CONFLICTING_MEDICATIONS: readonly {
  medication: string;
  description: string;
  conflictingFindings: readonly string[];
  conflictingIcd10Prefixes: readonly string[];
}[] = [
  {
    medication: 'furosemid',
    description: 'obat pembuang cairan',
    conflictingFindings: ['diare', 'muntah', 'syok', 'hipotensi'],
    conflictingIcd10Prefixes: ['A0', 'R57'],
  },
];

export type InconsistencyCode =
  | 'CONTRADICTED_FINDING'
  | 'FEVER_WITH_NORMAL_TEMPERATURE'
  | 'FINDING_WITHOUT_ACTION'
  | 'MEDICATION_CONFLICTS_CONDITION'
  | 'IMPLAUSIBLE_TIME'
  | 'CODING_LABEL_IN_CLINICAL_NOTE';

const STRENGTH_BY_CODE: Readonly<Record<InconsistencyCode, number>> = {
  CONTRADICTED_FINDING: 0.9,
  FEVER_WITH_NORMAL_TEMPERATURE: 0.8,
  FINDING_WITHOUT_ACTION: 0.7,
  MEDICATION_CONFLICTS_CONDITION: 0.7,
  IMPLAUSIBLE_TIME: 0.6,
  CODING_LABEL_IN_CLINICAL_NOTE: 0.5,
};

type QuoteCitation = Extract<FindingCitation, { kind: 'QUOTE' }>;

export interface Inconsistency {
  code: InconsistencyCode;
  strength: number;
  summary: string;
  documentId: string;
  relatedDocumentId: string | null;
  quotes: QuoteCitation[];
}

interface TimedFinding {
  document: ClaimEvidenceDocument;
  canonicalName: string;
  isPresent: boolean;
  quote: string;
  time: Date;
}

function documentLabel(document: ClaimEvidenceDocument): string {
  return `${DOCUMENT_TYPE_LABELS[document.type]} ${formatJakartaDay(document.recordedAt)}`;
}

function quoteOf(
  document: ClaimEvidenceDocument,
  quote: string,
): QuoteCitation {
  return { kind: 'QUOTE', documentId: document.id, quote };
}

function collectTimedFindings(claim: ClaimEvidence): TimedFinding[] {
  return claim.documents.flatMap((document) =>
    (document.extracted?.findings ?? []).map((finding) => ({
      document,
      canonicalName: toCanonicalFinding(finding.name),
      isPresent: finding.isPresent,
      quote: finding.quote,
      time: parseItemTime(finding.observedAt) ?? document.recordedAt,
    })),
  );
}

function findContradictedFindings(
  timedFindings: TimedFinding[],
): Inconsistency[] {
  const closestPairByName = new Map<
    string,
    { claimed: TimedFinding; negated: TimedFinding; gapMs: number }
  >();
  const claimedFindings = timedFindings.filter(
    (finding) =>
      finding.isPresent &&
      CLAIM_DOCUMENT_TYPES.has(finding.document.type) &&
      !RESOLVING_FINDINGS.has(finding.canonicalName),
  );
  const negatedDailyFindings = timedFindings.filter(
    (finding) => !finding.isPresent && finding.document.type === 'DAILY_NOTE',
  );

  for (const claimed of claimedFindings) {
    for (const negated of negatedDailyFindings) {
      if (negated.canonicalName !== claimed.canonicalName) continue;
      const gapMs = Math.abs(negated.time.getTime() - claimed.time.getTime());
      if (gapMs > MAX_CONTRADICTION_GAP_MS) continue;
      const closestPair = closestPairByName.get(claimed.canonicalName);
      if (!closestPair || gapMs < closestPair.gapMs) {
        closestPairByName.set(claimed.canonicalName, {
          claimed,
          negated,
          gapMs,
        });
      }
    }
  }

  return [...closestPairByName.values()].map(({ claimed, negated }) => ({
    code: 'CONTRADICTED_FINDING',
    strength: STRENGTH_BY_CODE.CONTRADICTED_FINDING,
    summary: `${capitalize(documentLabel(claimed.document))} menulis "${claimed.canonicalName}", tetapi ${documentLabel(negated.document)} menulis sebaliknya.`,
    documentId: claimed.document.id,
    relatedDocumentId: negated.document.id,
    quotes: [
      quoteOf(claimed.document, claimed.quote),
      quoteOf(negated.document, negated.quote),
    ],
  }));
}

function parseTemperature(value: string): number | null {
  const match = value.match(TEMPERATURE_PATTERN);
  return match ? Number(match[1].replace(',', '.')) : null;
}

function findFeversWithNormalTemperature(
  timedFindings: TimedFinding[],
): Inconsistency[] {
  const checkedDocumentIds = new Set<string>();
  return timedFindings.flatMap((fever) => {
    const { document } = fever;
    if (
      !fever.isPresent ||
      fever.canonicalName !== 'demam' ||
      !CLAIM_DOCUMENT_TYPES.has(document.type) ||
      checkedDocumentIds.has(document.id)
    ) {
      return [];
    }
    const normalTemperature = (document.extracted?.vitalSigns ?? []).find(
      (vital) => {
        const isTemperature =
          vital.name.toLowerCase().includes('suhu') ||
          /°\s*c/i.test(vital.value);
        if (!isTemperature) return false;
        const celsius = parseTemperature(vital.value);
        return celsius !== null && celsius <= MAX_AFEBRILE_TEMPERATURE_C;
      },
    );
    if (!normalTemperature) return [];
    checkedDocumentIds.add(document.id);
    return [
      {
        code: 'FEVER_WITH_NORMAL_TEMPERATURE' as const,
        strength: STRENGTH_BY_CODE.FEVER_WITH_NORMAL_TEMPERATURE,
        summary: `${capitalize(documentLabel(document))} menulis "${fever.quote}", tetapi suhu terukur di catatan yang sama hanya ${normalTemperature.value} (demam bila di atas ${String(MAX_AFEBRILE_TEMPERATURE_C).replace('.', ',')} °C).`,
        documentId: document.id,
        relatedDocumentId: null,
        quotes: [
          quoteOf(document, fever.quote),
          quoteOf(document, normalTemperature.quote),
        ],
      },
    ];
  });
}

function findFindingsWithoutAction(
  claim: ClaimEvidence,
  timedFindings: TimedFinding[],
): Inconsistency[] {
  const actionNames = claim.documents.flatMap(({ extracted }) =>
    [...(extracted?.medications ?? []), ...(extracted?.procedures ?? [])].map(
      (action) => action.name.toLowerCase(),
    ),
  );
  const firstMentionByName = new Map<string, TimedFinding>();
  for (const finding of timedFindings) {
    if (!finding.isPresent) continue;
    if (!CLAIM_DOCUMENT_TYPES.has(finding.document.type)) continue;
    if (!FINDING_REQUIRED_ACTIONS[finding.canonicalName]) continue;
    if (!firstMentionByName.has(finding.canonicalName)) {
      firstMentionByName.set(finding.canonicalName, finding);
    }
  }

  return [...firstMentionByName.values()].flatMap((finding) => {
    const requiredActions = FINDING_REQUIRED_ACTIONS[finding.canonicalName];
    const isActionTaken = actionNames.some((actionName) =>
      requiredActions.some((requiredAction) =>
        actionName.includes(requiredAction),
      ),
    );
    if (isActionTaken) return [];
    return [
      {
        code: 'FINDING_WITHOUT_ACTION' as const,
        strength: STRENGTH_BY_CODE.FINDING_WITHOUT_ACTION,
        summary: `${capitalize(documentLabel(finding.document))} menulis "${finding.canonicalName}", tetapi rekam medis tidak mencatat pemberian ${requiredActions.join(' atau ')}.`,
        documentId: finding.document.id,
        relatedDocumentId: null,
        quotes: [quoteOf(finding.document, finding.quote)],
      },
    ];
  });
}

function findConflictingMedications(
  claim: ClaimEvidence,
  timedFindings: TimedFinding[],
): Inconsistency[] {
  return CONFLICTING_MEDICATIONS.flatMap((conflict) => {
    const given = claim.documents
      .flatMap((document) =>
        (document.extracted?.medications ?? []).map((medication) => ({
          document,
          medication,
        })),
      )
      .find(({ medication }) =>
        `${medication.name} ${medication.quote}`
          .toLowerCase()
          .includes(conflict.medication),
      );
    if (!given) return [];

    const conflictingFinding = timedFindings.find(
      (finding) =>
        finding.isPresent &&
        conflict.conflictingFindings.includes(finding.canonicalName),
    );
    const conflictingDiagnoses = claim.diagnoses.filter((diagnosis) =>
      conflict.conflictingIcd10Prefixes.some((prefix) =>
        diagnosis.icd10Code.startsWith(prefix),
      ),
    );
    const conditions = [
      ...conflictingDiagnoses.map(
        (diagnosis) => `${diagnosis.name} (${diagnosis.icd10Code})`,
      ),
      ...(conflictingFinding ? [conflictingFinding.canonicalName] : []),
    ];
    if (conditions.length === 0) return [];

    return [
      {
        code: 'MEDICATION_CONFLICTS_CONDITION' as const,
        strength: STRENGTH_BY_CODE.MEDICATION_CONFLICTS_CONDITION,
        summary: `${capitalize(documentLabel(given.document))} memberikan "${given.medication.quote}" (${conflict.description}), padahal rekam medis mencatat ${conditions.join(', ')} yang justru membutuhkan cairan.`,
        documentId: given.document.id,
        relatedDocumentId: conflictingFinding?.document.id ?? null,
        quotes: [
          quoteOf(given.document, given.medication.quote),
          ...(conflictingFinding
            ? [quoteOf(conflictingFinding.document, conflictingFinding.quote)]
            : []),
        ],
      },
    ];
  });
}

function findCodingLabelsInClinicalNotes(
  claim: ClaimEvidence,
): Inconsistency[] {
  return claim.documents.flatMap((document) => {
    if (!CLINICAL_NOTE_TYPES.has(document.type)) return [];
    const labelledSentence = document.content
      .split(SENTENCE_BOUNDARY_PATTERN)
      .map((sentence) => sentence.trim())
      .find((sentence) => ICD10_LABEL_PATTERN.test(sentence));
    if (!labelledSentence) return [];
    const label = labelledSentence.match(ICD10_LABEL_PATTERN)![0];
    return [
      {
        code: 'CODING_LABEL_IN_CLINICAL_NOTE' as const,
        strength: STRENGTH_BY_CODE.CODING_LABEL_IN_CLINICAL_NOTE,
        summary: `${capitalize(documentLabel(document))} memuat label koding ICD-10 ${label} di tengah catatan klinis. Dokter biasanya tidak menulis kode diagnosis di anamnesis; ini tanda teks disalin dari templat atau sistem koding.`,
        documentId: document.id,
        relatedDocumentId: null,
        quotes: [quoteOf(document, labelledSentence)],
      },
    ];
  });
}

function findImplausibleTimes(claim: ClaimEvidence): Inconsistency[] {
  const stay = toStayPeriod(claim.admittedAt, claim.dischargedAt);
  const stayLabel = `${formatJakartaDay(stay.start)}–${formatJakartaDay(claim.dischargedAt)}`;

  return claim.documents.flatMap((document) => {
    let quote: string | null = null;
    if (!isWithinStay(document.recordedAt, stay)) {
      quote =
        document.content.trim().match(FIRST_SENTENCE_PATTERN)?.[0].trim() ??
        document.content.trim();
    } else {
      const extracted = document.extracted;
      const timedItems = [
        ...(extracted?.findings ?? []).map((item) => ({
          time: item.observedAt,
          quote: item.quote,
        })),
        ...(extracted?.vitalSigns ?? []).map((item) => ({
          time: item.observedAt,
          quote: item.quote,
        })),
        ...(extracted?.medications ?? []).map((item) => ({
          time: item.givenAt,
          quote: item.quote,
        })),
        ...(extracted?.procedures ?? []).map((item) => ({
          time: item.performedAt,
          quote: item.quote,
        })),
      ];
      quote =
        timedItems.find((item) => {
          const itemTime = parseItemTime(item.time);
          return itemTime !== null && !isWithinStay(itemTime, stay);
        })?.quote ?? null;
    }
    if (quote === null) return [];
    return [
      {
        code: 'IMPLAUSIBLE_TIME' as const,
        strength: STRENGTH_BY_CODE.IMPLAUSIBLE_TIME,
        summary: `${capitalize(documentLabel(document))} memuat waktu di luar masa rawat (${stayLabel}).`,
        documentId: document.id,
        relatedDocumentId: null,
        quotes: [quoteOf(document, quote)],
      },
    ];
  });
}

/**
 * Uji Konsisten (M-05): notes in one medical record that do not agree with
 * each other. It never judges which note is clinically right.
 */
export function findInconsistencies(claim: ClaimEvidence): Inconsistency[] {
  const timedFindings = collectTimedFindings(claim);
  return [
    ...findContradictedFindings(timedFindings),
    ...findFeversWithNormalTemperature(timedFindings),
    ...findFindingsWithoutAction(claim, timedFindings),
    ...findConflictingMedications(claim, timedFindings),
    ...findImplausibleTimes(claim),
    ...findCodingLabelsInClinicalNotes(claim),
  ].sort((first, second) => second.strength - first.strength);
}
