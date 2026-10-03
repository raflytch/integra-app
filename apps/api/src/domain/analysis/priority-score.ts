const STRONGEST_SIGNAL_WEIGHT = 0.7;
const TARIFF_GAP_WEIGHT = 0.3;
const SCORE_DECIMALS = 4;

export function calculatePriorityScore(
  findingStrengths: number[],
  potentialGap: number,
  tariffAmount: number,
): number {
  if (findingStrengths.length === 0) return 0;
  const strongestSignal = Math.max(...findingStrengths);
  const tariffGapRatio =
    tariffAmount > 0 ? Math.min(potentialGap / tariffAmount, 1) : 0;
  const priorityScore =
    STRONGEST_SIGNAL_WEIGHT * strongestSignal +
    TARIFF_GAP_WEIGHT * tariffGapRatio;
  return Number(priorityScore.toFixed(SCORE_DECIMALS));
}
