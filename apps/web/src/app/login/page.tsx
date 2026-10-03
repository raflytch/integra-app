import { FileSearch, Gavel, type LucideIcon, Quote } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = { title: 'Masuk · INTEGRA' };

const PRODUCT_PRINCIPLES: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: FileSearch,
    title: 'Bukti, bukan sekadar skor',
    description:
      'Tiga uji menunjukkan bukti yang kurang, tidak konsisten, atau tersalin.',
  },
  {
    icon: Quote,
    title: 'Kutipan dokumen asli',
    description:
      'Setiap tanda menautkan rekam medis yang bisa dicek verifikator.',
  },
  {
    icon: Gavel,
    title: 'Manusia yang memutuskan',
    description:
      'Label sistem selalu perlu klarifikasi, tidak pernah tuduhan fraud.',
  },
];

function BrandPanel() {
  return (
    <aside className="hidden flex-col justify-between gap-12 border-r border-linen-border bg-paper-beige p-12 lg:flex">
      <Image
        src="/integra-logo.png"
        alt="INTEGRA"
        width={240}
        height={61}
        priority
      />
      <div className="flex max-w-md flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl leading-[1.3] font-medium tracking-[-0.54px] text-graphite">
            Detect with evidence. Decide with integrity.
          </h2>
          <p className="text-base text-charcoal-copy">
            Asisten peninjau klaim JKN yang selalu berlandaskan bukti klinis.
          </p>
        </div>
        <ul className="flex flex-col gap-5">
          {PRODUCT_PRINCIPLES.map((principle) => (
            <li key={principle.title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-eggshell-canvas text-integra-deep">
                <principle.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-graphite">
                  {principle.title}
                </span>
                <span className="text-sm text-charcoal-copy">
                  {principle.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-quiet-gray">
        MVP Healthkathon dengan data sintetis. Tidak memakai data peserta JKN
        riil.
      </p>
    </aside>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-eggshell-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <BrandPanel />
      <section className="flex items-center justify-center px-4 py-16 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Image
                src="/integra-mark.png"
                alt=""
                width={36}
                height={36}
                priority
              />
              <span className="text-lg font-semibold tracking-tight text-integra-deep">
                INTEGRA
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-medium text-graphite">
                Masuk ke INTEGRA
              </h1>
              <p className="text-sm text-quiet-gray">
                Gunakan email kerja dan kode dari aplikasi authenticator Anda.
              </p>
            </div>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <Separator className="bg-linen-border" />
          <p className="text-xs leading-normal text-quiet-gray">
            Akses hanya untuk verifikator dan supervisor terdaftar. Kode
            berganti setiap 30 detik dan hanya bisa dipakai sekali.
          </p>
        </div>
      </section>
    </main>
  );
}
