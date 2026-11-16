import type { EvidenceType } from '../claims/claim-detail';
import { EVIDENCE_SIGN_GROUPS } from './clinical-limit';
import type {
  ClinicalExtraction,
  ExtractionSource,
} from './clinical-extraction';
import { CANONICAL_TERMS, TERM_SYNONYMS } from './clinical-vocabulary';

export const RULE_READER_SOURCE: ExtractionSource = {
  model: 'integra-rules',
  promptVersion: 'rules/v1',
  inputTokens: 0,
  outputTokens: 0,
};

type ItemKind = 'finding' | 'medication' | 'procedure';

interface LexiconTerm {
  name: string;
  kind: ItemKind;
  pattern: RegExp;
}

const KIND_BY_EVIDENCE_TYPE: Record<EvidenceType, ItemKind> = {
  FINDING: 'finding',
  VITAL_SIGN: 'finding',
  MEDICATION: 'medication',
  PROCEDURE: 'procedure',
};
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+|\n+/;
// Chapman dkk. 2001, J Biomed Inform 34(5):301-310 (NegEx): negasi berlaku sampai 5 kata dari istilahnya.
const NEGATION_BEFORE_PATTERN =
  /(?:^|\s)(?:tidak|tanpa|tak|bukan|negatif)(?:\s+\S+){0,5}\s*$/;
const NEGATION_AFTER_PATTERN = /^\s*(?:\S+\s+){0,5}?(?:disangkal|\(-\))/;
const DIAGNOSIS_PATTERN =
  /([A-Za-z][^:();]*?)\s*\(([A-Z]\d{2}(?:\.\d{1,2})?)\)/g;
const DOSE_PATTERN =
  /\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|iu|liter\/menit|lpm)(?![a-z])/i;
const VITAL_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  {
    name: 'tekanan darah',
    pattern: /(?:\btd|tekanan darah)\s*:?\s*(\d{2,3}\s*\/\s*\d{2,3}\s*mmhg)/i,
  },
  {
    name: 'nadi',
    pattern: /(?:\bnadi|\bhr)\s*:?\s*(\d{2,3}\s*x\s*\/\s*menit)/i,
  },
  {
    name: 'laju napas',
    pattern:
      /(?:\brr|laju napas|frekuensi napas)\s*:?\s*(\d{1,2}\s*x\s*\/\s*menit)/i,
  },
  { name: 'suhu', pattern: /\bsuhu\s*:?\s*(\d{2}(?:[.,]\d)?\s*°\s*c)/i },
  {
    name: 'saturasi oksigen',
    pattern: /(?:\bspo2|saturasi(?: oksigen)?)\s*:?\s*(\d{2,3}\s*%)/i,
  },
  {
    name: 'skala nyeri',
    pattern:
      /(?:skala nyeri|\bnrs|\bvas)(?:\s*nrs)?\s*:?\s*(\d{1,2}\s*(?:\/\s*10|dari 10))/i,
  },
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLexicon(): LexiconTerm[] {
  const terms = new Map<string, { name: string; kind: ItemKind }>();
  const add = (phrase: string, name: string, kind: ItemKind) => {
    if (!terms.has(phrase)) terms.set(phrase, { name, kind });
  };
  const canonicalKinds: [readonly string[], ItemKind][] = [
    [CANONICAL_TERMS.findings, 'finding'],
    [CANONICAL_TERMS.medications, 'medication'],
    [CANONICAL_TERMS.procedures, 'procedure'],
  ];
  for (const [list, kind] of canonicalKinds) {
    for (const term of list) add(term, term, kind);
  }
  for (const [synonym, term] of Object.entries(TERM_SYNONYMS)) {
    const kind =
      canonicalKinds.find(([list]) => list.includes(term))?.[1] ?? 'finding';
    add(synonym, term, kind);
  }
  for (const group of Object.values(EVIDENCE_SIGN_GROUPS)) {
    const kind = KIND_BY_EVIDENCE_TYPE[group.evidenceTypes[0]];
    for (const term of group.terms) add(term, term, kind);
  }
  return [...terms]
    .sort(([first], [second]) => second.length - first.length)
    .map(([phrase, { name, kind }]) => {
      const leftBoundary =
        kind === 'medication' && phrase.length > 3 ? '' : '(?<![a-z0-9])';
      return {
        name,
        kind,
        pattern: new RegExp(
          `${leftBoundary}${escapeRegExp(phrase)}(?![a-z0-9])`,
          'g',
        ),
      };
    });
}

const LEXICON = buildLexicon();

function isNegated(lowerSentence: string, start: number, end: number): boolean {
  return (
    NEGATION_BEFORE_PATTERN.test(lowerSentence.slice(0, start)) ||
    NEGATION_AFTER_PATTERN.test(lowerSentence.slice(end))
  );
}

export function readClinicalDocument(content: string): ClinicalExtraction {
  const extraction: ClinicalExtraction = {
    diagnoses: [],
    findings: [],
    vitalSigns: [],
    medications: [],
    procedures: [],
  };
  for (const rawSentence of content.split(SENTENCE_BOUNDARY_PATTERN)) {
    const quote = rawSentence.trim();
    if (!quote) continue;
    const lowerSentence = quote.toLowerCase();

    const coveredRanges: [number, number][] = [];
    for (const match of quote.matchAll(DIAGNOSIS_PATTERN)) {
      const [text, name, icd10Code] = match;
      coveredRanges.push([match.index, match.index + text.length]);
      extraction.diagnoses.push({ name: name.trim(), icd10Code, quote });
    }
    for (const { name, pattern } of VITAL_PATTERNS) {
      const match = pattern.exec(quote);
      if (!match) continue;
      coveredRanges.push([match.index, match.index + match[0].length]);
      extraction.vitalSigns.push({
        name,
        value: match[1].trim(),
        observedAt: null,
        quote,
      });
    }

    const usedRanges = [...coveredRanges];
    const seen = new Set<string>();
    for (const { name, kind, pattern } of LEXICON) {
      for (const match of lowerSentence.matchAll(pattern)) {
        const start = match.index;
        const end = start + match[0].length;
        if (usedRanges.some(([from, to]) => start < to && end > from)) continue;
        usedRanges.push([start, end]);
        const negated = isNegated(lowerSentence, start, end);
        const key = `${kind}|${name}|${negated}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (kind === 'finding') {
          extraction.findings.push({
            name,
            isPresent: !negated,
            observedAt: null,
            quote,
          });
        } else if (negated) {
          continue;
        } else if (kind === 'medication') {
          extraction.medications.push({
            name,
            dose: DOSE_PATTERN.exec(quote)?.[0] ?? null,
            givenAt: null,
            quote,
          });
        } else {
          extraction.procedures.push({
            name,
            performedAt: null,
            quote,
          });
        }
      }
    }
  }
  return extraction;
}
