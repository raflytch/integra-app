import type { ClaimStatus } from './claim-detail';

export const CODING_OUTLIER_PERCENTILE = 0.8;
export const MIN_FACILITY_CASE_COUNT = 5;
export const MIN_COMPARED_FACILITY_COUNT = 5;

export interface FacilityCodingRate {
  facilityId: string;
  primaryIcd10Code: string;
  caseCount: number;
  secondaryCaseCount: number;
}

export interface CodingOutlier {
  primaryIcd10Code: string;
  facilityCaseCount: number;
  facilityRate: number;
  percentileThreshold: number;
  peerMedianRate: number;
  comparedFacilityCount: number;
  minFacilityCaseCount: number;
}

export interface SimilarPatternClaim {
  id: string;
  claimNo: string;
  admittedAt: Date;
  status: ClaimStatus;
}

export interface SimilarPattern extends CodingOutlier {
  claims: SimilarPatternClaim[];
}

export function codingOutlierKey(
  facilityId: string,
  primaryIcd10Code: string,
): string {
  return `${facilityId}|${primaryIcd10Code}`;
}

function percentile(sortedValues: number[], ratio: number): number {
  const position = (sortedValues.length - 1) * ratio;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  return (
    sortedValues[lowerIndex] +
    (sortedValues[upperIndex] - sortedValues[lowerIndex]) *
      (position - lowerIndex)
  );
}

function secondaryRate(codingRate: FacilityCodingRate): number {
  return codingRate.secondaryCaseCount / codingRate.caseCount;
}

export function findCodingOutliers(
  codingRates: FacilityCodingRate[],
): Map<string, CodingOutlier> {
  const ratesByDiagnosis = new Map<string, FacilityCodingRate[]>();
  for (const codingRate of codingRates) {
    if (codingRate.caseCount < MIN_FACILITY_CASE_COUNT) continue;
    ratesByDiagnosis.set(codingRate.primaryIcd10Code, [
      ...(ratesByDiagnosis.get(codingRate.primaryIcd10Code) ?? []),
      codingRate,
    ]);
  }

  const outliers = new Map<string, CodingOutlier>();
  for (const [primaryIcd10Code, diagnosisRates] of ratesByDiagnosis) {
    if (diagnosisRates.length < MIN_COMPARED_FACILITY_COUNT) continue;
    const sortedRates = diagnosisRates
      .map(secondaryRate)
      .sort((first, second) => first - second);
    const percentileThreshold = percentile(
      sortedRates,
      CODING_OUTLIER_PERCENTILE,
    );
    for (const codingRate of diagnosisRates) {
      const facilityRate = secondaryRate(codingRate);
      if (codingRate.secondaryCaseCount === 0) continue;
      if (facilityRate < percentileThreshold) continue;
      const peerRates = diagnosisRates
        .filter((peer) => peer.facilityId !== codingRate.facilityId)
        .map(secondaryRate)
        .sort((first, second) => first - second);
      outliers.set(codingOutlierKey(codingRate.facilityId, primaryIcd10Code), {
        primaryIcd10Code,
        facilityCaseCount: codingRate.caseCount,
        facilityRate,
        percentileThreshold,
        peerMedianRate: percentile(peerRates, 0.5),
        comparedFacilityCount: diagnosisRates.length,
        minFacilityCaseCount: MIN_FACILITY_CASE_COUNT,
      });
    }
  }
  return outliers;
}
