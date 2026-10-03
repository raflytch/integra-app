import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="font-display text-section font-semibold tracking-display text-ink">
          {title}
        </h1>
        <p className="text-body text-ink-secondary">{description}</p>
      </div>
      {action}
    </header>
  );
}
