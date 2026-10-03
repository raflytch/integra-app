import { Controller, Get } from '@nestjs/common';
import { ListFacilitySummariesUseCase } from '../../application/facilities/list-facility-summaries.use-case';
import type { FacilitySummary } from '../../domain/facilities/facility-summary';
import { Roles } from '../auth/auth.decorators';

@Controller('facilities')
export class FacilitiesController {
  constructor(
    private readonly listFacilitySummaries: ListFacilitySummariesUseCase,
  ) {}

  @Roles('SUPERVISOR')
  @Get('summary')
  listSummaries(): Promise<FacilitySummary[]> {
    return this.listFacilitySummaries.execute();
  }
}
