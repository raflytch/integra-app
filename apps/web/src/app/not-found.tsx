import type { Metadata } from 'next';
import Link from 'next/link';
import { LuFileQuestion, LuHouse } from 'react-icons/lu';
import { BackButton } from '@/components/back-button';
import { StatusPage } from '@/components/status-page';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Halaman tidak ditemukan · INTEGRA',
};

export default function NotFound() {
  return (
    <StatusPage
      icon={LuFileQuestion}
      code="Galat 404"
      title="Halaman tidak ditemukan"
      description="Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali tautannya, atau kembali ke antrean klaim."
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">
              <LuHouse aria-hidden="true" />
              Kembali ke beranda
            </Link>
          </Button>
          <BackButton />
        </>
      }
    />
  );
}
