import {
  Controller,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AnalyzeClaimUseCase,
  type AnalysisStep,
} from '../../application/analysis/analyze-claim.use-case';
import { DomainError } from '../../domain/shared/domain-error';

@Controller('analysis')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analyzeClaim: AnalyzeClaimUseCase) {}

  /**
   * The web app calls this once per claim the verifier selected, so AI cost
   * stays opt-in. Streams `step` events as the analysis moves on, then one
   * `result` or `error` event. Errors before the first step (an unknown claim)
   * still reach the exception filter as a plain JSON response.
   */
  @Post('claims/:claimId')
  async analyze(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Res() response: Response,
  ): Promise<void> {
    const send = (event: Record<string, unknown>) => {
      if (!response.headersSent) {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          // no-transform keeps proxies from compressing, and so buffering, the stream.
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        });
      }
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const result = await this.analyzeClaim.execute(
        claimId,
        (step: AnalysisStep) => send({ type: 'step', step }),
      );
      // One cost line per claim; the LLM client already logs each call.
      this.logger.log(
        `claim=${claimId} documents=${result.extractedDocumentCount} input=${result.tokenUsage.inputTokens} output=${result.tokenUsage.outputTokens}`,
      );
      send({ type: 'result', result });
    } catch (error) {
      if (!response.headersSent) throw error;
      if (!(error instanceof DomainError)) {
        this.logger.error(`claim=${claimId} analysis failed`, error);
      }
      send({
        type: 'error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      });
    }
    response.end();
  }
}
