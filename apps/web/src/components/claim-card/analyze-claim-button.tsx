'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import { AnalysisResultDialog } from '@/components/analysis-result-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format';
import {
  analyzeClaim,
  type ClaimAnalysisResult,
} from '@/services/analysis.service';

function describeClaimAnalysis(result: ClaimAnalysisResult): string {
  if (!result.isAnalyzed) {
    return `AI membaca ${result.extractedDocumentCount} dokumen, ${result.failedDocumentCount} gagal dibaca. Jalankan lagi untuk mencoba dokumen yang tersisa.`;
  }
  return result.findingCount > 0
    ? `INTEGRA menemukan ${result.findingCount} tanda yang perlu diklarifikasi. Lihat panel uji untuk bukti dan kutipannya.`
    : 'Aturan klinis tidak menemukan tanda pada klaim ini.';
}

export function AnalyzeClaimButton({
  claimId,
  claimNo,
  unreadDocumentCount,
}: {
  claimId: string;
  claimNo: string;
  unreadDocumentCount: number;
}) {
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const analysisMutation = useMutation({
    mutationFn: () => analyzeClaim(claimId),
    onSuccess: () => setIsResultOpen(true),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims'] }),
        queryClient.invalidateQueries({ queryKey: ['facilities'] }),
      ]),
  });
  const result = analysisMutation.data;

  // The dialogs stay mounted after the last document is read so the result can still be shown.
  return (
    <>
      {unreadDocumentCount > 0 && (
        <div className="flex flex-col items-start gap-2">
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={analysisMutation.isPending}
          >
            <LuSparkles aria-hidden="true" />
            {analysisMutation.isPending
              ? `AI sedang membaca ${unreadDocumentCount} dokumen…`
              : 'Analisis dengan AI'}
          </Button>
          <p role="status" className="text-caption text-ink-secondary">
            {analysisMutation.isError &&
              'AI belum bisa membaca rekam medis saat ini. Coba lagi beberapa saat lagi.'}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        icon={LuSparkles}
        title={`Analisis ${claimNo} dengan AI?`}
        description={`${unreadDocumentCount} dokumen rekam medis klaim ini belum dibaca AI. AI akan membacanya memakai panggilan LLM berbayar, lalu aturan klinis mengujinya.`}
        confirmLabel="Ya, analisis"
        onConfirm={() => analysisMutation.mutate()}
      />

      {result && (
        <AnalysisResultDialog
          open={isResultOpen}
          onOpenChange={setIsResultOpen}
          summary={describeClaimAnalysis(result)}
          stats={[
            {
              label: 'Dokumen dibaca AI',
              value: String(result.extractedDocumentCount),
            },
            {
              label: 'Gagal dibaca',
              value: String(result.failedDocumentCount),
            },
            { label: 'Tanda ditemukan', value: String(result.findingCount) },
            {
              label: 'Potensi selisih',
              value: formatRupiah(result.potentialGap),
            },
          ]}
        />
      )}
    </>
  );
}
