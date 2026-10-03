import { LuArrowLeft } from 'react-icons/lu';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ClaimCard } from '@/components/claim-card/claim-card';

export const metadata: Metadata = { title: 'Kartu Klaim · INTEGRA' };

export default async function ClaimCardPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = await params;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/claims"
        className="flex w-fit items-center gap-1 text-small text-ink-secondary hover:text-ink"
      >
        <LuArrowLeft className="size-4" aria-hidden="true" />
        Antrean Klaim
      </Link>
      <ClaimCard claimId={claimId} />
    </div>
  );
}
