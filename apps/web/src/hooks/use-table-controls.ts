export type SortDirection = 'asc' | 'desc';

export interface TableSort<SortKey extends string> {
  key: SortKey;
  direction: SortDirection;
}
