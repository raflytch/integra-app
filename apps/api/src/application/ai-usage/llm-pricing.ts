import type { TokenCounts } from '../../domain/ai-usage/ai-usage';

/** Rupiah per one million tokens, from configuration. */
export interface LlmPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

/** Estimated rupiah cost of the tokens, or null when no price is configured. */
export function estimateCost(
  tokens: TokenCounts,
  pricing: LlmPricing | null,
): number | null {
  if (!pricing) return null;
  return (
    (tokens.inputTokens * pricing.inputPerMillionTokens +
      tokens.outputTokens * pricing.outputPerMillionTokens) /
    1_000_000
  );
}
