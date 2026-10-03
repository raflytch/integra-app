import { z } from 'zod';
import {
  type ImportedClaim,
  MAX_IMPORT_CLAIMS,
} from '../../domain/imports/imported-claim';

export const CLAIM_IMPORT_FORMAT = 'integra-claims/v1';

const requiredText = z.string().trim().min(1);

/** One claim in the INTEGRA import format, without cross-field rules. */
export const canonicalClaimObjectSchema = z.object({
  claimNo: requiredText.max(64),
  facility: z.object({
    code: requiredText,
    name: requiredText,
    type: z.enum(['A', 'B', 'C', 'D']),
    city: requiredText,
  }),
  patient: z.object({
    medicalRecordNo: requiredText,
    name: requiredText,
    gender: z.enum(['M', 'F']),
    birthDate: z.iso.date(),
  }),
  admittedAt: z.iso.date(),
  dischargedAt: z.iso.date(),
  inacbgCode: requiredText,
  severityLevel: z.number().int().min(1).max(3),
  tariffAmount: z.number().positive(),
  diagnoses: z
    .array(
      z.object({
        icd10Code: requiredText,
        name: requiredText,
        isPrimary: z.boolean(),
      }),
    )
    .min(1),
  documents: z
    .array(
      z.object({
        type: z.enum([
          'EXAM_NOTE',
          'DAILY_NOTE',
          'PRESCRIPTION',
          'PROCEDURE',
          'MEDICAL_RESUME',
        ]),
        recordedAt: z.iso.datetime({ offset: true }),
        content: requiredText,
      }),
    )
    .min(1),
});

/** Source of truth for the `integra-claims/v1` claim shape and its rules. */
export const canonicalClaimSchema = canonicalClaimObjectSchema.superRefine(
  (claim, context) => {
    if (claim.dischargedAt < claim.admittedAt) {
      context.addIssue({
        code: 'custom',
        path: ['dischargedAt'],
        message: 'Tanggal pulang lebih awal dari tanggal masuk',
      });
    }
    const primaryCount = claim.diagnoses.filter(
      (diagnosis) => diagnosis.isPrimary,
    ).length;
    if (primaryCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['diagnoses'],
        message: `Harus ada tepat satu diagnosis utama (ditemukan ${primaryCount})`,
      });
    }
    const icd10Codes = claim.diagnoses.map((diagnosis) => diagnosis.icd10Code);
    if (new Set(icd10Codes).size !== icd10Codes.length) {
      context.addIssue({
        code: 'custom',
        path: ['diagnoses'],
        message: 'Kode diagnosis ganda pada satu klaim',
      });
    }
  },
) satisfies z.ZodType<ImportedClaim>;

export type CanonicalClaim = z.infer<typeof canonicalClaimSchema>;

/** File envelope; each claim is validated on its own so one bad claim does not hide the rest. */
export const claimImportFileSchema = z.object({
  format: z.literal(CLAIM_IMPORT_FORMAT),
  claims: z.array(z.unknown()),
});

/**
 * AI output for one chunk. Claims stay loose so a single malformed claim
 * becomes one invalid row instead of failing the whole chunk; the prompt
 * carries the exact format and every claim is validated afterwards.
 */
export const normalizedChunkSchema = z.object({
  claims: z.array(z.record(z.string(), z.unknown())),
  skipped: z.array(z.object({ reference: z.string(), reason: z.string() })),
});

export const previewClaimImportInputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  content: z.string(),
  allowAi: z.boolean(),
});

export type PreviewClaimImportInput = z.infer<
  typeof previewClaimImportInputSchema
>;

export const importClaimsInputSchema = z.object({
  claims: z.array(canonicalClaimSchema).min(1).max(MAX_IMPORT_CLAIMS),
});

const FIELD_LABELS: Readonly<Record<string, string>> = {
  format: 'Format',
  claimNo: 'Nomor klaim',
  facility: 'Faskes',
  'facility.code': 'Kode faskes',
  'facility.name': 'Nama faskes',
  'facility.type': 'Tipe faskes',
  'facility.city': 'Kota faskes',
  patient: 'Pasien',
  'patient.medicalRecordNo': 'Nomor rekam medis',
  'patient.name': 'Nama pasien',
  'patient.gender': 'Jenis kelamin pasien',
  'patient.birthDate': 'Tanggal lahir pasien',
  admittedAt: 'Tanggal masuk',
  dischargedAt: 'Tanggal pulang',
  inacbgCode: 'Kode INA-CBG',
  severityLevel: 'Severity',
  tariffAmount: 'Tarif',
  diagnoses: 'Diagnosis',
  documents: 'Dokumen',
};

function describeField(path: PropertyKey[]): string {
  const labelPath = path.filter((segment) => typeof segment === 'string');
  const position = path.find((segment) => typeof segment === 'number');
  const label =
    FIELD_LABELS[labelPath.join('.')] ??
    FIELD_LABELS[String(labelPath[0])] ??
    labelPath.join('.');
  return position === undefined ? label : `${label} ke-${position + 1}`;
}

/** Indonesian, field-level messages for the preview table. */
export function describeClaimIssues(error: z.ZodError): string[] {
  const messages = error.issues.map((issue) => {
    if (issue.code === 'custom') return issue.message;
    const field = describeField(issue.path);
    const isMissing =
      issue.code === 'invalid_type' &&
      /received (undefined|null)/.test(issue.message);
    if (isMissing) return `${field} wajib diisi`;
    if (issue.code === 'too_small' && issue.origin === 'array') {
      return `${field} minimal ${String(issue.minimum)}`;
    }
    return `${field} tidak valid`;
  });
  return [...new Set(messages)];
}
