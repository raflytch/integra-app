import type { ClaimStatus } from '@/types/claim.types';

export type QueueFilter = ClaimStatus | 'ALL';

export interface QueueFilterOption {
  value: QueueFilter;
  label: string;
  /** One line under the chips saying which claims this view holds. */
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}

export const REVIEW_QUEUE_FILTERS: QueueFilterOption[] = [
  {
    value: 'PENDING',
    label: 'Menunggu keputusan',
    description:
      'Klaim yang belum diputuskan verifikator. Ini antrean kerja Anda.',
    emptyTitle: 'Tidak ada klaim menunggu',
    emptyDescription:
      'Semua klaim sudah diputuskan. Pilih Semua untuk melihat riwayatnya.',
  },
  {
    value: 'CLARIFICATION_REQUESTED',
    label: 'Klarifikasi diminta',
    description:
      'Klaim yang sudah diputuskan dan menunggu kelengkapan bukti dari faskes.',
    emptyTitle: 'Belum ada permintaan klarifikasi',
    emptyDescription:
      'Klaim yang Anda mintakan klarifikasi ke faskes akan muncul di sini.',
  },
  {
    value: 'APPROVED',
    label: 'Disetujui',
    description: 'Klaim yang sudah disetujui dan dibayar sesuai pengajuan.',
    emptyTitle: 'Belum ada klaim disetujui',
    emptyDescription: 'Klaim yang Anda setujui akan muncul di sini.',
  },
  {
    value: 'ALL',
    label: 'Semua',
    description:
      'Seluruh klaim dengan status apa pun, termasuk yang sudah diputuskan dan dieskalasi.',
    emptyTitle: 'Antrean belum terisi',
    emptyDescription:
      'Klaim akan muncul di sini setelah data klaim dimuat atau diimpor.',
  },
];

export const ESCALATION_QUEUE_FILTERS: QueueFilterOption[] = [
  {
    value: 'ESCALATED',
    label: 'Dieskalasi',
    description:
      'Klaim yang dieskalasi verifikator untuk ditinjau bersama tim anti-fraud.',
    emptyTitle: 'Belum ada eskalasi',
    emptyDescription:
      'Klaim yang dieskalasi verifikator ke tim anti-fraud akan muncul di sini.',
  },
];
