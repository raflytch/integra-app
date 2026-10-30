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
import {
  CLAIM_AI_USAGE_SORT_KEYS,
  type ClaimAiUsageSortKey,
  MAX_CLAIM_AI_USAGE_PAGE_SIZE,
} from '../../domain/ai-usage/ai-usage';
import type { SortDirection } from '../../domain/claims/claim-queue-item';

const SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc'];

export class ListClaimAiUsageQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(CLAIM_AI_USAGE_SORT_KEYS)
  sortBy: ClaimAiUsageSortKey = 'lastExtractedAt';

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
  @Max(MAX_CLAIM_AI_USAGE_PAGE_SIZE)
  pageSize = 10;
}
