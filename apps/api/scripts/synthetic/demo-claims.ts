/**
 * Deterministic, template-based raw demo claims. Generating them costs
 * nothing: documents are stored unextracted, without findings or decisions,
 * so the AI analysis and verifier decisions start from scratch in the app.
 * Everything is fictional.
 */
import { SyntheticTariffSchedule } from '../../src/infrastructure/tariffs/synthetic-tariff-schedule';
import type { InjectedCase } from './dataset.schema';
import { DISEASES, type DiseaseKey, FACILITIES } from './scenarios';

export const DEMO_CLAIM_NO_PREFIX = 'KLM-DEMO-';
export const DEMO_RECORD_NO_PREFIX = 'RM-DEMO-';

type FacilityType = 'A' | 'B' | 'C' | 'D';
type DocumentType =
  'MEDICAL_RESUME' | 'EXAM_NOTE' | 'DAILY_NOTE' | 'PRESCRIPTION' | 'PROCEDURE';

export interface DemoFacility {
  code: string;
  name: string;
  type: FacilityType;
  city: string;
}

export interface DemoPatient {
  medicalRecordNo: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: Date;
}

export interface DemoDocument {
  type: DocumentType;
  recordedAt: Date;
  content: string;
}

export interface DemoClaim {
  claimNo: string;
  profile: ClaimProfile;
  facilityCode: string;
  patient: DemoPatient;
  admittedAt: Date;
  dischargedAt: Date;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  injectedCase: InjectedCase[];
  diagnoses: { icd10Code: string; name: string; isPrimary: boolean }[];
  documents: DemoDocument[];
}

/**
 * - `*_UPCODING`: secondary diagnosis coded without its evidence (Uji Ada flags it).
 * - `GENUINE_*`: secondary diagnosis with complete evidence.
 * - `SHOCK_NONSTANDARD`: real shock written without standard terms; flagged but valid.
 * - `EXAM_MANIPULATION`: exam note contradicted by the next daily note.
 */
export type ClaimProfile =
  | 'NORMAL_DBD'
  | 'NORMAL_PNEUMONIA'
  | 'NORMAL_GE'
  | 'GENUINE_SHOCK'
  | 'GENUINE_RESP_FAILURE'
  | 'SHOCK_UPCODING'
  | 'RESP_FAILURE_UPCODING'
  | 'SHOCK_NONSTANDARD'
  | 'EXAM_MANIPULATION';

const PROFILE_DETAILS: Record<
  ClaimProfile,
  {
    disease: DiseaseKey;
    secondary: { icd10Code: string; name: string } | null;
    injectedCase: InjectedCase[];
    isSuspicious: boolean;
  }
> = {
  NORMAL_DBD: {
    disease: 'DBD',
    secondary: null,
    injectedCase: [],
    isSuspicious: false,
  },
  NORMAL_PNEUMONIA: {
    disease: 'PNEUMONIA',
    secondary: null,
    injectedCase: [],
    isSuspicious: false,
  },
  NORMAL_GE: {
    disease: 'GASTROENTERITIS',
    secondary: null,
    injectedCase: [],
    isSuspicious: false,
  },
  GENUINE_SHOCK: {
    disease: 'DBD',
    secondary: { icd10Code: 'R57.9', name: 'Syok' },
    injectedCase: [],
    isSuspicious: false,
  },
  GENUINE_RESP_FAILURE: {
    disease: 'PNEUMONIA',
    secondary: { icd10Code: 'J96.0', name: 'Gagal napas akut' },
    injectedCase: [],
    isSuspicious: false,
  },
  SHOCK_UPCODING: {
    disease: 'DBD',
    secondary: { icd10Code: 'R57.9', name: 'Syok' },
    injectedCase: ['UPCODING'],
    isSuspicious: true,
  },
  RESP_FAILURE_UPCODING: {
    disease: 'PNEUMONIA',
    secondary: { icd10Code: 'J96.0', name: 'Gagal napas akut' },
    injectedCase: ['UPCODING'],
    isSuspicious: true,
  },
  SHOCK_NONSTANDARD: {
    disease: 'DBD',
    secondary: { icd10Code: 'R57.9', name: 'Syok' },
    injectedCase: [],
    isSuspicious: false,
  },
  EXAM_MANIPULATION: {
    disease: 'PNEUMONIA',
    secondary: null,
    injectedCase: ['EXAM_MANIPULATION'],
    isSuspicious: true,
  },
};

