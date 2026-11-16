import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import { BulkAnalysisRunningError } from '../../domain/analysis/bulk-analysis-running.error';
import { groundExtraction } from '../../domain/analysis/clinical-extraction';
import {
  readClinicalDocument,
  RULE_READER_SOURCE,
} from '../../domain/analysis/rule-reader';
import type { AnalyzeClaimUseCase } from './analyze-claim.use-case';
import {
  collectSecondaryDiagnosisCodes,
  type EvaluateClaimUseCase,
} from './evaluate-claim.use-case';

export const MAX_BULK_ANALYSIS_CLAIMS = 10_000;
const TRIAGE_PARALLEL_CLAIMS = 8;

export type BulkAnalysisStatus = 'RUNNING' | 'DONE' | 'STOPPED';

export interface BulkAnalysisProgress {
  status: BulkAnalysisStatus;
  claimCount: number;
  triagedCount: number;
  flaggedCount: number;
  confirmWithAi: boolean;
  aiTargetCount: number;
  aiConfirmedCount: number;
  failedCount: number;
  startedAt: Date;
  triageFinishedAt: Date | null;
  finishedAt: Date | null;
}

interface TriagedClaim {
  claimId: string;
  potentialGap: number;
  findingCount: number;
}

async function runInParallel<Item>(
  items: Item[],
  parallelCount: number,
  shouldStop: () => boolean,
  work: (item: Item) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runWorker = async () => {
    for (
      let item = queue.shift();
      item !== undefined && !shouldStop();
      item = queue.shift()
    ) {
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: parallelCount }, runWorker));
}

export class BulkAnalysisRunner {
  private progress: BulkAnalysisProgress | null = null;
  private isStopRequested = false;

  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly evaluateClaim: EvaluateClaimUseCase,
    private readonly analyzeClaim: AnalyzeClaimUseCase,
    private readonly aiParallelClaims: number,
  ) {}

  current(): BulkAnalysisProgress | null {
    return this.progress && { ...this.progress };
  }

  stop(): BulkAnalysisProgress | null {
    if (this.progress?.status === 'RUNNING') this.isStopRequested = true;
    return this.current();
  }

  start(claimIds: string[], confirmWithAi: boolean): BulkAnalysisProgress {
    if (this.progress?.status === 'RUNNING') {
      throw new BulkAnalysisRunningError();
    }
    const uniqueClaimIds = [...new Set(claimIds)].slice(
      0,
      MAX_BULK_ANALYSIS_CLAIMS,
    );
    this.isStopRequested = false;
    this.progress = {
      status: 'RUNNING',
      claimCount: uniqueClaimIds.length,
      triagedCount: 0,
      flaggedCount: 0,
      confirmWithAi,
      aiTargetCount: 0,
      aiConfirmedCount: 0,
      failedCount: 0,
      startedAt: new Date(),
      triageFinishedAt: null,
      finishedAt: null,
    };
    void this.run(this.progress, uniqueClaimIds);
    return { ...this.progress };
  }

  private async run(
    progress: BulkAnalysisProgress,
    claimIds: string[],
  ): Promise<void> {
    const shouldStop = () => this.isStopRequested;
    const flaggedClaims: TriagedClaim[] = [];
    await runInParallel(
      claimIds,
      TRIAGE_PARALLEL_CLAIMS,
      shouldStop,
      async (claimId) => {
        try {
          const triaged = await this.triage(claimId);
          if (
            triaged &&
            (triaged.findingCount > 0 || triaged.potentialGap > 0)
          ) {
            flaggedClaims.push(triaged);
            progress.flaggedCount += 1;
          }
        } catch {
          progress.failedCount += 1;
        }
        progress.triagedCount += 1;
      },
    );
    progress.triageFinishedAt = new Date();

    if (progress.confirmWithAi && !shouldStop()) {
      flaggedClaims.sort(
        (first, second) =>
          second.potentialGap - first.potentialGap ||
          second.findingCount - first.findingCount,
      );
      progress.aiTargetCount = flaggedClaims.length;
      await runInParallel(
        flaggedClaims,
        this.aiParallelClaims,
        shouldStop,
        async ({ claimId }) => {
          try {
            const result = await this.analyzeClaim.execute(claimId);
            if (result.isAnalyzed) progress.aiConfirmedCount += 1;
            else progress.failedCount += 1;
          } catch {
            progress.failedCount += 1;
          }
        },
      );
    }
    progress.status = shouldStop() ? 'STOPPED' : 'DONE';
    progress.finishedAt = new Date();
  }

  private async triage(claimId: string): Promise<TriagedClaim | null> {
    const documents =
      await this.analysisRepository.findDocumentsToExtract(claimId);
    for (const document of documents) {
      await this.analysisRepository.saveExtraction(
        document.id,
        groundExtraction(
          readClinicalDocument(document.content),
          document.content,
        ),
        RULE_READER_SOURCE,
      );
    }
    const claim = await this.analysisRepository.findClaimEvidence(claimId);
    if (!claim) return null;
    const evaluation = await this.evaluateClaim.execute(
      claim,
      await this.analysisRepository.findEvidenceRules(
        collectSecondaryDiagnosisCodes([claim]),
      ),
    );
    return { claimId, ...evaluation };
  }
}
