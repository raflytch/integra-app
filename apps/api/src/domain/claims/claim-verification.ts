import type { DecisionAction } from '../decisions/decision';
import type { TestType } from './claim-detail';

// Kepmenkes 129/2008 SPM RS, indikator Rekam Medik 1: kelengkapan = jumlah yang lengkap / jumlah yang dicek, standar 100%.
export const COMPLETE_EVIDENCE_RATE = 1;

export interface ClaimVerification {
  evidenceRate: number;
  requiredEvidenceCount: number;
  foundEvidenceCount: number;
  recommendation: DecisionAction;
  reason: string;
}

interface VerifiedFinding {
  testType: TestType;
  strength: number;
  summary: string;
}

interface AnalyzedClaim {
  analyzedAt: Date | null;
  requiredEvidenceCount: number | null;
  foundEvidenceCount: number | null;
}

function strongestOf(findings: VerifiedFinding[]): VerifiedFinding | null {
  return findings.reduce<VerifiedFinding | null>(
    (strongest, finding) =>
      !strongest || finding.strength > strongest.strength ? finding : strongest,
    null,
  );
}

export function assessClaim(
  findings: VerifiedFinding[],
  claim: AnalyzedClaim,
): ClaimVerification | null {
  const { analyzedAt, requiredEvidenceCount, foundEvidenceCount } = claim;
  if (
    !analyzedAt ||
    requiredEvidenceCount === null ||
    foundEvidenceCount === null
  ) {
    return null;
  }
  const evidenceRate =
    requiredEvidenceCount === 0
      ? 1
      : foundEvidenceCount / requiredEvidenceCount;
  const evidence = { evidenceRate, requiredEvidenceCount, foundEvidenceCount };

  // Permenkes 16/2019 Lampiran Bab II: menyalin rekam medis pasien lain (cloning) adalah kecurangan, diteruskan untuk ditindaklanjuti.
  const copiedDocument = strongestOf(
    findings.filter((finding) => finding.testType === 'SIMILARITY'),
  );
  if (copiedDocument) {
    return {
      ...evidence,
      recommendation: 'ESCALATE',
      reason: copiedDocument.summary,
    };
  }

  // Peraturan BPJS Kesehatan 7/2018 Pasal 31 ayat (3) dan (4): berkas yang diverifikasi belum sesuai dikembalikan untuk konfirmasi, disertai penjelasan.
  // Permenkes 26/2021 Lampiran Bab I huruf C: ketidaksesuaian koding diklarifikasi dengan dokter.
  const strongestFinding = strongestOf(findings);
  if (strongestFinding || evidenceRate < COMPLETE_EVIDENCE_RATE) {
    return {
      ...evidence,
      recommendation: 'REQUEST_CLARIFICATION',
      reason:
        strongestFinding?.summary ??
        `Baru ${foundEvidenceCount} dari ${requiredEvidenceCount} bukti wajib diagnosis sekunder ditemukan di berkas.`,
    };
  }

  // Peraturan BPJS Kesehatan 7/2018 Pasal 31 ayat (2): klaim dibayar setelah hasil verifikasi dinyatakan sesuai.
  return {
    ...evidence,
    recommendation: 'APPROVE',
    reason:
      requiredEvidenceCount === 0
        ? 'Semua uji lolos dan tidak ada diagnosis sekunder yang perlu bukti.'
        : 'Semua bukti wajib diagnosis sekunder ditemukan dan semua uji lolos.',
  };
}