/** Base weights before a facility's risk multiplier is applied to suspicious profiles. */
const PROFILE_WEIGHTS: Record<ClaimProfile, number> = {
  NORMAL_DBD: 20,
  NORMAL_PNEUMONIA: 18,
  NORMAL_GE: 16,
  GENUINE_SHOCK: 5,
  GENUINE_RESP_FAILURE: 5,
  SHOCK_UPCODING: 8,
  RESP_FAILURE_UPCODING: 6,
  SHOCK_NONSTANDARD: 3,
  EXAM_MANIPULATION: 5,
};

/** RS-SIM-001..004 come from the LLM dataset; the rest exist only in demo data. */
const EXTRA_FACILITIES: readonly DemoFacility[] = [
  {
    code: 'RS-SIM-005',
    name: 'RS Sintetis Medika Raya',
    type: 'B',
    city: 'Kota Simulasi Tengah',
  },
  {
    code: 'RS-SIM-006',
    name: 'RS Sintetis Cahaya Bunda',
    type: 'C',
    city: 'Kabupaten Simulasi Hilir',
  },
  {
    code: 'RS-SIM-007',
    name: 'RS Sintetis Mitra Keluarga Sentosa',
    type: 'B',
    city: 'Kota Simulasi Pesisir',
  },
  {
    code: 'RS-SIM-008',
    name: 'RS Sintetis Permata Hati',
    type: 'D',
    city: 'Kabupaten Simulasi Hulu',
  },
  {
    code: 'RS-SIM-009',
    name: 'RS Sintetis Sehat Abadi',
    type: 'C',
    city: 'Kota Simulasi Lembah',
  },
  {
    code: 'RS-SIM-010',
    name: 'RS Sintetis Bhakti Husada',
    type: 'A',
    city: 'Kota Simulasi Raya',
  },
  {
    code: 'RS-SIM-011',
    name: 'RS Sintetis Anugerah Medika',
    type: 'C',
    city: 'Kabupaten Simulasi Timur',
  },
  {
    code: 'RS-SIM-012',
    name: 'RS Sintetis Kasih Ibu Pratama',
    type: 'D',
    city: 'Kabupaten Simulasi Barat',
  },
];

export const DEMO_FACILITIES: readonly DemoFacility[] = [
  ...FACILITIES,
  ...EXTRA_FACILITIES,
];

/** Multiplier on suspicious profile weights, so facility charts show distinct patterns. */
const FACILITY_RISK: Record<string, number> = {
  'RS-SIM-001': 0.4,
  'RS-SIM-002': 1,
  'RS-SIM-003': 1.6,
  'RS-SIM-004': 0.8,
  'RS-SIM-005': 0.6,
  'RS-SIM-006': 2.6,
  'RS-SIM-007': 1.2,
  'RS-SIM-008': 0.5,
  'RS-SIM-009': 1.8,
  'RS-SIM-010': 0.3,
  'RS-SIM-011': 3.2,
  'RS-SIM-012': 0.9,
};

/** Larger hospitals submit more claims. */
const FACILITY_VOLUME_WEIGHT: Record<FacilityType, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
};

const MALE_GIVEN_NAMES = [
  'Budi',
  'Agus',
  'Dedi',
  'Rizki',
  'Andi',
  'Hendra',
  'Joko',
  'Fajar',
  'Yusuf',
  'Bayu',
  'Arif',
  'Dimas',
  'Eko',
  'Rudi',
  'Teguh',
  'Wahyu',
];
const FEMALE_GIVEN_NAMES = [
  'Siti',
  'Dewi',
  'Rina',
  'Ayu',
  'Fitri',
  'Indah',
  'Lestari',
  'Nur',
  'Putri',
  'Sri',
  'Wulan',
  'Yuni',
  'Ratna',
  'Maya',
  'Nadia',
  'Kartika',
];
const FAMILY_NAMES = [
  'Santoso',
  'Wijaya',
  'Hidayat',
  'Saputra',
  'Kurniawan',
  'Pratama',
  'Lestari',
  'Rahmawati',
  'Setiawan',
  'Susanto',
  'Nugroho',
  'Halim',
  'Siregar',
  'Nasution',
  'Sihombing',
  'Utami',
];

/** Seeded PRNG (mulberry32) so every run produces the same dataset. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) =>
      min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
    weighted: <T extends string>(weights: Record<T, number>): T => {
      const entries = Object.entries(weights) as [T, number][];
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let threshold = next() * total;
      for (const [key, weight] of entries) {
        threshold -= weight;
        if (threshold < 0) return key;
      }
      return entries[entries.length - 1][0];
    },
  };
}

type Random = ReturnType<typeof createRandom>;

/** Joins the sentences of one clinical document. */
class DocumentBuilder {
  private readonly sentences: string[] = [];

