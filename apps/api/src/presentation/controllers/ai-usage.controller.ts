import { Controller, Get, Query } from '@nestjs/common';
import {
  type AiUsageSummary,
  GetAiUsageSummaryUseCase,
} from '../../application/ai-usage/get-ai-usage-summary.use-case';
import {
  type ClaimAiUsageListPage,
  ListClaimAiUsageUseCase,
} from '../../application/ai-usage/list-claim-ai-usage.use-case';
import { Roles } from '../auth/auth.decorators';
import { ListClaimAiUsageQuery } from '../dtos/list-claim-ai-usage.query';

/** LLM spend is an oversight figure, so only supervisors may read it. */
@Roles('SUPERVISOR')
@Controller('ai-usage')
export class AiUsageController {
  constructor(
    private readonly getAiUsageSummary: GetAiUsageSummaryUseCase,
    private readonly listClaimAiUsage: ListClaimAiUsageUseCase,
  ) {}

  @Get('summary')
  summary(): Promise<AiUsageSummary> {
    return this.getAiUsageSummary.execute();
  }

  @Get('claims')
  listClaims(
    @Query() query: ListClaimAiUsageQuery,
  ): Promise<ClaimAiUsageListPage> {
    return this.listClaimAiUsage.execute(query);
  }
}
