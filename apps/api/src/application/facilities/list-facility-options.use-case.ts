import type { FacilityOption } from '../../domain/facilities/facility-option';
import type { FacilityRepository } from '../../domain/facilities/facility.repository';

export class ListFacilityOptionsUseCase {
  constructor(private readonly facilityRepository: FacilityRepository) {}

  execute(): Promise<FacilityOption[]> {
    return this.facilityRepository.findOptions();
  }
}
