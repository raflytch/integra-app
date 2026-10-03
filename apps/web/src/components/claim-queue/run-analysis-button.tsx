'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LuScanSearch } from 'react-icons/lu';
import { AnalysisResultDialog } from '@/components/analysis-result-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { isClaimAnalyzed } from '@/lib/claim-analysis';
import {
  type AnalysisRunSummary,
  runAnalysis,
} from '@/services/analysis.service';
import { fetchClaimQueue } from '@/services/claim.service';

function describeAnalysisRun(summary: AnalysisRunSummary): string {
  const readSentence =
    summary.extractedDocumentCount > 0
      ? `AI membaca ${summary.extractedDocumentCount} dokumen rekam medis, lalu aturan klinis menguji ${summary.analyzedClaimCount} klaim.`
      : `Tidak ada dokumen baru untuk dibaca AI; aturan klinis menguji ulang ${summary.analyzedClaimCount} klaim.`;
  const failedSentence =
    summary.failedDocumentCount > 0
      ? ` ${summary.failedDocumentCount} dokumen gagal dibaca dan akan dicoba lagi.`
      : '';
  return `${readSentence}${failedSentence}`;
}

function formatCount(count: number): string {
  return count.toLocaleString('id-ID');
}

export function RunAnalysisButton() {
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const allClaimsQuery = useQuery({
    queryKey: ['claims', 'queue', 'ALL'],
    queryFn: () => fetchClaimQueue(),
  });
  const analysisMutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: () => setIsResultOpen(true),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims'] }),
        queryClient.invalidateQueries({ queryKey: ['facilities'] }),
      ]),
  });

  const claims = allClaimsQuery.data ?? [];
  const unanalyzedClaimCount = claims.filter(
    (claim) => !isClaimAnalyzed(claim),
  ).length;
  const summary = analysisMutation.data;

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        onClick={() => setIsConfirmOpen(true)}
        disabled={analysisMutation.isPending || allClaimsQuery.isPending}
        data-tour="run-analysis"
      >
        <LuScanSearch />
        {analysisMutation.isPending
          ? 'AI sedang membaca rekam medis…'
          : 'Jalankan analisis AI'}
      </Button>
      <p
        role="status"
        className="max-w-xs text-caption text-ink-secondary sm:text-right"
      >
        {analysisMutation.isPending &&
          'Proses ini bisa memakan waktu beberapa menit.'}
        {analysisMutation.isError &&
          'Analisis gagal dijalankan. AI mungkin sedang tidak tersedia; coba lagi beberapa saat lagi.'}
      </p>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        icon={LuScanSearch}
        title="Jalankan analisis AI?"
        description={
          unanalyzedClaimCount > 0
            ? `${formatCount(unanalyzedClaimCount)} dari ${formatCount(claims.length)} klaim di antrean belum dianalisis AI. AI akan membaca rekam medis beberapa klaim berikutnya memakai panggilan LLM berbayar, lalu aturan klinis mengujinya. Proses ini bisa memakan waktu beberapa menit.`
            : `Semua ${formatCount(claims.length)} klaim sudah dianalisis AI. Analisis hanya menguji ulang bukti yang sudah ada tanpa memanggil AI.`
        }
        confirmLabel="Ya, jalankan"
        onConfirm={() => analysisMutation.mutate()}
      />

      {summary && (
        <AnalysisResultDialog
          open={isResultOpen}
          onOpenChange={setIsResultOpen}
          summary={describeAnalysisRun(summary)}
          stats={[
            {
              label: 'Dokumen dibaca AI',
              value: formatCount(summary.extractedDocumentCount),
            },
            {
              label: 'Klaim teranalisis',
              value: formatCount(summary.analyzedClaimCount),
            },
            {
              label: 'Perlu klarifikasi',
              value: formatCount(summary.flaggedClaimCount),
            },
            {
              label: 'Belum dianalisis',
              value: formatCount(summary.remainingClaimCount),
            },
          ]}
          continueLabel={
            summary.remainingClaimCount > 0 ? 'Lanjutkan analisis' : undefined
          }
          onContinue={() => setIsConfirmOpen(true)}
        />
      )}
    </div>
  );
}
