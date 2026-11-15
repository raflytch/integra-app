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
import type { SortDirection } from '../../domain/claims/claim-queue-item';
import {
  MAX_VEDIKA_CLAIM_PAGE_SIZE,
  VEDIKA_CLAIM_SORT_KEYS,
  VEDIKA_SYNC_STATES,
  type VedikaClaimSortKey,
  type VedikaSyncState,
} from '../../domain/vedika/vedika-claim-summary';

const SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc'];

export class ListVedikaClaimsQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(VEDIKA_SYNC_STATES)
  syncState?: VedikaSyncState;

  @IsOptional()
  @IsIn(VEDIKA_CLAIM_SORT_KEYS)
  sortBy: VedikaClaimSortKey = 'admittedAt';

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
  @Max(MAX_VEDIKA_CLAIM_PAGE_SIZE)
  pageSize = 10;
}
