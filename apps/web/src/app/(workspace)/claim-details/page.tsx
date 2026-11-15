import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { VedikaClaimTable } from '@/components/vedika/vedika-claim-table';

export const metadata: Metadata = { title: 'Rincian Klaim · INTEGRA' };

export default function ClaimDetailsPage() {
  return (
    <div data-full-width className="flex flex-col gap-3">
      <PageHeader
        title="Rincian Klaim"
        description="Rincian seluruh klaim beserta status data SEP dan lampiran klarifikasi VEDIKA (simulasi)."
        fullWidthDescription
      />
      <VedikaClaimTable />
    </div>
  );
}
