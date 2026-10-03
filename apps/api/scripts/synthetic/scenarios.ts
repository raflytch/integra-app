/**
 * Specification of the synthetic inpatient dataset (M-02). Everything here is
 * fictional: facilities, patients, and tariffs are invented for the demo.
 */
import type { InjectedCase } from './dataset.schema';

export type DiseaseKey = 'DBD' | 'PNEUMONIA' | 'GASTROENTERITIS';

export type ScenarioName =
  | 'NORMAL_DBD'
  | 'NORMAL_PNEUMONIA'
  | 'NORMAL_GE'
  | 'GENUINE_SHOCK'
  | 'GENUINE_RESP_FAILURE'
  | 'UC1_UPCODING'
  | 'UC2_EXAM_MANIPULATION'
  | 'MULTI_UPCODING_EXAM'
  | 'UC3_CLONING'
  | 'UC4_FLAGGED_BUT_VALID';

/** Which generated documents a content rule inspects. */
export type RuleTarget =
  | 'ALL'
  | 'EXAM_NOTE'
  | 'DAILY_NOTES'
  | 'FIRST_DAILY_NOTE'
  | 'PRESCRIPTION'
  | 'PROCEDURE'
  | 'MEDICAL_RESUME';

/**
 * Lowercase substring checks over the target documents combined:
 * every `mustContain` term appears somewhere, no `mustNotContain` term appears anywhere.
 */
export interface ContentRule {
  target: RuleTarget;
  mustContain?: readonly string[];
  mustNotContain?: readonly string[];
}

export interface DiseaseSpec {
  label: string;
  primaryDiagnosis: { icd10Code: string; name: string };
  inacbgGroupCode: string;
  /** Procedure note written on admission day, or null when the disease has none. */
  procedure: string | null;
  /** Indonesian clinical outline given to the LLM. */
  clinicalOutline: string;
}

export interface ScenarioSpec {
  name: ScenarioName;
  count: number;
  disease: DiseaseKey;
  secondaryDiagnosis: { icd10Code: string; name: string } | null;
  injectedCase: InjectedCase[];
  /** Fixed facility; otherwise claims rotate across every facility. */
  facilityCode?: string;
  /** The first N claims of the scenario get an exam note dated the day before admission. */
  examNoteBeforeAdmissionCount?: number;
  /** Indonesian instructions describing what the documents must show. */
  narrative: readonly string[];
  rules: readonly ContentRule[];
}

export const FACILITIES = [
  {
    code: 'RS-SIM-001',
    name: 'RS Sintetis Nusantara Utama',
    type: 'A',
    city: 'Kota Simulasi Barat',
  },
  {
    code: 'RS-SIM-002',
    name: 'RS Sintetis Harapan Sejahtera',
    type: 'B',
    city: 'Kota Simulasi Timur',
  },
  {
    code: 'RS-SIM-003',
    name: 'RS Sintetis Bakti Medika',
    type: 'C',
    city: 'Kota Simulasi Selatan',
  },
  {
    code: 'RS-SIM-004',
    name: 'RS Sintetis Pratama Sehat',
    type: 'D',
    city: 'Kota Simulasi Utara',
  },
] as const;

export const CLONING_FACILITY_CODE = 'RS-SIM-003';

export const DISEASES: Readonly<Record<DiseaseKey, DiseaseSpec>> = {
  DBD: {
    label: 'Demam berdarah dengue',
    primaryDiagnosis: { icd10Code: 'A91', name: 'Demam berdarah dengue' },
    inacbgGroupCode: 'A-4-14',
    procedure: 'pemeriksaan hematokrit serial',
    clinicalOutline:
      'Demam tinggi beberapa hari, petekie, trombosit menurun, terapi cairan infus dan parasetamol, pemantauan hematokrit.',
  },
  PNEUMONIA: {
    label: 'Pneumonia',
    primaryDiagnosis: { icd10Code: 'J18.9', name: 'Pneumonia' },
    inacbgGroupCode: 'J-4-16',
    procedure: 'foto toraks',
    clinicalOutline:
      'Demam, batuk berdahak, ronki pada auskultasi, antibiotik seftriakson intravena, foto toraks menunjukkan infiltrat.',
  },
  GASTROENTERITIS: {
    label: 'Gastroenteritis akut',
    primaryDiagnosis: { icd10Code: 'A09', name: 'Gastroenteritis akut' },
    inacbgGroupCode: 'K-4-17',
    procedure: null,
    clinicalOutline:
      'Diare cair berulang, muntah, nyeri perut, terapi oralit, zinc, ondansetron, dan infus cairan.',
  },
};