  sentence(text: string): this {
    this.sentences.push(text);
    return this;
  }

  build(type: DocumentType, recordedAt: Date): DemoDocument {
    return { type, recordedAt, content: this.sentences.join(' ') };
  }
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const JAKARTA_OFFSET_HOURS = 7;
const DATASET_START = Date.UTC(2026, 3, 1);
const DATASET_DAY_SPAN = 178;
const SEVERITY_NUMERALS = ['I', 'II', 'III'];

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
}

/** Local Jakarta wall-clock time on a date-only value. */
function atJakartaTime(date: Date, hour: number, minute = 0): Date {
  return new Date(
    date.getTime() + ((hour - JAKARTA_OFFSET_HOURS) * 60 + minute) * 60 * 1000,
  );
}

function bloodPressure(random: Random): string {
  return `${random.int(105, 125)}/${random.int(65, 80)} mmHg`;
}

function temperature(random: Random, min: number, max: number): string {
  return `${(random.int(min * 10, max * 10) / 10).toFixed(1).replace('.', ',')} °C`;
}

function addVitals(
  builder: DocumentBuilder,
  random: Random,
  bloodPressureValue: string,
  temperatureRange: [number, number],
): void {
  const pulse = `${random.int(82, 108)} x/menit`;
  const bodyTemperature = temperature(random, ...temperatureRange);
  builder.sentence(
    `TD ${bloodPressureValue}, nadi ${pulse}, suhu ${bodyTemperature}.`,
  );
}

function buildExamNote(profile: ClaimProfile, random: Random): DocumentBuilder {
  const builder = new DocumentBuilder();
  const symptomDays = random.int(2, 4);

  switch (PROFILE_DETAILS[profile].disease) {
    case 'DBD': {
      const fever = `demam tinggi sejak ${symptomDays} hari`;
      builder.sentence(`Pasien datang ke IGD dengan keluhan ${fever}.`);
      const petechiae = random.pick([
        'petekie di kedua lengan',
        'petekie di tungkai bawah',
      ]);
      builder.sentence(`Tampak ${petechiae}.`);
      if (profile === 'GENUINE_SHOCK') {
        const shockBloodPressure = `${random.int(75, 85)}/${random.int(45, 55)} mmHg`;
        const hypotension = `hipotensi (TD ${shockBloodPressure})`;
        builder.sentence(`Akral dingin, ${hypotension}, nadi cepat dan lemah.`);
      } else if (profile === 'SHOCK_NONSTANDARD') {
        builder.sentence(
          'Akral dingin, TD 85/50 mmHg, CRT lebih dari 2 detik.',
        );
      } else {
        addVitals(builder, random, bloodPressure(random), [38.2, 39.6]);
      }
      const platelets = `Trombosit ${random.int(45, 98)}.000/µL`;
      builder.sentence(`${platelets}.`);
      return builder;
    }
    case 'PNEUMONIA': {
      const cough = `batuk berdahak sejak ${symptomDays} hari`;
      builder.sentence(`Pasien datang dengan keluhan ${cough} disertai demam.`);
      if (profile === 'GENUINE_RESP_FAILURE') {
        const saturation = `SpO2 ${random.int(82, 88)}%`;
        builder.sentence(
          `Sesak napas berat, desaturasi, ${saturation} udara ruang.`,
        );
      } else if (profile === 'EXAM_MANIPULATION') {
        builder.sentence(
          'Sesak napas berat, ronki basah di kedua lapang paru.',
        );
      } else if (profile === 'RESP_FAILURE_UPCODING') {
        const saturation = `SpO2 ${random.int(95, 98)}%`;
        builder.sentence(
          `Pasien tidak tampak sesak, ${saturation} udara ruang.`,
        );
      } else {
        const crackles = random.pick([
          'ronki di paru kanan bawah',
          'ronki di paru kiri bawah',
        ]);
        builder.sentence(`Auskultasi: ${crackles}, sesak ringan.`);
      }
      addVitals(builder, random, bloodPressure(random), [37.8, 39.2]);
      return builder;
    }
    case 'GASTROENTERITIS': {
      const diarrhea = `diare cair ${random.int(5, 10)} kali sejak kemarin`;
      builder
        .sentence(
          `Pasien datang dengan ${diarrhea}, disertai muntah dan nyeri perut.`,
        )
        .sentence('Turgor kulit menurun, mukosa bibir kering.');
      addVitals(builder, random, bloodPressure(random), [37.4, 38.4]);
      return builder;
    }
  }
}

