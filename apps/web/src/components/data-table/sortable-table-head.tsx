import type { ReactNode } from 'react';
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from 'react-icons/lu';
import { TableHead } from '@/components/ui/table';
import type { TableSort } from '@/hooks/use-table-controls';
import { cn } from '@/lib/utils';

export function SortableTableHead<SortKey extends string>({
  sortKey,
  sort,
  onSort,
  align = 'left',
  className,
  children,
}: {
  sortKey: NoInfer<SortKey>;
  sort: TableSort<SortKey>;
  onSort: (sortKey: SortKey) => void;
  align?: 'left' | 'right';
  className?: string;
  children: ReactNode;
}) {
  const isSorted = sort.key === sortKey;
  const SortIcon = !isSorted
    ? LuArrowUpDown
    : sort.direction === 'asc'
      ? LuArrowUp
      : LuArrowDown;

  return (
    <TableHead
      aria-sort={
        isSorted
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className={cn(align === 'right' && 'text-right', className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          '-mx-2 inline-flex h-7 items-center gap-1 rounded-md px-2 uppercase transition-colors hover:bg-subtle hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/15 focus-visible:outline-none',
          align === 'right' && 'flex-row-reverse',
          isSorted && 'text-ink',
        )}
      >
        {children}
        <SortIcon
          aria-hidden="true"
          className={cn('size-3.5', !isSorted && 'text-ink-muted')}
        />
      </button>
    </TableHead>
  );
}
