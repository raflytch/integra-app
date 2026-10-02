import type { ClinicalExtraction } from '../../../../domain/analysis/clinical-extraction';

const EXTRACTION_LISTS = [
  'diagnoses',
  'findings',
  'vitalSigns',
  'medications',
  'procedures',
] as const;

export function parseClinicalExtraction(
  storedExtraction: unknown,
): ClinicalExtraction | null {
  if (typeof storedExtraction !== 'object' || storedExtraction === null) {
    return null;
  }
  const extractionRecord = storedExtraction as Record<string, unknown>;
  const clinicalExtraction = Object.fromEntries(
    EXTRACTION_LISTS.map((listName) => {
      const storedList = extractionRecord[listName];
      return [listName, Array.isArray(storedList) ? storedList : []];
    }),
  );
  return clinicalExtraction as unknown as ClinicalExtraction;
}
