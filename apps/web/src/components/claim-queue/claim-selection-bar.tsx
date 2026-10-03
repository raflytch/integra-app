'use client';

import { LuSparkles, LuX } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * The bar between the toolbar and the rows that holds the page's selection
 * and the paid "Analisis AI" action, so the action sits next to what it acts on.
 */
export function ClaimSelectionBar({
  pageClaimCount,
  selectedCount,
  unreadDocumentCount,
  pageSelectionState,
  isRunning,
  onSelectPage,
  onAnalyze,
}: {
  pageClaimCount: number;
  selectedCount: number;
  unreadDocumentCount: number;
  pageSelectionState: boolean | 'indeterminate';
  isRunning: boolean;
  onSelectPage: (isSelected: boolean) => void;
  onAnalyze: () => void;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline bg-canvas px-3 py-2.5 lg:px-4">
      <div className="flex min-h-9 min-w-0 flex-1 items-center gap-3">
        <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-small text-ink lg:hidden">
          <Checkbox
            checked={pageSelectionState}
            onCheckedChange={(checked) => onSelectPage(checked === true)}
            disabled={pageClaimCount === 0}
          />
          Pilih semua
        </label>
        <p
          aria-live="polite"
          className="min-w-0 text-caption leading-snug text-ink-secondary tabular-nums lg:text-small"
        >
          {hasSelection && (
            <>
              <span className="font-medium text-ink">
                {selectedCount} dipilih
              </span>
              {' · '}
              {unreadDocumentCount.toLocaleString('id-ID')} dokumen belum dibaca
            </>
          )}
        </p>
      </div>
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        {hasSelection && (
          <Button
            variant="destructive"
            className="h-9 flex-1 border-error-ink bg-error-ink text-white hover:bg-error-ink/90 sm:flex-none"
            onClick={() => onSelectPage(false)}
            disabled={isRunning}
          >
            <LuX aria-hidden="true" />
            Batal pilih
          </Button>
        )}
        <Button
          className="h-9 flex-1 sm:flex-none"
          onClick={onAnalyze}
          disabled={!hasSelection || isRunning}
          data-tour="run-analysis"
        >
          <LuSparkles aria-hidden="true" />
          Analisis AI{hasSelection && ` (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
}
