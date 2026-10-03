import type { TestType } from '../../../../domain/claims/claim-detail';

export function countFindingsByTestType(
  findings: { testType: TestType }[],
): Record<TestType, number> {
  const findingCounts = { EXISTENCE: 0, CONSISTENCY: 0, SIMILARITY: 0 };
  findings.forEach(({ testType }) => findingCounts[testType]++);
  return findingCounts;
}
