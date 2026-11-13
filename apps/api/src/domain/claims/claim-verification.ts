import type { DecisionAction } from '../decisions/decision';
import type { TestType } from './claim-detail';

export const APPROVE_MIN_SCORE = 0.8;
export const CLARIFICATION_MIN_SCORE = 0.5;
const SCORE_DECIMALS = 2;

export interface ClaimVerification {
  score: number;
  recommendation: DecisionAction;
  reason: string;
}

interface VerifiedFinding {
  testType: TestType;
  strength: number;
  summary: string;
}

export function assessClaim(
  findings: VerifiedFinding[],
  analyzedAt: Date | null,
): ClaimVerification | null {
  if (!analyzedAt) return null;
  const strongestFinding = findings.reduce<VerifiedFinding | null>(
    (strongest, finding) =>
      !strongest || finding.strength > strongest.strength ? finding : strongest,
    null,
  );
  const score = Number(
    (1 - (strongestFinding?.strength ?? 0)).toFixed(SCORE_DECIMALS),
  );
  const hasCopiedDocument = findings.some(
    (finding) => finding.testType === 'SIMILARITY',
  );
  const recommendation: DecisionAction = hasCopiedDocument
    ? 'ESCALATE'
    : score >= APPROVE_MIN_SCORE
      ? 'APPROVE'
      : score >= CLARIFICATION_MIN_SCORE
        ? 'REQUEST_CLARIFICATION'
        : 'ESCALATE';
  return {
    score,
    recommendation,
    reason:
      strongestFinding?.summary ??
      'Semua uji lolos: tidak ada bukti yang kurang, tidak konsisten, atau tersalin.',
  };
}
