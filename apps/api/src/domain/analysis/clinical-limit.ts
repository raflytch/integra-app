import type { EvidenceType } from '../claims/claim-detail';
import type { ClaimEvidenceDocument } from './claim-evidence';
import { toCanonicalTerm } from './clinical-vocabulary';

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
  evidenceTypes: readonly EvidenceType[];
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

// KMK HK.01.07/MENKES/303/2026 PNPK Hipertensi Dewasa hlm. 9: hipertensi = sistolik ≥ 140 mmHg dan/atau diastolik ≥ 90 mmHg.
const SYSTOLIC_HYPERTENSION: ClinicalLimit = {
  vitalSignNames: BLOOD_PRESSURE_NAMES,
  description: 'TD sistolik ≥ 140 mmHg',
  measure: (value) => bloodPressure(value)?.systolic ?? null,
  isMet: (systolic) => systolic >= 140,
};

const DIASTOLIC_HYPERTENSION: ClinicalLimit = {
  vitalSignNames: BLOOD_PRESSURE_NAMES,
  description: 'TD diastolik ≥ 90 mmHg',
  measure: (value) => bloodPressure(value)?.diastolic ?? null,
  isMet: (diastolic) => diastolic >= 90,
};

export const CLINICAL_LIMITS: Readonly<Record<string, ClinicalLimit>> = {
  hipotensi: HYPOTENSION,
  desaturasi: DESATURATION,
};

