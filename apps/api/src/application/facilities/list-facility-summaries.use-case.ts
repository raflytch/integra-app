import type {
  FacilitySummaryPage,
  FacilitySummaryQuery,
} from '../../domain/facilities/facility-summary';
import type { FacilityRepository } from '../../domain/facilities/facility.repository';

export class ListFacilitySummariesUseCase {
  constructor(private readonly facilityRepository: FacilityRepository) {}

  execute(query: FacilitySummaryQuery): Promise<FacilitySummaryPage> {
    return this.facilityRepository.findSummaryPage(query);
  }
}
