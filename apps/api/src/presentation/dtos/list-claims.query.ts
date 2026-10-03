import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ClaimStatus } from '../../domain/claims/claim-detail';
import {
  type AnalysisFilter,
  CLAIM_QUEUE_SORT_KEYS,
  type ClaimQueueSortKey,
  MAX_CLAIM_QUEUE_PAGE_SIZE,
  type SignalFilter,
  type SortDirection,
} from '../../domain/claims/claim-queue-item';

const CLAIM_STATUSES: ClaimStatus[] = [
  'PENDING',
  'APPROVED',
  'CLARIFICATION_REQUESTED',
  'ESCALATED',
];
const ANALYSIS_FILTERS: AnalysisFilter[] = ['ANALYZED', 'NOT_ANALYZED'];
const SIGNAL_FILTERS: SignalFilter[] = ['FLAGGED', 'CLEAN'];
const SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc'];

export class ListClaimsQuery {
  @IsOptional()
  @IsIn(CLAIM_STATUSES)
  status?: ClaimStatus;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(ANALYSIS_FILTERS)
  analysis?: AnalysisFilter;

  @IsOptional()
  @IsIn(SIGNAL_FILTERS)
  signal?: SignalFilter;

  @IsOptional()
  @IsIn(CLAIM_QUEUE_SORT_KEYS)
  sortBy: ClaimQueueSortKey = 'priority';

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
  @Max(MAX_CLAIM_QUEUE_PAGE_SIZE)
  pageSize = 10;
}
