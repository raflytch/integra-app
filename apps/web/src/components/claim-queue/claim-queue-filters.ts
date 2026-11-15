import type { ClaimStatus } from '@/types/claim.types';

export type QueueFilter = ClaimStatus | 'ALL';

export interface QueueFilterOption {
  value: QueueFilter;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}

export const REVIEW_QUEUE_FILTERS: QueueFilterOption[] = [
  {
    value: 'PENDING',
    label: 'Menunggu keputusan',
    emptyTitle: 'Tidak ada klaim menunggu',
    emptyDescription:
      'Semua klaim sudah diputuskan. Pilih Semua untuk melihat riwayatnya.',
  },
  {
    value: 'CLARIFICATION_REQUESTED',
    label: 'Klaim dikirim',
    emptyTitle: 'Belum ada permintaan klarifikasi',
    emptyDescription:
      'Klaim yang Anda mintakan klarifikasi ke faskes akan muncul di sini.',
  },
  {
    value: 'APPROVED',
    label: 'Klaim disetujui',
    emptyTitle: 'Belum ada klaim disetujui',
    emptyDescription: 'Klaim yang Anda setujui akan muncul di sini.',
  },
  {
    value: 'ALL',
    label: 'Semua',
    emptyTitle: 'Antrean belum terisi',
    emptyDescription:
      'Klaim akan muncul di sini setelah data klaim dimuat atau diimpor.',
  },
];

export const ESCALATION_QUEUE_FILTERS: QueueFilterOption[] = [
  {
    value: 'ESCALATED',
    label: 'Dieskalasi',
    emptyTitle: 'Belum ada eskalasi',
    emptyDescription:
      'Klaim yang dieskalasi verifikator ke tim anti-fraud akan muncul di sini.',
  },
];
