import type { Metadata } from 'next';
import { ClaimQueue } from '@/components/claim-queue/claim-queue';
import { ESCALATION_QUEUE_FILTERS } from '@/components/claim-queue/claim-queue-filters';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Eskalasi · INTEGRA' };

export default function EscalationQueuePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eskalasi"
        description="Klaim yang dieskalasi verifikator untuk ditinjau bersama tim anti-fraud."
      />
      <ClaimQueue filterOptions={ESCALATION_QUEUE_FILTERS} />
    </div>
  );
}
