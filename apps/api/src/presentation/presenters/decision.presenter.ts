import type { Decision } from '../../domain/decisions/decision';

export function presentDecision(decision: Decision) {
  return { ...decision, createdAt: decision.createdAt.toISOString() };
}

export type DecisionResponse = ReturnType<typeof presentDecision>;
