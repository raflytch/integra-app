import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

/** A claim taking longer than this is reported to the verifier as timed out. */
export const ANALYSIS_TIMEOUT_MS = 60 * 1000;

export function isAnalysisTimeoutError(error: unknown): boolean {
  return isAxiosError(error) && error.code === 'ECONNABORTED';
}

/** Stage of one claim's analysis, in the order the API reports them. */
export const ANALYSIS_STEPS = [
  'READING',
  'EXISTENCE',
  'CONSISTENCY',
  'SIMILARITY',
] as const;
export type AnalysisStep = (typeof ANALYSIS_STEPS)[number];

export interface ClaimAnalysisResult {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  isAnalyzed: boolean;
  /** LLM tokens this call used; zero when no document needed reading. */
  tokenUsage: { inputTokens: number; outputTokens: number };
  findingCount: number;
  potentialGap: number;
}

/** The analysis failed after it had started streaming its progress. */
export class AnalysisStreamError extends Error {
  constructor(readonly code: string) {
    super(`Analysis failed: ${code}`);
    this.name = 'AnalysisStreamError';
  }
}

type AnalysisEvent =
  | { type: 'step'; step: AnalysisStep }
  | { type: 'result'; result: ClaimAnalysisResult }
  | { type: 'error'; code: string };

/** Complete `data:` events in a server-sent event stream; a partial tail is skipped. */
function parseEvents(streamText: string): AnalysisEvent[] {
  return streamText
    .split('\n\n')
    .slice(0, -1)
    .filter((block) => block.startsWith('data: '))
    .map((block) => JSON.parse(block.slice('data: '.length)) as AnalysisEvent);
}

/** Runs one claim's analysis, calling `onStep` as each stage starts. */
export async function analyzeClaim(
  claimId: string,
  onStep: (step: AnalysisStep) => void,
): Promise<ClaimAnalysisResult> {
  let reportedStepCount = 0;
  const reportNewSteps = (streamText: string) => {
    const steps = parseEvents(streamText).flatMap((event) =>
      event.type === 'step' ? [event.step] : [],
    );
    steps.slice(reportedStepCount).forEach(onStep);
    reportedStepCount = steps.length;
  };

  const response = await apiClient.post<string>(
    `/analysis/claims/${claimId}`,
    undefined,
    {
      timeout: ANALYSIS_TIMEOUT_MS,
      responseType: 'text',
      // The browser adapter is XHR, whose text grows as events arrive.
      onDownloadProgress: (progress) => {
        const request = progress.event?.target as XMLHttpRequest | undefined;
        if (request?.responseText) reportNewSteps(request.responseText);
      },
    },
  );
  // A proxy that buffers the stream delivers every step only now.
  reportNewSteps(response.data);

  for (const event of parseEvents(response.data)) {
    if (event.type === 'result') return event.result;
    if (event.type === 'error') throw new AnalysisStreamError(event.code);
  }
  throw new AnalysisStreamError('INCOMPLETE_STREAM');
}
