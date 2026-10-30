import type { Metadata } from 'next';
import { ClaimImport } from '@/components/claim-import/claim-import';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Impor Klaim · INTEGRA' };

export default function ClaimImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Impor Klaim"
        description="Unggah file berisi banyak klaim, periksa pratinjaunya, lalu impor. Klaim baru masuk Antrean Klaim dan belum dianalisis AI."
      />
      <ClaimImport />
    </div>
  );
}
