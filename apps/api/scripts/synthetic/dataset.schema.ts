import { join } from 'node:path';
import { z } from 'zod';

export const DATASET_VERSION = 1;
/** Committed so the team shares one dataset without calling the LLM again. */
export const DATASET_FILE_PATH = join(
  __dirname,
  '../../prisma/seed-data/synthetic-dataset.json',
);

const injectedCaseSchema = z.enum(['UPCODING', 'EXAM_MANIPULATION', 'CLONING']);
const dateOnlySchema = z.iso.date();
const timestampSchema = z.iso.datetime({ offset: true });

export type InjectedCase = z.infer<typeof injectedCaseSchema>;

const datasetDocumentSchema = z.object({
  type: z.enum([
    'MEDICAL_RESUME',
    'EXAM_NOTE',
    'DAILY_NOTE',
    'PRESCRIPTION',
    'PROCEDURE',
  ]),
  recordedAt: timestampSchema,
  content: z.string().min(1),
  /** Filled by the M-03 export so later seeds skip the LLM. */
  extracted: z.unknown().optional(),
});

const datasetClaimSchema = z.object({
  claimNo: z.string().min(1),
  scenario: z.string().min(1),
  facilityCode: z.string().min(1),
  medicalRecordNo: z.string().min(1),
  admittedAt: dateOnlySchema,
  dischargedAt: dateOnlySchema,
  inacbgCode: z.string().min(1),
  severityLevel: z.number().int().min(1).max(3),
  tariffAmount: z.number().positive(),
  injectedCase: z.array(injectedCaseSchema),
  diagnoses: z
    .array(
      z.object({
        icd10Code: z.string().min(1),
        name: z.string().min(1),
        isPrimary: z.boolean(),
      }),
    )
    .min(1),
  documents: z.array(datasetDocumentSchema).min(1),
});

/** File format of `prisma/seed-data/synthetic-dataset.json`, shared by generator and seed. */
export const syntheticDatasetSchema = z.object({
  version: z.literal(DATASET_VERSION),
  generatedAt: timestampSchema,
  model: z.string().min(1),
  facilities: z.array(
    z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(['A', 'B', 'C', 'D']),
      city: z.string().min(1),
    }),
  ),
  patients: z.array(
    z.object({
      medicalRecordNo: z.string().min(1),
      name: z.string().min(1),
      gender: z.enum(['M', 'F']),
      birthDate: dateOnlySchema,
    }),
  ),
  evidenceRules: z.array(
    z.object({
      icd10Code: z.string().min(1),
      evidenceType: z.enum([
        'MEDICATION',
        'PROCEDURE',
        'FINDING',
        'VITAL_SIGN',
      ]),
      expected: z.string().min(1),
      guidelineRef: z.string().min(1),
    }),
  ),
  claims: z.array(datasetClaimSchema),
});

export type SyntheticDataset = z.infer<typeof syntheticDatasetSchema>;
export type DatasetClaim = SyntheticDataset['claims'][number];
export type DatasetDocument = DatasetClaim['documents'][number];
export type DatasetPatient = SyntheticDataset['patients'][number];
