import type { SortDirection } from '../claims/claim-queue-item';

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
}

/** Usage of every extraction that recorded its tokens. */
export interface AiUsageTotals extends TokenCounts {
  documentCount: number;
  claimCount: number;
}

export interface AiUsageDay extends TokenCounts {
  /** Calendar day in Jakarta time, `YYYY-MM-DD`. */
  date: string;
  documentCount: number;
}

export interface ClaimAiUsage extends TokenCounts {
  claimId: string;
  claimNo: string;
  facilityName: string;
  /** Documents of this claim whose extraction recorded its tokens. */
  documentCount: number;
  /** Distinct models that extracted these documents, alphabetical. */
  models: string[];
  /** ISO timestamp of the latest recorded extraction. */
  lastExtractedAt: string;
}

export const CLAIM_AI_USAGE_SORT_KEYS = [
  'claimNo',
  'documentCount',
  'inputTokens',
  'outputTokens',
  'lastExtractedAt',
] as const;

export type ClaimAiUsageSortKey = (typeof CLAIM_AI_USAGE_SORT_KEYS)[number];

export const MAX_CLAIM_AI_USAGE_PAGE_SIZE = 100;

export interface ClaimAiUsageQuery {
  /** Matches claim number or facility name. */
  search?: string;
  sortBy: ClaimAiUsageSortKey;
  sortDirection: SortDirection;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface ClaimAiUsagePage {
  items: ClaimAiUsage[];
  /** Claims matching the query across every page. */
  total: number;
  page: number;
  pageSize: number;
}
