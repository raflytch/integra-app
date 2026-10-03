import {
  Controller,
  HttpCode,
  HttpStatus,
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
  constructor(private readonly analyzeClaim: AnalyzeClaimUseCase) {}

  /** The web app calls this once per claim the verifier selected, so AI cost stays opt-in. */
  @Post('claims/:claimId')
  @HttpCode(HttpStatus.OK)
  analyze(
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ): Promise<ClaimAnalysisResult> {
    return this.analyzeClaim.execute(claimId);
  }
}
