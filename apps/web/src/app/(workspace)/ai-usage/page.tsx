import type { Metadata } from 'next';
import { AiUsageOverview } from '@/components/ai-usage/ai-usage-overview';
import { ClaimAiUsageTable } from '@/components/ai-usage/claim-ai-usage-table';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Penggunaan AI · INTEGRA' };

export default function AiUsagePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Penggunaan AI"
        description="Token yang dipakai AI untuk membaca dokumen rekam medis dan estimasi biayanya. Angka pasti tetap mengikuti tagihan penyedia AI."
      />
      <AiUsageOverview />
      <ClaimAiUsageTable />
    </div>
  );
}
