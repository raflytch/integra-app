import type { CareType } from './claim-detail';

const CASE_GROUP_PATTERN = /^[A-Z]{1,2}-(\d)-/;
const CARE_TYPE_BY_CASE_GROUP: Readonly<Record<string, CareType>> = {
  '1': 'INPATIENT',
  '2': 'OUTPATIENT',
  '3': 'OUTPATIENT',
  '4': 'INPATIENT',
  '5': 'OUTPATIENT',
  '6': 'INPATIENT',
  '7': 'OUTPATIENT',
  '8': 'INPATIENT',
  '9': 'OUTPATIENT',
};

export function careTypeOfInacbgCode(inacbgCode: string): CareType | null {
  const caseGroup = CASE_GROUP_PATTERN.exec(inacbgCode)?.[1];
  return caseGroup ? (CARE_TYPE_BY_CASE_GROUP[caseGroup] ?? null) : null;
}
