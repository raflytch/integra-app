import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { LuFileSearch, LuGavel, LuQuote } from 'react-icons/lu';
import Image from 'next/image';

const PRODUCT_PRINCIPLES: {
  icon: IconType;
  title: string;
  description: string;
}[] = [
  {
    icon: LuFileSearch,
    title: 'Bukti, bukan sekadar skor',
    description:
      'Tiga uji menunjukkan bukti yang kurang, tidak konsisten, atau tersalin.',
  },
  {
    icon: LuQuote,
    title: 'Kutipan dokumen asli',
    description:
      'Setiap tanda menautkan rekam medis yang bisa dicek verifikator.',
  },
  {
    icon: LuGavel,
    title: 'Manusia yang memutuskan',
    description:
      'Label sistem selalu perlu klarifikasi, tidak pernah tuduhan fraud.',
  },
];

/** The dot grid is the only decorative element DESIGN.md allows. */
const DOT_GRID_CLASS_NAME =
  'bg-[radial-gradient(circle,var(--color-hairline)_1px,transparent_1px)] bg-size-[20px_20px]';

function BrandPanel() {
  return (
    <aside
      className={`hidden flex-col justify-between gap-12 border-r border-hairline bg-canvas p-12 lg:flex ${DOT_GRID_CLASS_NAME}`}
    >
      <Image
        src="/integra-logo.png"
        alt="INTEGRA"
        width={200}
        height={51}
        priority
      />
      <div className="flex max-w-lg flex-col gap-10">
        <div className="flex flex-col gap-4">
          <p className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
            Verifikasi klaim JKN
          </p>
          <h2 className="font-display text-section font-semibold tracking-display text-ink xl:text-headline">
            Detect with evidence. Decide with integrity.
          </h2>
          <p className="text-body text-ink-secondary">
            Asisten peninjau klaim yang selalu berlandaskan bukti klinis.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline bg-surface shadow-xs">
          {PRODUCT_PRINCIPLES.map((principle) => (
            <li key={principle.title} className="flex gap-3 px-4 py-3">
              <principle.icon
                className="mt-0.5 size-4 shrink-0 text-ink"
                aria-hidden="true"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-small font-medium text-ink">
                  {principle.title}
                </span>
                <span className="text-small text-ink-secondary">
                  {principle.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** Brand panel beside a narrow form column, shared by login and sign-up. */
export function AuthPageShell({
  title,
  description,
  footnote,
  children,
}: {
  title: string;
  description: string;
  footnote: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      <BrandPanel />
      <section className="flex items-center justify-center bg-surface px-4 py-16 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 lg:hidden">
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
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-subhead font-semibold tracking-display text-ink">
                {title}
              </h1>
              <p className="text-body text-ink-secondary">{description}</p>
            </div>
          </div>
          {children}
          <p className="border-t border-hairline pt-6 text-caption leading-normal text-ink-secondary">
            {footnote}
          </p>
        </div>
      </section>
    </main>
  );
}
