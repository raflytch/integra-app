'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { formatRupiah } from '@/lib/format';
import { analyzeClaim } from '@/services/analysis.service';
import { isNotFoundError } from '@/services/claim.service';
import { AnalysisLoadingOverlay } from './analysis-loading-overlay';
import { AnalysisResultDialog } from './analysis-result-dialog';

/** Claims analyzed in parallel; the API also caps concurrent LLM calls. */
const PARALLEL_CLAIM_COUNT = 2;

export interface AnalysisTarget {
  id: string;
  claimNo: string;
  /** Documents the AI has not read yet, each one a paid LLM call. */
  unreadDocumentCount: number;
}

interface AnalysisRunSummary {
  requestedClaimCount: number;
  analyzedClaimCount: number;
  flaggedClaimCount: number;
  extractedDocumentCount: number;
  failedDocumentCount: number;
  potentialGap: number;
  unfinishedClaimCount: number;
  stopReason: 'COMPLETED' | 'STOPPED' | 'AI_UNAVAILABLE';
}

type RunPhase = 'IDLE' | 'CONFIRMING' | 'RUNNING' | 'SHOWING_RESULT';

function formatCount(count: number): string {
  return count.toLocaleString('id-ID');
}

function describeConfirmation(targets: AnalysisTarget[]): string {
  const unreadDocumentCount = targets.reduce(
    (total, target) => total + target.unreadDocumentCount,
    0,
  );
  const analyzedTargetCount = targets.filter(
    (target) => target.unreadDocumentCount === 0,
  ).length;
  if (unreadDocumentCount === 0) {
    return 'Semua klaim yang dipilih sudah dibaca AI. Analisis hanya menguji ulang bukti yang ada, tanpa memanggil AI.';
  }
  const rerunSentence =
    analyzedTargetCount > 0
      ? ` ${formatCount(analyzedTargetCount)} klaim sudah dianalisis dan hanya diuji ulang tanpa biaya.`
      : '';
  return `AI akan membaca ${formatCount(unreadDocumentCount)} dokumen rekam medis yang belum dibaca memakai panggilan LLM berbayar, lalu aturan klinis mengujinya.${rerunSentence} Anda bisa menghentikan analisis kapan saja.`;
}

function describeRun(summary: AnalysisRunSummary): string {
  const analyzedSentence = `AI menganalisis ${formatCount(summary.analyzedClaimCount)} dari ${formatCount(summary.requestedClaimCount)} klaim yang dipilih.`;
  if (summary.stopReason === 'AI_UNAVAILABLE') {
    return `${analyzedSentence} AI sedang tidak tersedia, jadi ${formatCount(summary.unfinishedClaimCount)} klaim lainnya belum dianalisis. Coba lagi beberapa saat lagi.`;
  }
  if (summary.stopReason === 'STOPPED') {
    return `${analyzedSentence} Analisis dihentikan; ${formatCount(summary.unfinishedClaimCount)} klaim belum dianalisis.`;
  }
  if (summary.failedDocumentCount > 0) {
    return `${analyzedSentence} ${formatCount(summary.failedDocumentCount)} dokumen gagal dibaca; analisis ulang klaimnya untuk mencoba lagi.`;
  }
  return summary.flaggedClaimCount > 0
    ? `${analyzedSentence} ${formatCount(summary.flaggedClaimCount)} klaim perlu klarifikasi; buka Kartu Klaim untuk melihat buktinya.`
    : `${analyzedSentence} Aturan klinis tidak menemukan tanda.`;
}

/**
 * Confirm, run, and report AI analysis for the claims a verifier picked.
 * Render `dialogs` once in the calling component.
 */
