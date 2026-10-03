import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { DOT_GRID_CLASS_NAME } from '@/lib/dot-grid';

/**
 * Full-screen page for a missing route or an unexpected error: no card, the
 * message sits directly on the canvas over a dot grid that fades out at the edges.
 */
export function StatusPage({
  icon: Icon,
  code,
  title,
  description,
  actions,
  detail,
}: {
  icon: IconType;
  code: string;
  title: string;
  description: string;
  actions: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 ${DOT_GRID_CLASS_NAME} mask-radial-from-20% mask-radial-to-75% mask-radial-at-center`}
      />
      <header className="px-4 pt-6 sm:px-8 sm:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md"
          aria-label="INTEGRA, ke beranda"
        >
          <Image
            src="/integra-mark.png"
            alt=""
            width={28}
            height={28}
            priority
          />
          <span className="font-display text-base font-semibold tracking-display text-ink">
            INTEGRA
          </span>
        </Link>
      </header>
      <section className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl border border-hairline bg-surface shadow-xs">
            <Icon className="size-6 text-ink" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <p className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
              {code}
            </p>
            <h1 className="font-display text-section font-semibold tracking-display text-balance text-ink sm:text-headline">
              {title}
            </h1>
            <p className="max-w-md text-body text-pretty text-ink-secondary">
              {description}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
            {actions}
          </div>
          {detail}
        </div>
      </section>
      <footer className="px-4 pb-6 text-center text-caption text-ink-secondary sm:px-8 sm:pb-8">
        Detect with evidence. Decide with integrity.
      </footer>
    </main>
  );
}