function buildDailyNote(
  profile: ClaimProfile,
  random: Random,
  careDay: number,
): DocumentBuilder {
  const builder = new DocumentBuilder();
  const disease = PROFILE_DETAILS[profile].disease;
  const isFirstNote = careDay === 1;
  builder.sentence(`Hari rawat ke-${careDay + 1}.`);

  if (disease === 'DBD') {
    const isStillCold =
      isFirstNote &&
      (profile === 'GENUINE_SHOCK' || profile === 'SHOCK_NONSTANDARD');
    builder.sentence(
      isFirstNote
        ? 'Demam mulai turun, nyeri otot berkurang.'
        : 'Demam turun, nafsu makan membaik.',
    );
    if (isStillCold) {
      builder.sentence('Akral dingin berkurang.');
    } else {
      builder.sentence('Akral hangat.');
    }
    const platelets = `Trombosit ${random.int(60 + careDay * 20, 110 + careDay * 25)}.000/µL`;
    builder.sentence(`${platelets}.`);
    addVitals(builder, random, bloodPressure(random), [36.6, 37.6]);
  } else if (disease === 'PNEUMONIA') {
    if (isFirstNote && profile === 'EXAM_MANIPULATION') {
      builder.sentence('Pasien tidak sesak, ronki minimal.');
    } else if (isFirstNote && profile === 'GENUINE_RESP_FAILURE') {
      builder.sentence('Sesak napas masih ada, oksigen dilanjutkan.');
    } else {
      builder.sentence(
        isFirstNote
          ? 'Batuk masih ada, sesak berkurang.'
          : 'Batuk berkurang, sesak tidak dikeluhkan.',
      );
    }
    addVitals(builder, random, bloodPressure(random), [36.8, 37.8]);
  } else {
    builder.sentence(
      isFirstNote
        ? `Diare berkurang menjadi ${random.int(2, 4)} kali, muntah berkurang.`
        : 'BAB lembek satu kali, toleransi minum baik.',
    );
    addVitals(builder, random, bloodPressure(random), [36.5, 37.4]);
  }
  return builder;
}

function buildPrescription(profile: ClaimProfile): DocumentBuilder {
  const builder = new DocumentBuilder();
  switch (PROFILE_DETAILS[profile].disease) {
    case 'DBD':
      return builder.sentence(
        'Infus RL 20 tetes/menit, parasetamol 3 x 500 mg per oral.',
      );
    case 'PNEUMONIA':
      builder.sentence(
        'Seftriakson 1 x 2 g IV, ambroksol 3 x 30 mg, parasetamol 3 x 500 mg.',
      );
      if (profile === 'GENUINE_RESP_FAILURE') {
        builder.sentence('Oksigen via masker non-rebreathing 10 lpm.');
      } else if (profile === 'NORMAL_PNEUMONIA') {
        builder.sentence('Oksigen nasal kanul 2 lpm.');
      }
      return builder;
    case 'GASTROENTERITIS':
      return builder.sentence(
        'Oralit setiap selesai BAB, zinc 1 x 20 mg, ondansetron 3 x 4 mg IV, infus RL 20 tetes/menit.',
      );
  }
}

function buildProcedureNote(
  profile: ClaimProfile,
  random: Random,
): DocumentBuilder | null {
  const builder = new DocumentBuilder();
  if (profile === 'GENUINE_SHOCK') {
    return builder.sentence(
      'Dilakukan resusitasi cairan dengan ringer laktat 20 ml/kgBB dalam 1 jam, dilanjutkan evaluasi hematokrit.',
    );
  }
  if (profile === 'SHOCK_NONSTANDARD') {
    return builder.sentence(
      'Diberikan RL 20 cc/kgBB dalam 1 jam, evaluasi ulang tekanan darah tiap 15 menit.',
    );
  }
  const disease = PROFILE_DETAILS[profile].disease;
  if (disease === 'DBD') {
    const hematocrit = `Ht ${random.int(42, 47)}% menjadi ${random.int(38, 41)}%`;
    return builder.sentence(`Pemeriksaan hematokrit serial: ${hematocrit}.`);
  }
  if (disease === 'PNEUMONIA') {
    const side = random.pick(['kanan', 'kiri']);
    return builder.sentence(
      `Foto toraks: tampak infiltrat di lapang bawah paru ${side}.`,
    );
  }
  return null;
}

function buildMedicalResume(
  diagnoses: DemoClaim['diagnoses'],
  random: Random,
): DocumentBuilder {
  const builder = new DocumentBuilder();
  for (const diagnosis of diagnoses) {
    const label = `${diagnosis.name} (${diagnosis.icd10Code})`;
    builder.sentence(
      `${diagnosis.isPrimary ? 'Diagnosis utama' : 'Diagnosis sekunder'}: ${label}.`,
    );
  }
  builder.sentence(
    `Kondisi saat pulang ${random.pick(['baik', 'membaik', 'stabil'])}, kontrol ke poliklinik ${random.int(3, 7)} hari lagi.`,
  );
  return builder;
}

