import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

export function TablePagination({
  firstRowIndex,
  pageRowCount,
  matchingRowCount,
  pageIndex,
  pageCount,
  rowNoun,
  onPageChange,
}: {
  firstRowIndex: number;
  pageRowCount: number;
  matchingRowCount: number;
  pageIndex: number;
  pageCount: number;
  /** Plural noun for the rows, e.g. "klaim". */
  rowNoun: string;
  onPageChange: (pageIndex: number) => void;
}) {
  return (
    <nav
      aria-label="Halaman tabel"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3"
    >
      <span className="text-small text-ink-secondary tabular-nums">
        Menampilkan {firstRowIndex + 1}–{firstRowIndex + pageRowCount} dari{' '}
        {matchingRowCount.toLocaleString('id-ID')} {rowNoun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <LuChevronLeft aria-hidden="true" />
            Sebelumnya
          </Button>
          <span className="text-small text-ink-secondary tabular-nums">
            {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex === pageCount - 1}
          >
            Berikutnya
            <LuChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}
