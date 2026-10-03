import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  type AnalysisRunSummary,
  RunAnalysisUseCase,
} from '../../application/analysis/run-analysis.use-case';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly runAnalysis: RunAnalysisUseCase) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(): Promise<AnalysisRunSummary> {
    return this.runAnalysis.execute();
  }
}
