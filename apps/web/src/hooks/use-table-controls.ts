import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableSort<SortKey extends string> {
  key: SortKey;
  direction: SortDirection;
}

type SortValue = number | string | null;

interface TableControlsOptions<Row, SortKey extends string> {
  rows: Row[];
  /** Text the search box matches against, case-insensitively. */
  toSearchText: (row: Row) => string;
  /** A null value means the row has nothing to sort by; it always sorts last. */
  sortValues: Record<SortKey, (row: Row) => SortValue>;
  initialSort: TableSort<NoInfer<SortKey>>;
  pageSize: number;
}

function compareSortValues(
  first: number | string,
  second: number | string,
): number {
  return typeof first === 'number' && typeof second === 'number'
    ? first - second
    : String(first).localeCompare(String(second), 'id');
}

/** Client-side search, column sorting, and pagination for one table. */
export function useTableControls<Row, SortKey extends string>({
  rows,
  toSearchText,
  sortValues,
  initialSort,
  pageSize,
}: TableControlsOptions<Row, SortKey>) {
  const [searchQuery, setSearchQueryState] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [pageIndex, setPageIndex] = useState(0);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchingRows = normalizedQuery
    ? rows.filter((row) =>
        toSearchText(row).toLowerCase().includes(normalizedQuery),
      )
    : rows;
  const readSortValue = sortValues[sort.key];
  const directionFactor = sort.direction === 'asc' ? 1 : -1;
  // Array sort is stable, so ties keep the server's priority order.
  const sortedRows = [...matchingRows].sort((first, second) => {
    const firstValue = readSortValue(first);
    const secondValue = readSortValue(second);
    if (firstValue === null || secondValue === null) {
      return Number(firstValue === null) - Number(secondValue === null);
    }
    return compareSortValues(firstValue, secondValue) * directionFactor;
  });

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);
  const firstRowIndex = currentPageIndex * pageSize;

  return {
    searchQuery,
    setSearchQuery: (query: string) => {
      setSearchQueryState(query);
      setPageIndex(0);
    },
    sort,
    toggleSort: (key: SortKey) => {
      setSort((currentSort) =>
        currentSort.key === key
          ? {
              key,
              direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
            }
          : { key, direction: 'asc' },
      );
      setPageIndex(0);
    },
    setSort: (nextSort: TableSort<SortKey>) => {
      setSort(nextSort);
      setPageIndex(0);
    },
    resetPage: () => setPageIndex(0),
    setPageIndex,
    pageIndex: currentPageIndex,
    pageCount,
    firstRowIndex,
    pageRows: sortedRows.slice(firstRowIndex, firstRowIndex + pageSize),
    /** Every row passing search and filters, in sort order, across all pages. */
    matchingRows: sortedRows,
    matchingRowCount: sortedRows.length,
  };
}
