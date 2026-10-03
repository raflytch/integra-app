import type { FacilityOption } from './facility-option';
import type {
  FacilitySummaryPage,
  FacilitySummaryQuery,
} from './facility-summary';

export abstract class FacilityRepository {
  abstract findSummaryPage(
    query: FacilitySummaryQuery,
  ): Promise<FacilitySummaryPage>;
  abstract findOptions(): Promise<FacilityOption[]>;
}
