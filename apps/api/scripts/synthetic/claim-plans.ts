/**
 * Deterministic claim skeletons (no LLM, no randomness): patients, dates,
 * diagnoses, tariffs, and document timestamps derived from claim indexes.
 */
import type { DatasetClaim, DatasetPatient } from './dataset.schema';
import {
  DISEASES,
  FACILITIES,
  SCENARIOS,
  type ScenarioSpec,
} from './scenarios';

const YEAR = 2026;
const SEPTEMBER_INDEX = 8;
const TIME_ZONE_OFFSET = '+07:00';
const MAX_DAILY_NOTES = 3;
const SEVERITY_ROMAN = ['I', 'II', 'III'] as const;

export interface DocumentSlots {
  examNote: string;
  prescription: string;
  procedure: string | null;
  /** One per day between admission and discharge, capped at three. */
  dailyNotes: string[];
  medicalResume: string;
}

export interface ClaimPlan {
  claim: Omit<DatasetClaim, 'documents'>;
  patient: DatasetPatient;
  age: number;
  lengthOfStayDays: number;
  scenario: ScenarioSpec;
  /** Index within its scenario, used for per-scenario variations. */
  scenarioIndex: number;
  slots: DocumentSlots;
}

function septemberDate(day: number, addDays = 0): string {
  return new Date(Date.UTC(YEAR, SEPTEMBER_INDEX, day + addDays))
    .toISOString()
    .slice(0, 10);
}

function localTimestamp(dateOnly: string, time: string): string {
  return `${dateOnly}T${time}:00${TIME_ZONE_OFFSET}`;
}

function padNumber(value: number): string {
  return String(value).padStart(4, '0');
}

function buildPatient(
  claimIndex: number,
  age: number,
  admissionDay: number,
): DatasetPatient {
  const birthMonth = 1 + ((claimIndex * 5) % 12);
  const birthDay = 1 + ((claimIndex * 11) % 28);
  const hadBirthdayByAdmission =
    birthMonth < SEPTEMBER_INDEX + 1 ||
    (birthMonth === SEPTEMBER_INDEX + 1 && birthDay <= admissionDay);
  const birthYear = YEAR - age - (hadBirthdayByAdmission ? 0 : 1);
  const sequence = padNumber(claimIndex + 1);
  return {
    medicalRecordNo: `RM-SIM-${sequence}`,
    name: `Pasien Sintetis ${sequence}`,
    gender: claimIndex % 2 === 0 ? 'M' : 'F',
    birthDate: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
  };
}

function buildSlots(
  scenario: ScenarioSpec,
  scenarioIndex: number,
  admittedAt: string,
  dischargedAt: string,
  lengthOfStayDays: number,
): DocumentSlots {
  const admissionDay = Number(admittedAt.slice(8, 10));
  const examNoteBeforeAdmission =
    scenarioIndex < (scenario.examNoteBeforeAdmissionCount ?? 0);
  const examDay = septemberDate(admissionDay, examNoteBeforeAdmission ? -1 : 0);
  // Daily notes stop the day before discharge so none falls within 24 hours of the resume.
  const dailyNoteCount = Math.min(lengthOfStayDays - 1, MAX_DAILY_NOTES);
  return {
    examNote: localTimestamp(examDay, '09:00'),
    prescription: localTimestamp(admittedAt, '11:00'),
    procedure: DISEASES[scenario.disease].procedure
      ? localTimestamp(admittedAt, '13:00')
      : null,
    dailyNotes: Array.from({ length: dailyNoteCount }, (_, dayIndex) =>
      localTimestamp(septemberDate(admissionDay, dayIndex + 1), '08:00'),
    ),
    medicalResume: localTimestamp(dischargedAt, '10:00'),
  };
}

export function buildClaimPlans(
  findTariff: (inacbgGroupCode: string, severityLevel: number) => number | null,
): ClaimPlan[] {
  const plans: ClaimPlan[] = [];
  let rotatingFacilityIndex = 0;

  for (const scenario of SCENARIOS) {
    const disease = DISEASES[scenario.disease];
    for (
      let scenarioIndex = 0;
      scenarioIndex < scenario.count;
      scenarioIndex++
    ) {
      const claimIndex = plans.length;
      const admissionDay = 1 + ((claimIndex * 7) % 25);
      const lengthOfStayDays = 3 + (claimIndex % 3);
      const age = 18 + ((claimIndex * 23) % 53);
      const admittedAt = septemberDate(admissionDay);
      const dischargedAt = septemberDate(admissionDay, lengthOfStayDays);
      const severityLevel = scenario.secondaryDiagnosis
        ? 3
        : 1 + (claimIndex % 2);
      const tariffAmount = findTariff(disease.inacbgGroupCode, severityLevel);
      if (tariffAmount === null) {
        throw new Error(
          `No synthetic tariff for ${disease.inacbgGroupCode} severity ${severityLevel}`,
        );
      }
      const facilityCode =
        scenario.facilityCode ??
        FACILITIES[rotatingFacilityIndex++ % FACILITIES.length].code;
      const patient = buildPatient(claimIndex, age, admissionDay);

      plans.push({
        claim: {
          claimNo: `KLM-${YEAR}-09-${padNumber(claimIndex + 1)}`,
          scenario: scenario.name,
          facilityCode,
          medicalRecordNo: patient.medicalRecordNo,
          admittedAt,
          dischargedAt,
          inacbgCode: `${disease.inacbgGroupCode}-${SEVERITY_ROMAN[severityLevel - 1]}`,
          severityLevel,
          tariffAmount,
          injectedCase: [...scenario.injectedCase],
          diagnoses: [
            { ...disease.primaryDiagnosis, isPrimary: true },
            ...(scenario.secondaryDiagnosis
              ? [{ ...scenario.secondaryDiagnosis, isPrimary: false }]
              : []),
          ],
        },
        patient,
        age,
        lengthOfStayDays,
        scenario,
        scenarioIndex,
        slots: buildSlots(
          scenario,
          scenarioIndex,
          admittedAt,
          dischargedAt,
          lengthOfStayDays,
        ),
      });
    }
  }

  return plans;
}
