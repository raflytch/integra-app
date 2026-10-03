import type { DocumentToExtract } from '../../domain/analysis/claim-evidence';
import {
  CANONICAL_TERMS,
  TERM_SYNONYMS,
} from '../../domain/analysis/clinical-vocabulary';

const DOCUMENT_TYPE_LABELS: Record<DocumentToExtract['type'], string> = {
  MEDICAL_RESUME: 'Resume medis',
  EXAM_NOTE: 'Catatan pemeriksaan',
  DAILY_NOTE: 'Catatan harian (CPPT)',
  PRESCRIPTION: 'Resep',
  PROCEDURE: 'Catatan tindakan',
};

function listTerms(terms: readonly string[]): string {
  return terms.join(', ');
}

export const EXTRACTION_SYSTEM_PROMPT = [
  'You extract clinical evidence from one Indonesian inpatient medical record document for a claim verification system.',
  'Rules:',
  '- Extract only what the document states. Never infer, summarize, or add knowledge.',
  '- Every item needs `quote`: an exact substring copied character for character from the document. Items without a verbatim quote are discarded.',
  '- Write `name` in lowercase Indonesian. When the document states one of these canonical terms or an explicit synonym, use the canonical term as `name`:',
  `  findings: ${listTerms(CANONICAL_TERMS.findings)}`,
  `  vital signs: ${listTerms(CANONICAL_TERMS.vitalSigns)}`,
  `  medications: ${listTerms(CANONICAL_TERMS.medications)}`,
  `  procedures: ${listTerms(CANONICAL_TERMS.procedures)}`,
  `  synonyms: ${Object.entries(TERM_SYNONYMS)
    .map(([synonym, term]) => `${synonym} = ${term}`)
    .join(', ')}`,
  '- Never derive a term from numbers: "TD 85/50 mmHg" is a vital sign value, not the finding "hipotensi", unless the word is written.',
  '- Set `isPresent` to false when the document negates a finding (e.g. "tidak sesak").',
  '- Copy ICD-10 codes only when written in the document; otherwise null.',
  '- Use empty arrays when a category has nothing.',
].join('\n');

export function buildExtractionMessage(document: DocumentToExtract): string {
  return `Jenis dokumen: ${DOCUMENT_TYPE_LABELS[document.type]}\n\n<document>\n${document.content}\n</document>`;
}
