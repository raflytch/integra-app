import type { FacilitySummary } from './facility-summary';

export abstract class FacilityRepository {
  abstract findSummaries(): Promise<FacilitySummary[]>;
}
