import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ClaimOverview } from '@/components/overview/claim-overview';
import { FacilityOverviewPanel } from '@/components/overview/facility-overview';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Ikhtisar · INTEGRA' };

function OverviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ikhtisar"
        description="Gambaran eksekutif antrean, hasil analisis AI, keputusan verifikator, dan pola per faskes."
      />
      <OverviewSection title="Klaim">
        <ClaimOverview />
      </OverviewSection>
      <OverviewSection title="Faskes">
        <FacilityOverviewPanel />
      </OverviewSection>
    </div>
  );
}
