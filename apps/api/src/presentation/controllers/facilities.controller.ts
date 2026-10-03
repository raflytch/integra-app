import { Controller, Get, Query } from '@nestjs/common';
import { ListFacilityOptionsUseCase } from '../../application/facilities/list-facility-options.use-case';
import { ListFacilitySummariesUseCase } from '../../application/facilities/list-facility-summaries.use-case';
import type { FacilityOption } from '../../domain/facilities/facility-option';
import type { FacilitySummaryPage } from '../../domain/facilities/facility-summary';
import { Roles } from '../auth/auth.decorators';
import { ListFacilitySummariesQuery } from '../dtos/list-facility-summaries.query';

@Controller('facilities')
export class FacilitiesController {
  constructor(
    private readonly listFacilityOptions: ListFacilityOptionsUseCase,
    private readonly listFacilitySummaries: ListFacilitySummariesUseCase,
  ) {}

  /** Filter choices for the claim queue, so every role may read them. */
  @Get()
  listOptions(): Promise<FacilityOption[]> {
    return this.listFacilityOptions.execute();
  }

  @Roles('SUPERVISOR')
  @Get('summary')
  listSummaries(
    @Query() query: ListFacilitySummariesQuery,
  ): Promise<FacilitySummaryPage> {
    return this.listFacilitySummaries.execute(query);
  }
}
