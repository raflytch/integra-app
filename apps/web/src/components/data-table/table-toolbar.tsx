'use client';

import type { ReactNode } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { TableSort } from '@/hooks/use-table-controls';
import { cn } from '@/lib/utils';

/**
 * "Label: value" select. Radix drops `className` on SelectValue, so the value
 * is sized from the trigger: it grows to sit right after the label and push
 * the chevron to the far edge, left-aligned even when the trigger is full width.
 */
const SELECT_TRIGGER_CLASS_NAME =
  'h-9 w-full justify-start bg-surface text-left text-small sm:w-auto sm:min-w-40 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1';

/** Search and filters above a table, inside its card; stacked full width on phones. */
export function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-stretch gap-2 border-b border-hairline p-3 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}

export function TableSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <InputGroup className="h-9 w-full bg-surface sm:w-72">
      <InputGroupAddon>
        <LuSearch aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={() => onChange('')}
            aria-label="Hapus pencarian"
          >
            <LuX aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

export interface FilterOption<Value extends string> {
  value: Value;
  label: string;
}

export function TableFilterSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: FilterOption<Value>[];
  onChange: (value: Value) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(selectedValue) => onChange(selectedValue as Value)}
    >
      <SelectTrigger aria-label={label} className={SELECT_TRIGGER_CLASS_NAME}>
        <span className="text-ink-secondary">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface SortOption<SortKey extends string> extends TableSort<SortKey> {
  label: string;
}

function toSortOptionValue({ key, direction }: TableSort<string>): string {
  return `${key}:${direction}`;
}

/**
 * Sorting for the card list that replaces a table below `lg`, where there are
 * no sortable column headers. Hidden from `lg` up.
 */
export function TableSortSelect<SortKey extends string>({
  sort,
  options,
  onChange,
}: {
  sort: TableSort<SortKey>;
  options: SortOption<SortKey>[];
  onChange: (sort: TableSort<SortKey>) => void;
}) {
  const isListedSort = options.some(
    (option) => toSortOptionValue(option) === toSortOptionValue(sort),
  );

  return (
    <Select
      value={isListedSort ? toSortOptionValue(sort) : ''}
      onValueChange={(selectedValue) => {
        const option = options.find(
          (candidate) => toSortOptionValue(candidate) === selectedValue,
        );
        if (option) onChange({ key: option.key, direction: option.direction });
      }}
    >
      <SelectTrigger
        aria-label="Urutkan"
        className={cn(SELECT_TRIGGER_CLASS_NAME, 'lg:hidden')}
      >
        <span className="text-ink-secondary">Urutkan:</span>
        <SelectValue placeholder="Sesuai kolom tabel" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={toSortOptionValue(option)}
            value={toSortOptionValue(option)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Shown in place of rows or cards when search or filters leave nothing. */
export function NoMatchingRowsNotice({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="text-small whitespace-normal text-ink-secondary">
        Tidak ada baris yang cocok dengan pencarian atau filter.
      </span>
      <Button variant="outline" size="sm" onClick={onReset}>
        Reset pencarian dan filter
      </Button>
    </div>
  );
}

/** Shown inside the table body when search or filters leave no rows. */
export function NoMatchingRows({
  columnCount,
  onReset,
}: {
  columnCount: number;
  onReset: () => void;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="p-0">
        <NoMatchingRowsNotice onReset={onReset} />
      </TableCell>
    </TableRow>
  );
}
