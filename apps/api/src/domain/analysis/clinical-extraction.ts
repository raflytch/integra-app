import { TERM_SYNONYMS } from './clinical-vocabulary';

export interface ExtractedDiagnosis {
  name: string;
  icd10Code: string | null;
  quote: string;
}

export interface ExtractedFinding {
  name: string;
  isPresent: boolean;
  observedAt: string | null;
  quote: string;
}

export interface ExtractedVitalSign {
  name: string;
  value: string;
  observedAt: string | null;
  quote: string;
}

export interface ExtractedMedication {
  name: string;
  dose: string | null;
  givenAt: string | null;
  quote: string;
}

export interface ExtractedProcedure {
  name: string;
  performedAt: string | null;
  quote: string;
}

export interface ClinicalExtraction {
  diagnoses: ExtractedDiagnosis[];
  findings: ExtractedFinding[];
  vitalSigns: ExtractedVitalSign[];
  medications: ExtractedMedication[];
  procedures: ExtractedProcedure[];
}

function canonicalizeTerm(name: string): string {
  const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return TERM_SYNONYMS[normalizedName] ?? normalizedName;
}

/**
 * Keeps only items whose quote appears verbatim in the document, so every
 * piece of evidence stays traceable, and maps explicit synonyms to the
 * shared vocabulary the detectors match on.
 */
export function groundExtraction(
  extraction: ClinicalExtraction,
  documentContent: string,
): ClinicalExtraction {
  const isQuoted = (item: { quote: string }) =>
    item.quote.trim().length > 0 && documentContent.includes(item.quote);
  const canonicalized = <Item extends { name: string; quote: string }>(
    items: Item[],
  ): Item[] =>
    items
      .filter(isQuoted)
      .map((item) => ({ ...item, name: canonicalizeTerm(item.name) }));

  return {
    diagnoses: extraction.diagnoses.filter(isQuoted),
    findings: canonicalized(extraction.findings),
    vitalSigns: canonicalized(extraction.vitalSigns),
    medications: canonicalized(extraction.medications),
    procedures: canonicalized(extraction.procedures),
  };
}
