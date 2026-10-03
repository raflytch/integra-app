'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type AnalysisRunSummary,
  runAnalysis,
} from '@/services/analysis.service';

function describeAnalysisRun(summary: AnalysisRunSummary): string {
  const analyzedText = `INTEGRA menganalisis ${summary.analyzedClaimCount} klaim dari bukti yang diekstraksi AI, ${summary.flaggedClaimCount} perlu klarifikasi`;
  return summary.skippedClaimCount > 0
    ? `${analyzedText}. ${summary.skippedClaimCount} klaim dilewati karena rekam medisnya belum diekstraksi.`
    : `${analyzedText}.`;
}

export function RunAnalysisButton() {
  const queryClient = useQueryClient();
  const analysisMutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims'] }),
        queryClient.invalidateQueries({ queryKey: ['facilities'] }),
      ]),
  });

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        onClick={() => analysisMutation.mutate()}
        disabled={analysisMutation.isPending}
        data-tour="run-analysis"
      >
        <ScanSearch />
        {analysisMutation.isPending ? 'Menganalisis…' : 'Jalankan analisis'}
      </Button>
      <p
        role="status"
        className="max-w-xs text-caption text-ink-secondary sm:text-right"
      >
        {analysisMutation.isSuccess &&
          describeAnalysisRun(analysisMutation.data)}
        {analysisMutation.isError &&
          'Analisis gagal dijalankan. Periksa koneksi, lalu coba lagi.'}
      </p>
    </div>
  );
}