export function generateDemoClaims(
  claimCount: number,
  seed: number,
): DemoClaim[] {
  const random = createRandom(seed);
  const tariffSchedule = new SyntheticTariffSchedule();
  const facilityWeights = Object.fromEntries(
    DEMO_FACILITIES.map((facility) => [
      facility.code,
      FACILITY_VOLUME_WEIGHT[facility.type],
    ]),
  );
  const admissionOffsets = Array.from({ length: claimCount }, () =>
    random.int(0, DATASET_DAY_SPAN),
  ).sort((first, second) => first - second);

  return admissionOffsets.map((admissionOffset, claimIndex) => {
    const sequence = String(claimIndex + 1).padStart(4, '0');
    const facilityCode = random.weighted(facilityWeights);
    const risk = FACILITY_RISK[facilityCode] ?? 1;
    const profile = random.weighted(
      Object.fromEntries(
        (Object.keys(PROFILE_WEIGHTS) as ClaimProfile[]).map((key) => [
          key,
          PROFILE_WEIGHTS[key] * (PROFILE_DETAILS[key].isSuspicious ? risk : 1),
        ]),
      ) as Record<ClaimProfile, number>,
    );
    const { disease, secondary, injectedCase } = PROFILE_DETAILS[profile];
    const diseaseSpec = DISEASES[disease];

    const gender = random.chance(0.5) ? 'M' : 'F';
    const admittedAt = new Date(
      DATASET_START + admissionOffset * MILLISECONDS_PER_DAY,
    );
    const lengthOfStay = random.int(3, secondary ? 7 : 5);
    const dischargedAt = addDays(admittedAt, lengthOfStay);
    const age = random.int(18, 72);
    const patient: DemoPatient = {
      medicalRecordNo: `${DEMO_RECORD_NO_PREFIX}${sequence.padStart(6, '0')}`,
      name: `${random.pick(gender === 'M' ? MALE_GIVEN_NAMES : FEMALE_GIVEN_NAMES)} ${random.pick(FAMILY_NAMES)}`,
      gender,
      birthDate: addDays(admittedAt, -(age * 365 + random.int(0, 364))),
    };

    const severityLevel = secondary ? 3 : random.chance(0.35) ? 2 : 1;
    const tariffAmount =
      tariffSchedule.findTariff(diseaseSpec.inacbgGroupCode, severityLevel) ??
      0;
    const diagnoses = [
      { ...diseaseSpec.primaryDiagnosis, isPrimary: true },
      ...(secondary ? [{ ...secondary, isPrimary: false }] : []),
    ];

    const examTime = atJakartaTime(
      admittedAt,
      random.int(8, 20),
      random.pick([0, 15, 30, 45]),
    );
    const documents: DemoDocument[] = [
      buildExamNote(profile, random).build('EXAM_NOTE', examTime),
    ];
    const prescriptionTime = new Date(examTime.getTime() + 90 * 60 * 1000);
    documents.push(
      buildPrescription(profile).build('PRESCRIPTION', prescriptionTime),
    );
    const procedureTime = new Date(examTime.getTime() + 3 * 60 * 60 * 1000);
    const procedureNote = buildProcedureNote(profile, random);
    if (procedureNote)
      documents.push(procedureNote.build('PROCEDURE', procedureTime));
    const dailyNoteCount = Math.min(lengthOfStay - 1, 3);
    for (let careDay = 1; careDay <= dailyNoteCount; careDay += 1) {
      const noteTime = atJakartaTime(addDays(admittedAt, careDay), 8);
      documents.push(
        buildDailyNote(profile, random, careDay).build('DAILY_NOTE', noteTime),
      );
    }
    const resumeTime = atJakartaTime(dischargedAt, 11);
    documents.push(
      buildMedicalResume(diagnoses, random).build('MEDICAL_RESUME', resumeTime),
    );

    return {
      claimNo: `${DEMO_CLAIM_NO_PREFIX}${sequence}`,
      profile,
      facilityCode,
      patient,
      admittedAt,
      dischargedAt,
      inacbgCode: `${diseaseSpec.inacbgGroupCode}-${SEVERITY_NUMERALS[severityLevel - 1]}`,
      severityLevel,
      tariffAmount,
      injectedCase,
      diagnoses,
      documents,
    };
  });
}
