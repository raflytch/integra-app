import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { FacilityType } from '../../domain/claims/claim-detail';
import type { SortDirection } from '../../domain/claims/claim-queue-item';
import {
  FACILITY_SUMMARY_SORT_KEYS,
  type FacilitySummarySortKey,
  MAX_FACILITY_SUMMARY_PAGE_SIZE,
} from '../../domain/facilities/facility-summary';

const FACILITY_TYPES: FacilityType[] = ['A', 'B', 'C', 'D'];
const SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc'];

export class ListFacilitySummariesQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(FACILITY_TYPES)
  type?: FacilityType;

  @IsOptional()
  @IsIn(FACILITY_SUMMARY_SORT_KEYS)
  sortBy: FacilitySummarySortKey = 'totalPotentialGap';

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortDirection: SortDirection = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_FACILITY_SUMMARY_PAGE_SIZE)
  pageSize = 10;
}
