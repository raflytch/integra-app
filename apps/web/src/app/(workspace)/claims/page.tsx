import type { Metadata } from 'next';
import { ClaimQueue } from '@/components/claim-queue/claim-queue';
import { REVIEW_QUEUE_FILTERS } from '@/components/claim-queue/claim-queue-filters';
import { RunAnalysisButton } from '@/components/claim-queue/run-analysis-button';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Antrean Klaim · INTEGRA' };

export default function ClaimQueuePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Antrean Klaim"
        description="Klaim diurutkan dari sinyal terkuat dan potensi selisih tarif terbesar."
        action={<RunAnalysisButton />}
      />
      <ClaimQueue filterOptions={REVIEW_QUEUE_FILTERS} />
    </div>
  );
}
