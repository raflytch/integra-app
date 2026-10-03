import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-hairline bg-surface p-5 shadow-xs">
      <span className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
        {label}
      </span>
      <span className="font-display text-subhead font-semibold tracking-display break-words text-ink tabular-nums">
        {value}
      </span>
      {hint && <span className="text-caption text-ink-secondary">{hint}</span>}
    </div>
  );
}

/**
 * Four tiles only fit side by side from `xl`; narrower, a rupiah headline
 * figure would overflow its tile.
 */
export function StatTileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}

export function ChartPanel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 shadow-xs',
        className,
      )}
    >
      <header className="flex flex-col gap-0.5">
        <h2 className="text-body font-semibold tracking-display text-ink">
          {title}
        </h2>
        <p className="text-small text-ink-secondary">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function ChartLegendList({
  items,
}: {
  items: { label: string; color: string; value?: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-caption text-ink-secondary"
        >
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
          {item.value && (
            <span className="font-medium text-ink tabular-nums">
              {item.value}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DashboardSkeleton({ tileCount }: { tileCount: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">Memuat ringkasan</span>
      <StatTileGrid>
        {Array.from({ length: tileCount }, (_, tileIndex) => (
          <Skeleton key={tileIndex} className="h-24 rounded-xl bg-subtle" />
        ))}
      </StatTileGrid>
      <Skeleton className="h-72 rounded-xl bg-subtle" />
    </div>
  );
}

/** Tooltip surface shared by every chart. */
export const CHART_TOOLTIP_CLASS_NAME =
  'rounded-lg border-hairline bg-surface text-caption text-ink shadow-sm';
