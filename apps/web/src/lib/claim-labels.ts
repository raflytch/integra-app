import type { UserRole } from '@/types/auth.types';
import type {
  ClaimStatus,
  DecisionAction,
  DocumentType,
  EvidenceType,
  Gender,
  TestType,
} from '@/types/claim.types';

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  PENDING: 'Menunggu keputusan',
  APPROVED: 'Disetujui',
  CLARIFICATION_REQUESTED: 'Klarifikasi diminta',
  ESCALATED: 'Dieskalasi',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  VERIFIER: 'Verifikator',
  SUPERVISOR: 'Supervisor',
};

export const DECISION_ACTION_DETAILS: Record<
  DecisionAction,
  { label: string; description: string }
> = {
  APPROVE: {
    label: 'Setujui',
    description: 'Bukti cukup, klaim dibayar sesuai pengajuan.',
  },
  REQUEST_CLARIFICATION: {
    label: 'Minta klarifikasi',
    description: 'Faskes diminta melengkapi bukti yang belum ditemukan.',
  },
  ESCALATE: {
    label: 'Eskalasi',
    description: 'Tinjau bersama tim anti-fraud, misalnya pola salinan.',
  },
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  MEDICAL_RESUME: 'Resume medis',
  EXAM_NOTE: 'Catatan pemeriksaan',
  DAILY_NOTE: 'Catatan harian',
  PRESCRIPTION: 'Resep',
  PROCEDURE: 'Tindakan',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  MEDICATION: 'Obat',
  PROCEDURE: 'Tindakan',
  FINDING: 'Temuan',
  VITAL_SIGN: 'Tanda vital',
};

export const GENDER_LABELS: Record<Gender, string> = {
  M: 'Laki-laki',
  F: 'Perempuan',
};

export const TEST_TYPE_DETAILS: Record<
  TestType,
  { title: string; description: string; emptyMessage: string }
> = {
  EXISTENCE: {
    title: 'Uji Ada',
    description: 'Diagnosis sekunder yang tidak didukung bukti klinis.',
    emptyMessage: 'Belum ada diagnosis sekunder yang ditandai tanpa bukti.',
  },
  CONSISTENCY: {
    title: 'Uji Konsisten',
    description: 'Catatan pemeriksaan yang tidak sejalan dengan catatan lain.',
    emptyMessage: 'Belum ada catatan pemeriksaan yang ditandai tidak sejalan.',
  },
  SIMILARITY: {
    title: 'Uji Bukan Salinan',
    description: 'Dokumen yang hampir identik dengan klaim pasien lain.',
    emptyMessage: 'Belum ada dokumen yang ditandai mirip dengan klaim lain.',
  },
};

export const TEST_TYPE_ORDER: TestType[] = [
  'EXISTENCE',
  'CONSISTENCY',
  'SIMILARITY',
];
