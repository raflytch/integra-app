import type { Decision } from '../../domain/decisions/decision';

export function presentDecision(decision: Decision) {
  return {
    ...decision,
    createdAt: decision.createdAt.toISOString(),
    missingDocuments: decision.missingDocuments.map((missingDocument) => ({
      ...missingDocument,
      receivedAt: missingDocument.receivedAt?.toISOString() ?? null,
    })),
  };
}

export type DecisionResponse = ReturnType<typeof presentDecision>;
