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

/** Search and filters above a table, inside its card. */
export function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-3">
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
      <SelectTrigger
        aria-label={label}
        className="h-9 min-w-40 bg-surface text-small"
      >
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
      <TableCell colSpan={columnCount} className="py-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-small text-ink-secondary">
            Tidak ada baris yang cocok dengan pencarian atau filter.
          </span>
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset pencarian dan filter
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
