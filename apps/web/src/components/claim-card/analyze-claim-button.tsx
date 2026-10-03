'use client';

import { LuSparkles } from 'react-icons/lu';
import { useClaimAnalysisRunner } from '@/components/analysis/use-claim-analysis-runner';
import { Button } from '@/components/ui/button';

export function AnalyzeClaimButton({
  claimId,
  claimNo,
  unreadDocumentCount,
  isAnalyzed,
}: {
  claimId: string;
  claimNo: string;
  unreadDocumentCount: number;
  isAnalyzed: boolean;
}) {
  const analysisRunner = useClaimAnalysisRunner();

  // The dialogs stay mounted after the claim is analyzed so the result can still be shown.
  return (
    <>
      {!isAnalyzed && (
        <Button
          className="self-start"
          onClick={() =>
            analysisRunner.requestAnalysis([
              { id: claimId, claimNo, unreadDocumentCount },
            ])
          }
          disabled={analysisRunner.isRunning}
        >
          <LuSparkles aria-hidden="true" />
          Analisis dengan AI
        </Button>
      )}
      {analysisRunner.dialogs}
    </>
  );
}