export function useClaimAnalysisRunner({
  onFinished,
}: {
  /** Runs after a confirmed run ends, e.g. to clear a table selection. */
  onFinished?: () => void;
} = {}) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<RunPhase>('IDLE');
  const [targets, setTargets] = useState<AnalysisTarget[]>([]);
  const [completedClaimCount, setCompletedClaimCount] = useState(0);
  const [inFlightClaimNos, setInFlightClaimNos] = useState<string[]>([]);
  const [isStopping, setIsStopping] = useState(false);
  const [summary, setSummary] = useState<AnalysisRunSummary | null>(null);
  const isStopRequestedRef = useRef(false);

  function requestAnalysis(selectedTargets: AnalysisTarget[]) {
    if (selectedTargets.length === 0) return;
    setTargets(selectedTargets);
    setPhase('CONFIRMING');
  }

  async function runAnalysis() {
    const pendingTargets = [...targets];
    const runSummary: AnalysisRunSummary = {
      requestedClaimCount: targets.length,
      analyzedClaimCount: 0,
      flaggedClaimCount: 0,
      extractedDocumentCount: 0,
      failedDocumentCount: 0,
      potentialGap: 0,
      unfinishedClaimCount: 0,
      stopReason: 'COMPLETED',
    };
    isStopRequestedRef.current = false;
    setIsStopping(false);
    setCompletedClaimCount(0);
    setInFlightClaimNos([]);
    setPhase('RUNNING');

    async function analyzeNextClaims() {
      while (pendingTargets.length > 0 && !isStopRequestedRef.current) {
        const target = pendingTargets.shift()!;
        setInFlightClaimNos((claimNos) => [...claimNos, target.claimNo]);
        try {
          const result = await analyzeClaim(target.id);
          runSummary.extractedDocumentCount += result.extractedDocumentCount;
          runSummary.failedDocumentCount += result.failedDocumentCount;
          if (result.isAnalyzed) {
            runSummary.analyzedClaimCount += 1;
            runSummary.potentialGap += result.potentialGap;
            if (result.findingCount > 0) runSummary.flaggedClaimCount += 1;
          } else {
            runSummary.unfinishedClaimCount += 1;
          }
        } catch (error) {
          runSummary.unfinishedClaimCount += 1;
          // A claim deleted meanwhile is skipped; any other failure means the AI or API is down.
          if (!isNotFoundError(error)) {
            runSummary.stopReason = 'AI_UNAVAILABLE';
            isStopRequestedRef.current = true;
          }
        } finally {
          setInFlightClaimNos((claimNos) =>
            claimNos.filter((claimNo) => claimNo !== target.claimNo),
          );
          setCompletedClaimCount((count) => count + 1);
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(PARALLEL_CLAIM_COUNT, pendingTargets.length) },
        analyzeNextClaims,
      ),
    );
    if (pendingTargets.length > 0) {
      runSummary.unfinishedClaimCount += pendingTargets.length;
      if (runSummary.stopReason === 'COMPLETED')
        runSummary.stopReason = 'STOPPED';
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['claims'] }),
      queryClient.invalidateQueries({ queryKey: ['facilities'] }),
    ]);
    setSummary(runSummary);
    setPhase('SHOWING_RESULT');
    onFinished?.();
  }

  function stopAnalysis() {
    isStopRequestedRef.current = true;
    setIsStopping(true);
  }

  const dialogs = (
    <>
      <ConfirmDialog
        open={phase === 'CONFIRMING'}
        // Confirming also closes the dialog; only a cancel may reset the phase,
        // otherwise this would override the RUNNING phase set by onConfirm.
        onOpenChange={(open) =>
          !open &&
          setPhase((currentPhase) =>
            currentPhase === 'CONFIRMING' ? 'IDLE' : currentPhase,
          )
        }
        icon={LuSparkles}
        title={
          targets.length === 1
            ? `Analisis ${targets[0].claimNo} dengan AI?`
            : `Analisis ${formatCount(targets.length)} klaim dengan AI?`
        }
        description={describeConfirmation(targets)}
        confirmLabel="Ya, analisis"
        onConfirm={() => void runAnalysis()}
      />
      <AnalysisLoadingOverlay
        open={phase === 'RUNNING'}
        completedClaimCount={completedClaimCount}
        totalClaimCount={targets.length}
        inFlightClaimNos={inFlightClaimNos}
        isStopping={isStopping}
        onStop={stopAnalysis}
      />
      {summary && (
        <AnalysisResultDialog
          open={phase === 'SHOWING_RESULT'}
          onOpenChange={(open) => !open && setPhase('IDLE')}
          summary={describeRun(summary)}
          stats={[
            {
              label: 'Klaim dianalisis',
              value: `${formatCount(summary.analyzedClaimCount)} / ${formatCount(summary.requestedClaimCount)}`,
            },
            {
              label: 'Dokumen dibaca AI',
              value: formatCount(summary.extractedDocumentCount),
            },
            {
              label: 'Perlu klarifikasi',
              value: formatCount(summary.flaggedClaimCount),
            },
            {
              label: 'Potensi selisih',
              value: formatRupiah(summary.potentialGap),
            },
          ]}
        />
      )}
    </>
  );

  return { requestAnalysis, isRunning: phase === 'RUNNING', dialogs };
}
