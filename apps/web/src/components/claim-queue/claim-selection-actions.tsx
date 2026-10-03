'use client';

import { LuChevronDown, LuListChecks, LuSparkles } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TOP_UNANALYZED_LIMITS = [5, 10, 25];

/** Selection shortcuts and the single entry point to paid AI analysis in the queue. */
export function ClaimSelectionActions({
  selectedClaimCount,
  unreadDocumentCount,
  pageClaimCount,
  matchingClaimCount,
  unanalyzedMatchingClaimCount,
  isAnalysisRunning,
  onSelectPage,
  onSelectTopUnanalyzed,
  onSelectAllUnanalyzed,
  onSelectAll,
  onClearSelection,
  onAnalyzeSelection,
}: {
  selectedClaimCount: number;
  unreadDocumentCount: number;
  pageClaimCount: number;
  matchingClaimCount: number;
  unanalyzedMatchingClaimCount: number;
  isAnalysisRunning: boolean;
  onSelectPage: () => void;
  onSelectTopUnanalyzed: (limit: number) => void;
  onSelectAllUnanalyzed: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onAnalyzeSelection: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
      {selectedClaimCount > 0 && (
        <span className="text-caption text-ink-secondary tabular-nums">
          {selectedClaimCount.toLocaleString('id-ID')} dipilih ·{' '}
          {unreadDocumentCount.toLocaleString('id-ID')} dokumen belum dibaca
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9">
            <LuListChecks aria-hidden="true" />
            Pilih
            <LuChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={onSelectPage}>
            Klaim di halaman ini ({pageClaimCount})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
            Belum dianalisis, urutan tabel
          </DropdownMenuLabel>
          {TOP_UNANALYZED_LIMITS.map((limit) => (
            <DropdownMenuItem
              key={limit}
              disabled={unanalyzedMatchingClaimCount === 0}
              onSelect={() => onSelectTopUnanalyzed(limit)}
            >
              {limit} klaim teratas
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            disabled={unanalyzedMatchingClaimCount === 0}
            onSelect={onSelectAllUnanalyzed}
          >
            Semua yang belum dianalisis (
            {unanalyzedMatchingClaimCount.toLocaleString('id-ID')})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSelectAll}>
            Semua klaim di tabel ({matchingClaimCount.toLocaleString('id-ID')})
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={selectedClaimCount === 0}
            onSelect={onClearSelection}
          >
            Batal pilih
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        className="h-9"
        onClick={onAnalyzeSelection}
        disabled={selectedClaimCount === 0 || isAnalysisRunning}
        data-tour="run-analysis"
      >
        <LuSparkles aria-hidden="true" />
        Analisis AI
        {selectedClaimCount > 0 &&
          ` (${selectedClaimCount.toLocaleString('id-ID')})`}
      </Button>
    </div>
  );
}