const SHOCK = { icd10Code: 'R57.9', name: 'Syok' };
const ACUTE_RESPIRATORY_FAILURE = {
  icd10Code: 'J96.0',
  name: 'Gagal napas akut',
};

/**
 * Explicit recovery phrases banned from the first daily note. Uji Konsisten
 * flags an exam finding negated by a daily note within 24 hours, so genuine
 * claims must improve gradually.
 */
const EARLY_RECOVERY_PHRASES = [
  'tidak sesak',
  'akral hangat',
  'tidak demam',
  'afebris',
  'bebas demam',
  'tidak muntah',
  'tidak diare',
  'tidak ada keluhan',
];

function earlyRecoveryPhrasesExcept(...allowed: string[]): string[] {
  return EARLY_RECOVERY_PHRASES.filter((phrase) => !allowed.includes(phrase));
}

const GRADUAL_RECOVERY_NARRATIVE =
  'Perbaikan klinis bertahap: catatan harian pertama masih menulis keluhan yang ada atau mulai berkurang; perbaikan seperti "sesak berkurang" atau "demam turun" baru mulai catatan harian kedua.';

/** Oxygen terms banned where a claim must show no oxygen therapy at all. */
const OXYGEN_THERAPY_TERMS = ['oksigen', 'kanul', 'lpm', 'liter/menit'];

