import type { ClaimEvidenceDocument } from './claim-evidence';

export interface ClinicalLimit {
  vitalSignNames: readonly string[];
  description: string;
  measure: (value: string) => number | null;
  isMet: (measured: number) => boolean;
}

export interface VitalMeasurement {
  documentId: string;
  quote: string;
  value: number;
  isMet: boolean;
}

export interface EvidenceSignGroup {
  terms: readonly string[];
  limits: readonly ClinicalLimit[];
}

const LEADING_NUMBER_PATTERN = /(\d{2,3}(?:[.,]\d+)?)/;
const BLOOD_PRESSURE_PATTERN = /(\d{2,3})\s*\/\s*(\d{2,3})/;
const BLOOD_PRESSURE_NAMES = ['tekanan darah', 'td'];

function leadingNumber(value: string): number | null {
  const match = value.match(LEADING_NUMBER_PATTERN);
  return match ? Number(match[1].replace(',', '.')) : null;
}

function bloodPressure(
  value: string,
): { systolic: number; diastolic: number } | null {
  const match = value.match(BLOOD_PRESSURE_PATTERN);
  return match
    ? { systolic: Number(match[1]), diastolic: Number(match[2]) }
    : null;
}

// KMK HK.01.07/MENKES/9845/2020 PNPK Infeksi Dengue Dewasa Bab III hlm. 23: hipotensi = sistolik 80 sampai 90 mmHg pada dewasa.
const HYPOTENSION: ClinicalLimit = {
  vitalSignNames: BLOOD_PRESSURE_NAMES,
  description: 'TD sistolik ≤ 90 mmHg',
  measure: (value) => bloodPressure(value)?.systolic ?? null,
  isMet: (systolic) => systolic <= 90,
};

// KMK HK.01.07/MENKES/9845/2020 PNPK Infeksi Dengue Dewasa Bab III hlm. 23: tanda syok tekanan nadi ≤ 20 mmHg.
const NARROW_PULSE_PRESSURE: ClinicalLimit = {
  vitalSignNames: BLOOD_PRESSURE_NAMES,
  description: 'tekanan nadi ≤ 20 mmHg',
  measure: (value) => {
    const measured = bloodPressure(value);
    return measured ? measured.systolic - measured.diastolic : null;
  },
  isMet: (pulsePressure) => pulsePressure <= 20,
};

// KMK HK.01.07/MENKES/1541/2022 PNPK Anestesiologi dan Terapi Intensif hlm. 72: hipoksemia = PaO2 < 60 mmHg, SaO2 < 90%.
const DESATURATION: ClinicalLimit = {
  vitalSignNames: ['saturasi oksigen', 'saturasi', 'spo2', 'sao2'],
  description: 'SpO2 < 90%',
  measure: leadingNumber,
  isMet: (saturation) => saturation < 90,
};

export const CLINICAL_LIMITS: Readonly<Record<string, ClinicalLimit>> = {
  hipotensi: HYPOTENSION,
  desaturasi: DESATURATION,
};

// KMK HK.01.07/MENKES/9845/2020 PNPK Infeksi Dengue Dewasa Bab III hlm. 23 dan 43: syok, termasuk syok terkompensasi dengan sistolik normal, ditegakkan dari tanda ini.
export const EVIDENCE_SIGN_GROUPS: Readonly<Record<string, EvidenceSignGroup>> =
  {
    'tanda syok': {
      terms: [
        'akral dingin',
        'takikardi',
        'nadi lemah',
        'pengisian kapiler',
        'crt',
        'hipotensi',
      ],
      limits: [HYPOTENSION, NARROW_PULSE_PRESSURE],
    },
  };

export function measureVitalSign(
  documents: ClaimEvidenceDocument[],
  limit: ClinicalLimit,
): VitalMeasurement[] {
  return documents.flatMap(({ id, extracted }) =>
    (extracted?.vitalSigns ?? []).flatMap((vital) => {
      const vitalName = vital.name.toLowerCase().trim();
      if (!limit.vitalSignNames.some((name) => vitalName.includes(name))) {
        return [];
      }
      const value = limit.measure(vital.value);
      if (value === null) return [];
      return [
        {
          documentId: id,
          quote: vital.quote,
          value,
          isMet: limit.isMet(value),
        },
      ];
    }),
  );
}