// KMK HK.01.07/MENKES/9845/2020 PNPK Infeksi Dengue Dewasa Bab III hlm. 23 dan 43: syok, termasuk syok terkompensasi dengan sistolik normal, ditegakkan dari tanda ini.
export const EVIDENCE_SIGN_GROUPS: Readonly<Record<string, EvidenceSignGroup>> =
  {
    'tanda syok': {
      evidenceTypes: ['FINDING', 'VITAL_SIGN'],
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
    // KMK HK.01.07/MENKES/481/2019 PNPK Tata Laksana Nyeri hlm. 28: anamnesis nyeri sebagai keluhan utama beserta lokasinya.
    'nyeri punggung': {
      evidenceTypes: ['FINDING'],
      terms: [
        'nyeri punggung',
        'nyeri pinggang',
        'nyeri tulang belakang',
        'low back pain',
        'back pain',
        'dorsalgia',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/481/2019 PNPK Tata Laksana Nyeri hlm. 6, 28, 30-31: intensitas nyeri dinilai dengan skala (NRS, VAS, VRS).
    'skala nyeri': {
      evidenceTypes: ['FINDING', 'VITAL_SIGN'],
      terms: [
        'skala nyeri',
        'numeric rating',
        'nrs',
        'visual analog',
        'verbal rating',
        'vrs',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/481/2019 PNPK Tata Laksana Nyeri hlm. 40, 42, 110: analgesia, manipulasi tulang belakang, atau latihan.
    'tata laksana nyeri': {
      evidenceTypes: ['MEDICATION', 'PROCEDURE'],
      terms: [
        'parasetamol',
        'paracetamol',
        'asetaminofen',
        'metamizol',
        'ibuprofen',
        'ketoprofen',
        'piroxicam',
        'meloxicam',
        'ketorolac',
        'diclofenac',
        'parecoxib',
        'celecoxib',
        'kodein',
        'codeine',
        'codein',
        'tramadol',
        'morfin',
        'morphine',
        'fentanyl',
        'petidin',
        'pethidin',
        'hidromorfon',
        'hydromorphone',
        'oksikodon',
        'oxycodone',
        'manipulasi',
        'latihan',
        'manipulation',
        'exercise',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/303/2026 PNPK Hipertensi Dewasa hlm. 9: hipertensi tertulis atau terukur.
    hipertensi: {
      evidenceTypes: ['FINDING', 'VITAL_SIGN'],
      terms: ['hipertensi'],
      limits: [SYSTOLIC_HYPERTENSION, DIASTOLIC_HYPERTENSION],
    },
    // KMK HK.01.07/MENKES/4801/2021 PNPK Gagal Jantung hlm. 11 Tabel 3: gejala khas gagal jantung.
    'gejala gagal jantung': {
      evidenceTypes: ['FINDING'],
      terms: ['sesak', 'kelelahan', 'cepat lelah', 'edema tungkai'],
      limits: [],
    },
    // KMK HK.01.07/MENKES/4801/2021 PNPK Gagal Jantung hlm. 11 Tabel 3: tanda khas gagal jantung.
    'tanda gagal jantung': {
      evidenceTypes: ['FINDING', 'VITAL_SIGN'],
      terms: [
        'takikardi',
        'takipne',
        'ronki',
        'efusi pleura',
        'vena jugularis',
        'jvp',
        'edema',
        'hepatomegali',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/4801/2021 PNPK Gagal Jantung hlm. 11 Tabel 3: bukti objektif gangguan struktur atau fungsi jantung.
    'bukti objektif gagal jantung': {
      evidenceTypes: ['FINDING', 'PROCEDURE'],
      terms: [
        'kardiomegali',
        'suara jantung tiga',
        'gallop',
        'murmur',
        'ekokardiografi',
        'fraksi ejeksi',
        'bnp',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/303/2026 PNPK Hipertensi Dewasa hlm. 35-36 Tabel 19: obat antihipertensi oral.
    'obat antihipertensi': {
      evidenceTypes: ['MEDICATION'],
      terms: [
        'hidroklorotiazid',
        'hydrochlorothiazide',
        'indapamid',
        'captopril',
        'kaptopril',
        'enalapril',
        'lisinopril',
        'perindopril',
        'ramipril',
        'imidapril',
        'sartan',
        'amlodipin',
        'felodipin',
        'nifedipin',
        'lercanidipin',
        'diltiazem',
        'verapamil',
        'furosemid',
        'torsemid',
        'amilorid',
        'triamteren',
        'eplerenon',
        'spironolakton',
        'spironolactone',
        'atenolol',
        'bisoprolol',
        'metoprolol',
        'nebivolol',
        'propranolol',
        'propanolol',
        'carvedilol',
        'karvedilol',
        'terazosin',
        'doksazosin',
        'doxazosin',
        'klonidin',
        'clonidin',
        'metildopa',
        'methyldopa',
        'hidralazin',
        'hydralazin',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/875/2026 PNPK Demam Tifoid Dewasa hlm. 10-11: demam disertai gangguan saluran cerna.
    'gangguan saluran cerna': {
      evidenceTypes: ['FINDING'],
      terms: [
        'mual',
        'muntah',
        'nyeri perut',
        'sakit perut',
        'diare',
        'konstipasi',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/875/2026 PNPK Demam Tifoid Dewasa hlm. 11: kasus terkonfirmasi dengan kultur atau serologi.
    'pemeriksaan tifoid': {
      evidenceTypes: ['FINDING', 'PROCEDURE'],
      terms: [
        'kultur',
        'culture',
        'widal',
        'tubex',
        'eia',
        'igm',
        'rapid antigen',
        'salmonella',
      ],
      limits: [],
    },
    // KMK HK.01.07/MENKES/875/2026 PNPK Demam Tifoid Dewasa hlm. 26-27, 36-38: antibiotik tifoid.
    'antibiotik tifoid': {
      evidenceTypes: ['MEDICATION'],
      terms: [
        'kloramfenikol',
        'chloramphenicol',
        'tiamfenikol',
        'thiamphenicol',
        'ampisilin',
        'ampicillin',
        'amoksisilin',
        'amoxicillin',
        'kotrimoksazol',
        'cotrimoxazole',
        'sefiksim',
        'cefixime',
        'seftriakson',
        'ceftriaxone',
        'siprofloksasin',
        'ciprofloxacin',
        'levofloksasin',
        'levofloxacin',
        'azitromisin',
        'azithromycin',
      ],
      limits: [],
    },
  };

export function measureVitalSign(
  documents: ClaimEvidenceDocument[],
  limit: ClinicalLimit,
): VitalMeasurement[] {
  return documents.flatMap(({ id, extracted }) =>
    (extracted?.vitalSigns ?? []).flatMap((vital) => {
      const vitalNames = [
        vital.name.toLowerCase().trim(),
        toCanonicalTerm(vital.name),
      ];
      if (
        !limit.vitalSignNames.some((name) =>
          vitalNames.some((vitalName) => vitalName.includes(name)),
        )
      ) {
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
