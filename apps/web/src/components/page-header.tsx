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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-graphite">
          {title}
        </h1>
        <p className="text-sm text-quiet-gray">{description}</p>
      </div>
      {action}
    </header>
  );
}
