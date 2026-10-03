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
import {
  type AnalysisRunSummary,
  RunAnalysisUseCase,
} from '../../application/analysis/run-analysis.use-case';

@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly runAnalysis: RunAnalysisUseCase,
    private readonly analyzeClaim: AnalyzeClaimUseCase,
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(): Promise<AnalysisRunSummary> {
    return this.runAnalysis.execute();
  }

  @Post('claims/:claimId')
  @HttpCode(HttpStatus.OK)
  analyze(
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ): Promise<ClaimAnalysisResult> {
    return this.analyzeClaim.execute(claimId);
  }
}
