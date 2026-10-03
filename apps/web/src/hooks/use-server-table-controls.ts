import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { TableSort } from '@/hooks/use-table-controls';

const SEARCH_DELAY_MS = 300;

/**
 * Search, sort, and page state for a table whose rows the API filters,
 * sorts, and pages. Same shape as `useTableControls`; the caller fetches the
 * page with `debouncedSearchQuery`, `sort`, and `pageIndex`.
 */
export function useServerTableControls<SortKey extends string>({
  initialSort,
}: {
  initialSort: TableSort<SortKey>;
}) {
  const [searchQuery, setSearchQueryState] = useState('');
  const [sort, setSortState] = useState(initialSort);
  const [pageIndex, setPageIndex] = useState(0);
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery.trim(),
    SEARCH_DELAY_MS,
  );

  return {
    searchQuery,
    debouncedSearchQuery,
    setSearchQuery: (query: string) => {
      setSearchQueryState(query);
      setPageIndex(0);
    },
    sort,
    toggleSort: (key: SortKey) => {
      setSortState((currentSort) =>
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
      setSortState(nextSort);
      setPageIndex(0);
    },
    pageIndex,
    setPageIndex,
    resetPage: () => setPageIndex(0),
  };
}