export const SCENARIOS: readonly ScenarioSpec[] = [
  {
    name: 'NORMAL_DBD',
    count: 5,
    disease: 'DBD',
    secondaryDiagnosis: null,
    injectedCase: [],
    narrative: [
      'Dokumentasi lengkap dan konsisten antar dokumen.',
      'Tidak ada syok; tanda vital stabil.',
      GRADUAL_RECOVERY_NARRATIVE,
    ],
    rules: [
      { target: 'ALL', mustNotContain: ['syok', 'renjatan'] },
      { target: 'FIRST_DAILY_NOTE', mustNotContain: EARLY_RECOVERY_PHRASES },
    ],
  },
  {
    name: 'NORMAL_PNEUMONIA',
    count: 5,
    disease: 'PNEUMONIA',
    secondaryDiagnosis: null,
    injectedCase: [],
    narrative: [
      'Dokumentasi lengkap dan konsisten antar dokumen.',
      'Pasien sesak napas ringan dan mendapat oksigen nasal kanul sejak hari masuk; tulis kata "oksigen".',
      'Tidak ada gagal napas.',
      GRADUAL_RECOVERY_NARRATIVE,
    ],
    rules: [
      {
        target: 'ALL',
        mustContain: ['oksigen'],
        mustNotContain: ['gagal napas'],
      },
      { target: 'FIRST_DAILY_NOTE', mustNotContain: EARLY_RECOVERY_PHRASES },
    ],
  },
  {
    name: 'NORMAL_GE',
    count: 4,
    disease: 'GASTROENTERITIS',
    secondaryDiagnosis: null,
    injectedCase: [],
    narrative: [
      'Dokumentasi lengkap dan konsisten antar dokumen.',
      'Tidak ada syok dan tidak ada sesak napas.',
      GRADUAL_RECOVERY_NARRATIVE,
    ],
    rules: [
      { target: 'ALL', mustNotContain: ['syok', 'renjatan'] },
      { target: 'FIRST_DAILY_NOTE', mustNotContain: EARLY_RECOVERY_PHRASES },
    ],
  },
  {
    name: 'GENUINE_SHOCK',
    count: 2,
    disease: 'DBD',
    secondaryDiagnosis: SHOCK,
    injectedCase: [],
    narrative: [
      'Pasien jatuh ke syok saat masuk dan bukti klinisnya lengkap.',
      'Tulis persis: "hipotensi" disertai angka TD (misalnya "hipotensi (TD 80/50 mmHg)"), "akral dingin", dan "resusitasi cairan" dengan ringer laktat.',
      'Akral dingin masih tercatat di catatan harian pertama; akral hangat baru boleh ditulis mulai catatan harian kedua.',
      GRADUAL_RECOVERY_NARRATIVE,
    ],
    rules: [
      {
        target: 'ALL',
        mustContain: ['resusitasi cairan', 'akral dingin', 'hipotensi'],
      },
      { target: 'FIRST_DAILY_NOTE', mustNotContain: EARLY_RECOVERY_PHRASES },
    ],
  },
  {
    name: 'GENUINE_RESP_FAILURE',
    count: 2,
    disease: 'PNEUMONIA',
    secondaryDiagnosis: ACUTE_RESPIRATORY_FAILURE,
    injectedCase: [],
    narrative: [
      'Pneumonia berat dengan gagal napas akut dan bukti klinisnya lengkap.',
      'Tulis persis: "sesak napas", "desaturasi" disertai angka (misalnya "desaturasi, SpO2 86%"), dan pemberian "oksigen".',
      'Sesak napas masih tercatat di catatan harian pertama.',
      GRADUAL_RECOVERY_NARRATIVE,
    ],
    rules: [
      {
        target: 'ALL',
        mustContain: ['oksigen', 'sesak napas', 'desaturasi'],
      },
      { target: 'FIRST_DAILY_NOTE', mustNotContain: EARLY_RECOVERY_PHRASES },
    ],
  },
  {
    name: 'UC1_UPCODING',
    count: 4,
    disease: 'DBD',
    secondaryDiagnosis: SHOCK,
    injectedCase: ['UPCODING'],
    narrative: [
      'Resume medis menulis diagnosis tambahan syok.',
      'Tidak ada dokumen yang menulis resusitasi cairan, akral dingin, atau hipotensi.',
      'Catatan harian menulis akral hangat dan tekanan darah normal (misalnya "TD 110/70 mmHg"); catatan harian tidak menyebut kata syok.',
      'Infus cairan rumatan biasa boleh ditulis, tetapi tanpa kata resusitasi.',
    ],
    rules: [
      { target: 'MEDICAL_RESUME', mustContain: ['syok'] },
      {
        target: 'ALL',
        mustNotContain: ['resusitasi', 'akral dingin', 'hipotensi'],
      },
      {
        target: 'DAILY_NOTES',
        mustContain: ['akral hangat'],
        mustNotContain: ['syok'],
      },
      {
        target: 'FIRST_DAILY_NOTE',
        mustNotContain: earlyRecoveryPhrasesExcept('akral hangat'),
      },
    ],
  },
  {
    name: 'UC2_EXAM_MANIPULATION',
    count: 4,
    disease: 'PNEUMONIA',
    secondaryDiagnosis: null,
    injectedCase: ['EXAM_MANIPULATION'],
    examNoteBeforeAdmissionCount: 1,
    narrative: [
      'Catatan pemeriksaan menulis persis "sesak napas berat, ronki basah".',
      'Catatan harian pertama menulis persis "pasien tidak sesak".',
      'Tidak ada pemberian oksigen di dokumen mana pun (jangan menulis oksigen, nasal kanul, atau liter per menit).',
      'Tidak ada gagal napas atau desaturasi.',
    ],
    rules: [
      {
        target: 'EXAM_NOTE',
        mustContain: ['sesak napas berat', 'ronki basah'],
      },
      {
        target: 'FIRST_DAILY_NOTE',
        mustContain: ['pasien tidak sesak'],
        mustNotContain: earlyRecoveryPhrasesExcept('tidak sesak'),
      },
      {
        target: 'ALL',
        mustNotContain: [...OXYGEN_THERAPY_TERMS, 'gagal napas', 'desaturasi'],
      },
    ],
  },
  {
    name: 'MULTI_UPCODING_EXAM',
    count: 2,
    disease: 'PNEUMONIA',
    secondaryDiagnosis: ACUTE_RESPIRATORY_FAILURE,
    injectedCase: ['UPCODING', 'EXAM_MANIPULATION'],
    narrative: [
      'Resume medis menulis diagnosis tambahan gagal napas.',
      'Catatan pemeriksaan menulis "sesak napas".',
      'Catatan harian pertama menulis persis "pasien tidak sesak".',
      'Tidak ada pemberian oksigen dan tidak ada desaturasi di dokumen mana pun (jangan menulis oksigen, nasal kanul, atau liter per menit).',
    ],
    rules: [
      { target: 'MEDICAL_RESUME', mustContain: ['gagal napas'] },
      { target: 'EXAM_NOTE', mustContain: ['sesak napas'] },
      {
        target: 'FIRST_DAILY_NOTE',
        mustContain: ['pasien tidak sesak'],
        mustNotContain: earlyRecoveryPhrasesExcept('tidak sesak'),
      },
      {
        target: 'ALL',
        mustNotContain: [...OXYGEN_THERAPY_TERMS, 'desaturasi'],
      },
    ],
  },
  {
    // Documents come from one NORMAL_DBD base set; see the generator.
    name: 'UC3_CLONING',
    count: 12,
    disease: 'DBD',
    secondaryDiagnosis: null,
    injectedCase: ['CLONING'],
    facilityCode: CLONING_FACILITY_CODE,
    narrative: [],
    rules: [],
  },
  {
    name: 'UC4_FLAGGED_BUT_VALID',
    count: 2,
    disease: 'DBD',
    secondaryDiagnosis: SHOCK,
    injectedCase: [],
    narrative: [
      'Pasien memang syok, tetapi buktinya ditulis dalam format tidak baku.',
      'Tulis persis "akral dingin", "TD 85/50 mmHg" (tanpa kata hipotensi), dan "RL 20 cc/kgBB dalam 1 jam" (tanpa kata resusitasi).',
      'Akral dingin masih tercatat di catatan harian pertama; akral hangat baru boleh ditulis mulai catatan harian kedua.',
      GRADUAL_RECOVERY_NARRATIVE,
    ],
    rules: [
      {
        target: 'ALL',
        mustContain: [
          'akral dingin',
          'td 85/50 mmhg',
          'rl 20 cc/kgbb dalam 1 jam',
        ],
        mustNotContain: ['hipotensi', 'resusitasi'],
      },
      { target: 'FIRST_DAILY_NOTE', mustNotContain: EARLY_RECOVERY_PHRASES },
    ],
  },
];

