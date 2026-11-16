import type { DocumentToExtract } from '../../domain/analysis/claim-evidence';
import { EVIDENCE_SIGN_GROUPS } from '../../domain/analysis/clinical-limit';
import {
  CANONICAL_TERMS,
  TERM_SYNONYMS,
} from '../../domain/analysis/clinical-vocabulary';
import type { EvidenceType } from '../../domain/claims/claim-detail';

const DOCUMENT_TYPE_LABELS: Record<DocumentToExtract['type'], string> = {
  MEDICAL_RESUME: 'Resume medis',
  EXAM_NOTE: 'Catatan pemeriksaan',
  DAILY_NOTE: 'Catatan harian (CPPT)',
  PRESCRIPTION: 'Resep',
  PROCEDURE: 'Catatan tindakan',
};

const CATEGORY_BY_EVIDENCE_TYPE: Record<EvidenceType, string> = {
  FINDING: 'findings',
  VITAL_SIGN: 'vital signs',
  MEDICATION: 'medications',
  PROCEDURE: 'procedures',
};

function listTerms(terms: readonly string[]): string {
  return terms.join(', ');
}

/**
 * Saved with every extraction so evidence stays traceable to the prompt that
 * produced it. Bump it whenever the prompt or the output schema changes.
 */
export const EXTRACTION_PROMPT_VERSION = 'extraction/v3';

export const EXTRACTION_SYSTEM_PROMPT = [
  'You extract clinical evidence from the Indonesian inpatient medical record documents of one claim, for a claim verification system.',
  'Each document is wrapped in <document id="…">. Return exactly one entry in `documents` per document, with its id as `documentId`, and extract each document on its own: never move evidence from one document to another.',
  'Rules:',
  '- Extract only what the document states. Never infer, summarize, or add knowledge.',
  '- Every item needs `quote`: an exact substring copied character for character from that document. Items without a verbatim quote are discarded.',
  '- Write `name` in lowercase Indonesian. When the document states one of these canonical terms or an explicit synonym, use the canonical term as `name`:',
  `  findings: ${listTerms(CANONICAL_TERMS.findings)}`,
  `  vital signs: ${listTerms(CANONICAL_TERMS.vitalSigns)}`,
  `  medications: ${listTerms(CANONICAL_TERMS.medications)}`,
  `  procedures: ${listTerms(CANONICAL_TERMS.procedures)}`,
  `  synonyms: ${Object.entries(TERM_SYNONYMS)
    .map(([synonym, term]) => `${synonym} = ${term}`)
    .join(', ')}`,
  '- Extract every mention of the evidence below, because the verification rules look for it. Use the category in brackets and keep the written words in `name`:',
  ...Object.entries(EVIDENCE_SIGN_GROUPS).map(
    ([group, { evidenceTypes, terms }]) =>
      `  ${group} (${evidenceTypes.map((type) => CATEGORY_BY_EVIDENCE_TYPE[type]).join(' or ')}): ${listTerms(terms)}`,
  ),
  '- Laboratory, serology, imaging, and other diagnostic tests are procedures. Put the stated result in `name` (e.g. "foto toraks kardiomegali", "pemeriksaan widal positif").',
  '- A pain score (NRS, VAS, or VRS) is the vital sign "skala nyeri" with the score as `value`.',
  '- Never derive a term from numbers: "TD 85/50 mmHg" is a vital sign value, not the finding "hipotensi", unless the word is written.',
  '- Set `isPresent` to false when the document negates a finding (e.g. "tidak sesak").',
  '- Copy ICD-10 codes only when written in the document; otherwise null.',
  '- Use empty arrays when a category has nothing.',
].join('\n');

/** Labels documents D1, D2, … so the model never has to copy long ids. */
export function buildExtractionMessage(documents: DocumentToExtract[]): string {
  return documents
    .map(
      (document, index) =>
        `<document id="${documentLabel(index)}" jenis="${DOCUMENT_TYPE_LABELS[document.type]}">\n${document.content}\n</document>`,
    )
    .join('\n\n');
}

export function documentLabel(index: number): string {
  return `D${index + 1}`;
}
