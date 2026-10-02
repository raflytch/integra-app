import type { FacilitySummary } from '../../domain/facilities/facility-summary';
import type { FacilityRepository } from '../../domain/facilities/facility.repository';

export class ListFacilitySummariesUseCase {
  constructor(private readonly facilityRepository: FacilityRepository) {}

  execute(): Promise<FacilitySummary[]> {
    return this.facilityRepository.findSummaries();
  }
}
