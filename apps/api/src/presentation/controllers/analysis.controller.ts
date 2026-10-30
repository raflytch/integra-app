import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  AnalyzeClaimUseCase,
  type ClaimAnalysisResult,
} from '../../application/analysis/analyze-claim.use-case';

@Controller('analysis')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analyzeClaim: AnalyzeClaimUseCase) {}

  /** The web app calls this once per claim the verifier selected, so AI cost stays opt-in. */
  @Post('claims/:claimId')
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ): Promise<ClaimAnalysisResult> {
    const result = await this.analyzeClaim.execute(claimId);
    // One cost line per claim; the LLM client already logs each call.
    this.logger.log(
      `claim=${claimId} documents=${result.extractedDocumentCount} input=${result.tokenUsage.inputTokens} output=${result.tokenUsage.outputTokens}`,
    );
    return result;
  }
}