/** Rules every generated claim must satisfy. */
export const GLOBAL_RULES: readonly ContentRule[] = [
  {
    target: 'ALL',
    // Dates live in document metadata, so cloned text stays valid for any admission date.
    mustNotContain: ['fraud', 'upcoding', 'sisipan', 'september'],
  },
];

/** Scenario whose rules and narrative produce the UC-3 base document set. */
export const CLONING_BASE_SCENARIO: ScenarioName = 'NORMAL_DBD';

/** Clinical evidence rules for secondary diagnoses, consumed by Uji Ada. */
export const EVIDENCE_RULES = [
  {
    icd10Code: 'R57.9',
    evidenceType: 'PROCEDURE',
    expected: 'resusitasi cairan',
    guidelineRef:
      'PNPK Tata Laksana Infeksi Dengue pada Dewasa (perlu diverifikasi tim)',
  },
  {
    icd10Code: 'R57.9',
    evidenceType: 'FINDING',
    expected: 'akral dingin',
    guidelineRef:
      'PNPK Tata Laksana Infeksi Dengue pada Dewasa (perlu diverifikasi tim)',
  },
  {
    icd10Code: 'R57.9',
    evidenceType: 'VITAL_SIGN',
    expected: 'hipotensi',
    guidelineRef:
      'PNPK Tata Laksana Infeksi Dengue pada Dewasa (perlu diverifikasi tim)',
  },
  {
    icd10Code: 'J96.0',
    evidenceType: 'MEDICATION',
    expected: 'oksigen',
    guidelineRef:
      'Pedoman Diagnosis dan Penatalaksanaan Pneumonia Komunitas PDPI (perlu diverifikasi tim)',
  },
  {
    icd10Code: 'J96.0',
    evidenceType: 'FINDING',
    expected: 'sesak napas',
    guidelineRef:
      'Pedoman Diagnosis dan Penatalaksanaan Pneumonia Komunitas PDPI (perlu diverifikasi tim)',
  },
  {
    icd10Code: 'J96.0',
    evidenceType: 'VITAL_SIGN',
    expected: 'desaturasi',
    guidelineRef:
      'Pedoman Diagnosis dan Penatalaksanaan Pneumonia Komunitas PDPI (perlu diverifikasi tim)',
  },
] as const;
