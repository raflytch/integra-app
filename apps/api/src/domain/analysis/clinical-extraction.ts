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

/** Which model and prompt produced an extraction and what it cost, for audit. */
export interface ExtractionSource {
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
}

function canonicalizeTerm(name: string): string {
  const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return TERM_SYNONYMS[normalizedName] ?? normalizedName;
}

/**
 * Locates `quote` in `documentContent`, ignoring case and differences in
 * whitespace, and returns the exact document text it matches, or null.
 * Models often re-flow line breaks or change capitals when quoting, which
 * would otherwise discard evidence that is really in the document.
 */
function findQuotedText(quote: string, documentContent: string): string | null {
  if (documentContent.includes(quote)) return quote;

  // Collapse each whitespace run to one space and lowercase character by
  // character, remembering where every normalized character came from.
  let normalizedContent = '';
  const sourceIndexes: number[] = [];
  for (let index = 0; index < documentContent.length; index++) {
    const character = documentContent[index];
    if (/\s/.test(character)) {
      if (normalizedContent.endsWith(' ')) continue;
      normalizedContent += ' ';
    } else {
      const lowered = character.toLowerCase();
      // Rare characters change length when lowercased; keep them as written.
      normalizedContent += lowered.length === 1 ? lowered : character;
    }
    sourceIndexes.push(index);
  }

  const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
  const start = normalizedContent.indexOf(normalizedQuote);
  if (start === -1) return null;
  const end = start + normalizedQuote.length - 1;
  return documentContent.slice(sourceIndexes[start], sourceIndexes[end] + 1);
}

/**
 * Keeps only items whose quote appears in the document, so every piece of
 * evidence stays traceable, and maps explicit synonyms to the shared
 * vocabulary the detectors match on. Quotes are replaced by the exact
 * document text they match, so citations always highlight verbatim.
 */
export function groundExtraction(
  extraction: ClinicalExtraction,
  documentContent: string,
): ClinicalExtraction {
  const grounded = <Item extends { quote: string }>(items: Item[]): Item[] =>
    items.flatMap((item) => {
      if (!item.quote.trim()) return [];
      const quote = findQuotedText(item.quote, documentContent);
      return quote === null ? [] : [{ ...item, quote }];
    });
  const canonicalized = <Item extends { name: string; quote: string }>(
    items: Item[],
  ): Item[] =>
    grounded(items).map((item) => ({
      ...item,
      name: canonicalizeTerm(item.name),
    }));

  return {
    diagnoses: grounded(extraction.diagnoses),
    findings: canonicalized(extraction.findings),
    vitalSigns: canonicalized(extraction.vitalSigns),
    medications: canonicalized(extraction.medications),
    procedures: canonicalized(extraction.procedures),
  };
}
