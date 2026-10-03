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
const FIRST_SENTENCE_PATTERN = /^[^.!?\n]*[.!?]?/;

export type InconsistencyCode =
  'CONTRADICTED_FINDING' | 'FINDING_WITHOUT_ACTION' | 'IMPLAUSIBLE_TIME';

const STRENGTH_BY_CODE: Readonly<Record<InconsistencyCode, number>> = {
  CONTRADICTED_FINDING: 0.9,
  FINDING_WITHOUT_ACTION: 0.7,
  IMPLAUSIBLE_TIME: 0.6,
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
      finding.isPresent && CLAIM_DOCUMENT_TYPES.has(finding.document.type),
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
    ...findFindingsWithoutAction(claim, timedFindings),
    ...findImplausibleTimes(claim),
  ].sort((first, second) => second.strength - first.strength);
}
