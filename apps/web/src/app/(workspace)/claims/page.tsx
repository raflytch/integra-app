import type { Metadata } from 'next';
import { ClaimQueue } from '@/components/claim-queue/claim-queue';
import { REVIEW_QUEUE_FILTERS } from '@/components/claim-queue/claim-queue-filters';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Antrean Klaim · INTEGRA' };

export default function ClaimQueuePage() {
  return (
    <div data-full-width className="flex flex-col gap-3">
      <PageHeader
        title="Antrean Klaim"
        fullWidthDescription
        description="Daftar klaim untuk diverifikasi, diurutkan dari prioritas tertinggi. Pilih klaim, lalu jalankan Analisis AI untuk memeriksa bukti medisnya."
      />
      <ClaimQueue filterOptions={REVIEW_QUEUE_FILTERS} />
    </div>
  );
}
