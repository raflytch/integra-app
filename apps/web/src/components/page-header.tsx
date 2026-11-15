import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  action,
  fullWidthDescription = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  /** Let the description run the full page width instead of wrapping at max-w-2xl. */
  fullWidthDescription?: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div
        className={cn(
          'flex min-w-0 flex-col gap-2',
          !fullWidthDescription && 'max-w-2xl',
        )}
      >
        <h1 className="font-display text-section font-semibold tracking-display text-ink">
          {title}
        </h1>
        <p className="text-body text-ink-secondary">{description}</p>
      </div>
      {action}
    </header>
  );
}
