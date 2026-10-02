import type { Metadata } from 'next';
import { FacilitySummary } from '@/components/facility-summary/facility-summary';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Ringkasan Faskes · INTEGRA' };

export default function FacilitySummaryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ringkasan Faskes"
        description="Jumlah tanda dan potensi selisih tarif per faskes untuk menentukan prioritas pembinaan."
      />
      <FacilitySummary />
    </div>
  );
}
