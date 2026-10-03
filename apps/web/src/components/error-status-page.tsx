'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { LuHouse, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import { StatusPage } from '@/components/status-page';
import { Button } from '@/components/ui/button';

/** Shared by `app/error.tsx` and `app/global-error.tsx`. */
export function ErrorStatusPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      icon={LuTriangleAlert}
      code="Terjadi kesalahan"
      title="Halaman gagal dimuat"
      description="Ada masalah tak terduga saat menampilkan halaman ini. Data Anda aman; coba muat ulang, atau kembali ke beranda."
      actions={
        <>
          <Button size="lg" onClick={reset}>
            <LuRefreshCw aria-hidden="true" />
            Coba lagi
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <LuHouse aria-hidden="true" />
              Kembali ke beranda
            </Link>
          </Button>
        </>
      }
      detail={
        error.digest && (
          <p className="text-caption text-ink-secondary">
            Kode galat{' '}
            <code className="rounded-sm border border-hairline bg-surface px-1.5 py-0.5 font-mono text-ink">
              {error.digest}
            </code>
          </p>
        )
      }
    />
  );
}
