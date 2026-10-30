export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
}

/** Rupiah per one million tokens, as configured on the API. */
export interface LlmPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

export interface AiUsageDay extends TokenCounts {
  /** Jakarta calendar day, `YYYY-MM-DD`. */
  date: string;
  documentCount: number;
  estimatedCost: number | null;
}

export interface AiUsageSummary {
  /** Null when the API has no prices configured; costs are then null too. */
  pricing: LlmPricing | null;
  totals: TokenCounts & {
    documentCount: number;
    claimCount: number;
    estimatedCost: number | null;
  };
  averageCostPerClaim: number | null;
  /** The last 30 days, oldest first, including days without usage. */
  daily: AiUsageDay[];
}

export interface ClaimAiUsage extends TokenCounts {
  claimId: string;
  claimNo: string;
  facilityName: string;
  documentCount: number;
  models: string[];
  lastExtractedAt: string;
  estimatedCost: number | null;
}

export type ClaimAiUsageSortKey =
  | 'claimNo'
  | 'documentCount'
  | 'inputTokens'
  | 'outputTokens'
  | 'lastExtractedAt';

export interface ClaimAiUsageParams {
  search?: string;
  sortBy: ClaimAiUsageSortKey;
  sortDirection: 'asc' | 'desc';
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface ClaimAiUsagePage {
  items: ClaimAiUsage[];
  total: number;
  page: number;
  pageSize: number;
}
