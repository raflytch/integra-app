import type { ClaimStatus } from './claim-detail';

// Permenkes 26/2021 Lampiran Bab II: severity INA-CBG naik karena diagnosis sekunder (komorbiditas/komplikasi).
// Permenkes 16/2019 Lampiran Bab II dan IV: memanipulasi diagnosis untuk menaikkan klaim adalah kecurangan di FKRTL,
// dideteksi dini lewat analisis data klaim, dan hasilnya berupa dugaan yang diteruskan untuk diselesaikan.
// Prakosa dan Rokhman (2021), IJCCS 15(4) hlm. 397-399: data klaim BPJS dianggap anomali bila residual > 2 x RMSE.
export const ANOMALY_RMSE_MULTIPLIER = 2;

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
  meanRate: number;
  anomalyThreshold: number;
  comparedFacilityCount: number;
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

function secondaryRate(codingRate: FacilityCodingRate): number {
  return codingRate.secondaryCaseCount / codingRate.caseCount;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function findCodingOutliers(
  codingRates: FacilityCodingRate[],
): Map<string, CodingOutlier> {
  const ratesByDiagnosis = new Map<string, FacilityCodingRate[]>();
  for (const codingRate of codingRates) {
    ratesByDiagnosis.set(codingRate.primaryIcd10Code, [
      ...(ratesByDiagnosis.get(codingRate.primaryIcd10Code) ?? []),
      codingRate,
    ]);
  }

  const outliers = new Map<string, CodingOutlier>();
  for (const [primaryIcd10Code, diagnosisRates] of ratesByDiagnosis) {
    const rates = diagnosisRates.map(secondaryRate);
    const meanRate = average(rates);
    const rootMeanSquareError = Math.sqrt(
      average(rates.map((rate) => (rate - meanRate) ** 2)),
    );
    const allowedResidual = ANOMALY_RMSE_MULTIPLIER * rootMeanSquareError;
    for (const codingRate of diagnosisRates) {
      const facilityRate = secondaryRate(codingRate);
      if (facilityRate - meanRate <= allowedResidual) continue;
      outliers.set(codingOutlierKey(codingRate.facilityId, primaryIcd10Code), {
        primaryIcd10Code,
        facilityCaseCount: codingRate.caseCount,
        facilityRate,
        meanRate,
        anomalyThreshold: meanRate + allowedResidual,
        comparedFacilityCount: diagnosisRates.length,
      });
    }
  }
  return outliers;
}
