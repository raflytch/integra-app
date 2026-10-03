import { z } from 'zod';
import type { ClinicalExtraction } from '../../domain/analysis/clinical-extraction';

const quoteSchema = z
  .string()
  .describe('Exact, unedited substring of the document that states this item');
const timeSchema = z
  .string()
  .nullable()
  .describe('Time as written in the document, or null when not stated');

/** LLM output contract for one clinical document (M-03). */
export const clinicalExtractionSchema = z.object({
  diagnoses: z.array(
    z.object({
      name: z.string(),
      icd10Code: z
        .string()
        .nullable()
        .describe('ICD-10 code only when written in the document'),
      quote: quoteSchema,
    }),
  ),
  findings: z.array(
    z.object({
      name: z.string(),
      isPresent: z
        .boolean()
        .describe('false when the document explicitly negates it'),
      observedAt: timeSchema,
      quote: quoteSchema,
    }),
  ),
  vitalSigns: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      observedAt: timeSchema,
      quote: quoteSchema,
    }),
  ),
  medications: z.array(
    z.object({
      name: z.string(),
      dose: z.string().nullable(),
      givenAt: timeSchema,
      quote: quoteSchema,
    }),
  ),
  procedures: z.array(
    z.object({
      name: z.string(),
      performedAt: timeSchema,
      quote: quoteSchema,
    }),
  ),
}) satisfies z.ZodType<ClinicalExtraction>;
