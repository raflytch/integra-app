import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ClinicalExtraction,
  ExtractedDiagnosis,
  ExtractedFinding,
  ExtractedMedication,
  ExtractedProcedure,
  ExtractedVitalSign,
} from '../../src/domain/analysis/clinical-extraction';
import type { CareType } from '../../src/domain/claims/claim-detail';
import type { InjectedCase } from './dataset.schema';

export const SAMPLE_CLAIM_NO_PREFIX = '9900R';
export const SAMPLE_RECORD_NO_PREFIX = 'RM-DEMO-';
const VISITS_FILE_PATH = join(__dirname, '../../data/bpjs-sample-visits.json');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const JAKARTA_OFFSET_MS = 7 * HOUR_MS;
const CLONING_CLUSTER_COUNT = 6;
const CLONING_CLUSTER_SIZE = 5;
const CONSISTENCY_SHARE = 0.12;

type FacilityType = 'A' | 'B' | 'C' | 'D';
type DocumentType =
  'MEDICAL_RESUME' | 'EXAM_NOTE' | 'DAILY_NOTE' | 'PRESCRIPTION' | 'PROCEDURE';
type EvidenceMode = 'SUPPORTED' | 'PARTIAL' | 'NOT_FOUND';
export type SampleProfile =
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'UPCODING'
  | 'NO_RULE'
  | 'NORMAL'
  | 'CLONING'
  | 'ALL_TESTS';

interface BpjsVisit {
  bucket: string;
  careType: CareType;
  admittedAt: string;
  dischargedAt: string;
  primary: { icd10Code: string; name: string };
  secondaries: { icd10Code: string; name: string }[];
  procedure: { icd9cmCode: string; name: string } | null;
  inacbgCode: string;
  tariffAmount: number;
  hospital: { city: string; type: string };
}

export interface SampleFacility {
  code: string;
  name: string;
  type: FacilityType;
  city: string;
}

export interface SampleDocument {
  type: DocumentType;
  recordedAt: Date;
  content: string;
  extracted: ClinicalExtraction;
}

export interface SampleClaim {
  claimNo: string;
  profile: SampleProfile;
  facilityCode: string;
  patient: {
    medicalRecordNo: string;
    name: string;
    gender: 'M' | 'F';
    birthDate: Date;
  };
  careType: CareType;
  admittedAt: Date;
  dischargedAt: Date;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  injectedCase: InjectedCase[];
  diagnoses: { icd10Code: string; name: string; isPrimary: boolean }[];
  procedures: { icd9cmCode: string; name: string }[];
  documents: SampleDocument[];
}

interface Random {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
}

function createRandom(seed: number): Random {
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
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (probability) => next() < probability,
  };
}

const GIVEN_NAMES = {
  M: [
    'Agus',
    'Budi',
    'Dedi',
    'Eko',
    'Fajar',
    'Hendra',
    'Irfan',
    'Joko',
    'Rizki',
    'Yusuf',
  ],
  F: [
    'Ani',
    'Dewi',
    'Fitri',
    'Indah',
    'Lestari',
    'Maya',
    'Putri',
    'Rina',
    'Sari',
    'Wulan',
  ],
} as const;
const FAMILY_NAMES = [
  'Santoso',
  'Wijaya',
  'Saputra',
  'Hidayat',
  'Siregar',
  'Nasution',
  'Pratama',
  'Kurniawan',
  'Lubis',
  'Utami',
];
const COMPLAINT_DAYS = [
  '1 hari',
  '2 hari',
  '3 hari',
  '4 hari',
  '5 hari',
  '1 minggu',
];
const ARRIVALS = [
  'datang sendiri ke IGD',
  'diantar keluarga ke IGD',
  'rujukan puskesmas',
  'rujukan klinik pratama',
  'datang ke poliklinik',
];
const GENERAL_STATES = [
  'tampak sakit sedang',
  'tampak sakit ringan',
  'kesadaran compos mentis',
  'tampak lemas',
];
const DAILY_PROGRESS = [
  'keluhan berkurang',
  'kondisi stabil',
  'nafsu makan membaik',
  'pasien dapat tidur',
  'mobilisasi bertahap',
];

function jakartaTime(day: Date, hour: number, minute = 0): Date {
  return new Date(
    day.getTime() + hour * HOUR_MS + minute * 60_000 - JAKARTA_OFFSET_MS,
  );
}

function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function facilityTypeOf(hospitalType: string): FacilityType {
  const match = /(?:Kelas|Type)\s*([ABCD])\b/.exec(hospitalType);
  if (match) return match[1] as FacilityType;
  if (hospitalType.includes('Kelas II')) return 'B';
  return 'C';
}

function severityOf(inacbgCode: string): number {
  const suffix = inacbgCode.split('-').at(-1);
  return suffix === 'III' ? 3 : suffix === 'II' ? 2 : suffix === 'I' ? 1 : 0;
}

class DocumentBuilder {
  private readonly sentences: string[] = [];
  private readonly extraction: ClinicalExtraction = {
    diagnoses: [],
    findings: [],
    vitalSigns: [],
    medications: [],
    procedures: [],
  };

  sentence(text: string): this {
    this.sentences.push(text);
    return this;
  }

  diagnosis(text: string, item: ExtractedDiagnosis): this {
    this.sentences.push(text);
    this.extraction.diagnoses.push(item);
    return this;
  }

  finding(text: string, name: string, isPresent = true, quote = text): this {
    this.sentences.push(text);
    const item: ExtractedFinding = { name, isPresent, observedAt: null, quote };
    this.extraction.findings.push(item);
    return this;
  }

  vital(name: string, value: string, quote: string): this {
    const item: ExtractedVitalSign = { name, value, observedAt: null, quote };
    this.extraction.vitalSigns.push(item);
    return this;
  }

  medication(text: string, name: string, dose: string): this {
    this.sentences.push(text);
    const item: ExtractedMedication = {
      name,
      dose,
      givenAt: null,
      quote: text,
    };
    this.extraction.medications.push(item);
    return this;
  }

  procedure(text: string, name: string): this {
    this.sentences.push(text);
    const item: ExtractedProcedure = { name, performedAt: null, quote: text };
    this.extraction.procedures.push(item);
    return this;
  }

  build(type: DocumentType, recordedAt: Date): SampleDocument {
    return {
      type,
      recordedAt,
      content: this.sentences.join(' '),
      extracted: structuredClone(this.extraction),
    };
  }
}

interface Vitals {
  systolic: number;
  diastolic: number;
  pulse: number;
  temperature: number;
  saturation: number;
}

function addVitals(builder: DocumentBuilder, vitals: Vitals): void {
  const bloodPressure = `${vitals.systolic}/${vitals.diastolic} mmHg`;
  const temperature = `${vitals.temperature.toFixed(1).replace('.', ',')} °C`;
  const sentence = `TD ${bloodPressure}, nadi ${vitals.pulse} x/menit, suhu ${temperature}, SpO2 ${vitals.saturation}%.`;
  builder
    .sentence(sentence)
    .vital('tekanan darah', bloodPressure, sentence)
    .vital('nadi', `${vitals.pulse} x/menit`, sentence)
    .vital('suhu', temperature, sentence)
    .vital('saturasi oksigen', `${vitals.saturation}%`, sentence);
}

interface EvidenceItem {
  kind: 'finding' | 'medication' | 'procedure' | 'vital';
  write: (builder: DocumentBuilder, vitals: Vitals) => void;
}

const finding = (text: string, name: string): EvidenceItem => ({
  kind: 'finding',
  write: (builder) => builder.finding(text, name),
});
const medication = (
  text: string,
  name: string,
  dose: string,
): EvidenceItem => ({
  kind: 'medication',
  write: (builder) => builder.medication(text, name, dose),
});
const procedure = (text: string, name: string): EvidenceItem => ({
  kind: 'procedure',
  write: (builder) => builder.procedure(text, name),
});
const vitalChange = (change: Partial<Vitals>): EvidenceItem => ({
  kind: 'vital',
  write: (_, vitals) => Object.assign(vitals, change),
});

function evidenceFor(
  secondaryCode: string,
  primaryCode: string,
): EvidenceItem[] | null {
  const primary = primaryCode.slice(0, 3);
  if (
    secondaryCode.startsWith('R57') &&
    ['A90', 'A91', 'A97'].includes(primary)
  ) {
    return [
      procedure(
        'Dilakukan resusitasi cairan kristaloid 20 ml/kgBB dalam 30 menit.',
        'resusitasi cairan',
      ),
      finding('Akral dingin dan nadi lemah.', 'akral dingin'),
    ];
  }
  if (
    secondaryCode.startsWith('J96.0') &&
    primary >= 'J12' &&
    primary <= 'J18'
  ) {
    return [
      medication(
        'Terapi oksigen nasal kanul 4 liter/menit.',
        'oksigen',
        '4 liter/menit',
      ),
      finding('Sesak napas berat saat istirahat.', 'sesak napas'),
      vitalChange({ saturation: 86 }),
    ];
  }
  if (secondaryCode.startsWith('M54')) {
    return [
      finding('Nyeri punggung bawah menjalar ke tungkai.', 'nyeri punggung'),
      finding('Skala nyeri NRS 6/10.', 'skala nyeri'),
      medication('Ketorolac 30 mg intravena.', 'ketorolac', '30 mg'),
    ];
  }
  if (secondaryCode.startsWith('I11.0')) {
    return [
      vitalChange({ systolic: 168, diastolic: 102 }),
      finding('Sesak napas saat aktivitas ringan.', 'sesak napas'),
      finding('Ronki basah di kedua basal paru.', 'ronki'),
      procedure(
        'Foto toraks menunjukkan kardiomegali.',
        'foto toraks kardiomegali',
      ),
      medication('Furosemid 40 mg intravena.', 'furosemid', '40 mg'),
    ];
  }
  if (secondaryCode.startsWith('I11')) {
    return [
      vitalChange({ systolic: 158, diastolic: 96 }),
      medication('Amlodipin 10 mg per oral.', 'amlodipin', '10 mg'),
    ];
  }
  if (secondaryCode.startsWith('A01')) {
    return [
      finding('Demam naik bertahap sejak 7 hari.', 'demam'),
      finding('Mual dan nyeri perut.', 'mual'),
      procedure('Pemeriksaan Widal serial positif.', 'pemeriksaan widal'),
      medication('Seftriakson 2 g intravena.', 'seftriakson', '2 g'),
    ];
  }
  return null;
}

function baseVitals(random: Random): Vitals {
  return {
    systolic: random.int(108, 128),
    diastolic: random.int(68, 82),
    pulse: random.int(76, 98),
    temperature: random.int(363, 374) / 10,
    saturation: random.int(95, 99),
  };
}

interface ClaimPlan {
  evidence: { items: EvidenceItem[]; mode: EvidenceMode }[];
  consistency: 'NONE' | 'FEVER_MISMATCH' | 'CODING_LABEL' | 'CONTRADICTION';
}

function buildDocuments(
  visit: BpjsVisit,
  admittedAt: Date,
  dischargedAt: Date,
  plan: ClaimPlan,
  random: Random,
): SampleDocument[] {
  const vitals = baseVitals(random);
  const writtenEvidence = plan.evidence.flatMap(({ items, mode }) => {
    if (mode === 'NOT_FOUND') return [];
    if (mode === 'SUPPORTED') return items;
    const kept = items.filter(() => random.chance(0.5));
    return kept.length === items.length
      ? kept.slice(1)
      : kept.length === 0
        ? items.slice(0, 1)
        : kept;
  });
  for (const item of writtenEvidence.filter(
    (evidence) => evidence.kind === 'vital',
  )) {
    item.write(new DocumentBuilder(), vitals);
  }

  const exam = new DocumentBuilder()
    .sentence(
      `Pasien ${random.pick(ARRIVALS)} dengan keluhan terkait ${visit.primary.name.toLowerCase()} sejak ${random.pick(COMPLAINT_DAYS)}.`,
    )
    .sentence(`Keadaan umum ${random.pick(GENERAL_STATES)}.`);
  if (plan.consistency === 'CODING_LABEL') {
    exam.sentence(
      `Keluhan sesuai ${visit.primary.name} (${visit.primary.icd10Code}).`,
    );
  }
  if (plan.consistency === 'FEVER_MISMATCH') {
    exam.finding('Pasien demam tinggi sejak 3 hari.', 'demam');
    vitals.temperature = random.int(365, 372) / 10;
  }
  if (plan.consistency === 'CONTRADICTION') {
    exam.finding('Pasien mengeluh sesak napas hebat.', 'sesak napas');
  }
  for (const item of writtenEvidence.filter(
    (evidence) => evidence.kind === 'finding',
  )) {
    item.write(exam, vitals);
  }
  addVitals(exam, vitals);

  const examTime = jakartaTime(
    admittedAt,
    random.int(8, 16),
    random.pick([0, 15, 30, 45]),
  );
  const documents = [exam.build('EXAM_NOTE', examTime)];

  const prescription = new DocumentBuilder().sentence('Resep dan terapi:');
  const medications = writtenEvidence.filter(
    (evidence) => evidence.kind === 'medication',
  );
  for (const item of medications) item.write(prescription, vitals);
  if (medications.length === 0) {
    prescription.medication(
      'Parasetamol 500 mg tiga kali sehari.',
      'parasetamol',
      '500 mg',
    );
  }
  documents.push(
    prescription.build(
      'PRESCRIPTION',
      new Date(examTime.getTime() + 90 * 60_000),
    ),
  );

  const procedures = writtenEvidence.filter(
    (evidence) => evidence.kind === 'procedure',
  );
  if (procedures.length > 0 || visit.procedure) {
    const procedureNote = new DocumentBuilder().sentence('Catatan tindakan:');
    for (const item of procedures) item.write(procedureNote, vitals);
    if (visit.procedure) {
      procedureNote.procedure(
        `Dilakukan ${visit.procedure.name.toLowerCase()}.`,
        visit.procedure.name.toLowerCase(),
      );
    }
    documents.push(
      procedureNote.build(
        'PROCEDURE',
        new Date(examTime.getTime() + 3 * HOUR_MS),
      ),
    );
  }

  const lengthOfStay = Math.round(
    (dischargedAt.getTime() - admittedAt.getTime()) / DAY_MS,
  );
  const dailyNoteCount = Math.min(Math.max(lengthOfStay - 1, 0), 3);
  for (let careDay = 1; careDay <= dailyNoteCount; careDay += 1) {
    const daily = new DocumentBuilder().sentence(
      `Hari rawat ke-${careDay + 1}: ${random.pick(DAILY_PROGRESS)}.`,
    );
    if (plan.consistency === 'CONTRADICTION' && careDay === 1) {
      daily.finding('Pasien tidak sesak napas.', 'sesak napas', false);
    }
    addVitals(daily, {
      ...baseVitals(random),
      systolic: vitals.systolic,
      diastolic: vitals.diastolic,
    });
    documents.push(
      daily.build(
        'DAILY_NOTE',
        jakartaTime(new Date(admittedAt.getTime() + careDay * DAY_MS), 8),
      ),
    );
  }

  const resume = new DocumentBuilder().sentence('Resume medis pasien pulang.');
  const diagnoses = [visit.primary, ...visit.secondaries];
  diagnoses.forEach((diagnosis, index) => {
    const line = `${index === 0 ? 'Diagnosis utama' : 'Diagnosis sekunder'}: ${diagnosis.name} (${diagnosis.icd10Code}).`;
    resume.diagnosis(line, {
      name: diagnosis.name,
      icd10Code: diagnosis.icd10Code,
      quote: line,
    });
  });
  resume.sentence(
    `Kondisi saat pulang ${random.pick(['membaik', 'stabil', 'perbaikan klinis'])}.`,
  );
  const resumeTime =
    visit.careType === 'OUTPATIENT'
      ? new Date(examTime.getTime() + 2 * HOUR_MS)
      : jakartaTime(dischargedAt, 11);
  documents.push(resume.build('MEDICAL_RESUME', resumeTime));
  return documents;
}

function readVisits(): BpjsVisit[] {
  return JSON.parse(readFileSync(VISITS_FILE_PATH, 'utf8')) as BpjsVisit[];
}

export function generateBpjsSampleClaims(
  claimCount: number,
  seed: number,
): { claims: SampleClaim[]; facilities: SampleFacility[] } {
  const random = createRandom(seed);
  const visits = readVisits().slice(0, claimCount);
  const facilityByKey = new Map<string, SampleFacility>();
  const facilityOf = (visit: BpjsVisit) => {
    const type = facilityTypeOf(visit.hospital.type);
    const key = `${visit.hospital.city}|${type}`;
    let facility = facilityByKey.get(key);
    if (!facility) {
      facility = {
        code: `RS-SMP-${String(facilityByKey.size + 1).padStart(3, '0')}`,
        name: `RS Sampel ${titleCase(visit.hospital.city)} Tipe ${type}`,
        type,
        city: titleCase(visit.hospital.city),
      };
      facilityByKey.set(key, facility);
    }
    return facility;
  };

  const claims = visits.map((visit, index): SampleClaim => {
    const facility = facilityOf(visit);
    const admittedAt = new Date(`${visit.admittedAt}T00:00:00Z`);
    const dischargedAt = new Date(`${visit.dischargedAt}T00:00:00Z`);
    const evidence = visit.secondaries.flatMap((secondary) => {
      const items = evidenceFor(secondary.icd10Code, visit.primary.icd10Code);
      if (!items) return [];
      const draw = random.next();
      const mode: EvidenceMode =
        draw < 0.45 ? 'SUPPORTED' : draw < 0.65 ? 'PARTIAL' : 'NOT_FOUND';
      return [{ items, mode }];
    });
    const lengthOfStay = Math.round(
      (dischargedAt.getTime() - admittedAt.getTime()) / DAY_MS,
    );
    const consistency =
      visit.careType === 'INPATIENT' && random.chance(CONSISTENCY_SHARE)
        ? lengthOfStay >= 2
          ? random.pick([
              'FEVER_MISMATCH',
              'CODING_LABEL',
              'CONTRADICTION',
            ] as const)
          : random.pick(['FEVER_MISMATCH', 'CODING_LABEL'] as const)
        : 'NONE';
    const plan: ClaimPlan = { evidence, consistency };
    const modes = evidence.map((item) => item.mode);
    const profile: SampleProfile = modes.includes('NOT_FOUND')
      ? 'UPCODING'
      : modes.includes('PARTIAL')
        ? 'PARTIAL'
        : modes.length > 0
          ? 'SUPPORTED'
          : visit.secondaries.length > 0
            ? 'NO_RULE'
            : 'NORMAL';
    const injectedCase: InjectedCase[] = [
      ...(profile === 'UPCODING' ? (['UPCODING'] as const) : []),
      ...(consistency !== 'NONE' ? (['EXAM_MANIPULATION'] as const) : []),
    ];
    const isMaternal = [visit.primary, ...visit.secondaries].some(
      ({ icd10Code }) => /^(O|Z3[5-7])/.test(icd10Code),
    );
    const isNewborn = [visit.primary, ...visit.secondaries].some(
      ({ icd10Code }) => /^(P|Z38)/.test(icd10Code),
    );
    const gender = isMaternal ? 'F' : random.chance(0.5) ? 'M' : 'F';
    const age = isNewborn
      ? 0
      : isMaternal
        ? random.int(20, 40)
        : random.int(18, 80);
    const sequence = String(index + 1).padStart(6, '0');
    const month = String(admittedAt.getUTCMonth() + 1).padStart(2, '0');
    const year = String(admittedAt.getUTCFullYear() % 100).padStart(2, '0');
    const seenCodes = new Set<string>();
    return {
      claimNo: `${SAMPLE_CLAIM_NO_PREFIX}${facility.code.slice(-3)}${month}${year}V${sequence}`,
      profile,
      facilityCode: facility.code,
      patient: {
        medicalRecordNo: `${SAMPLE_RECORD_NO_PREFIX}${sequence}`,
        name: `${random.pick(GIVEN_NAMES[gender])} ${random.pick(FAMILY_NAMES)}`,
        gender,
        birthDate: new Date(
          admittedAt.getTime() - (age * 365 + random.int(0, 364)) * DAY_MS,
        ),
      },
      careType: visit.careType,
      admittedAt,
      dischargedAt,
      inacbgCode: visit.inacbgCode,
      severityLevel: severityOf(visit.inacbgCode),
      tariffAmount: visit.tariffAmount,
      injectedCase,
      diagnoses: [
        { ...visit.primary, isPrimary: true },
        ...visit.secondaries.map((secondary) => ({
          ...secondary,
          isPrimary: false,
        })),
      ].filter(
        ({ icd10Code }) =>
          !seenCodes.has(icd10Code) && seenCodes.add(icd10Code),
      ),
      procedures: visit.procedure ? [visit.procedure] : [],
      documents: buildDocuments(visit, admittedAt, dischargedAt, plan, random),
    };
  });

  injectCloningClusters(claims, random);
  injectAllTestsCluster(claims);
  return { claims, facilities: [...facilityByKey.values()] };
}

function injectCloningClusters(claims: SampleClaim[], random: Random): void {
  const candidatesByPrimary = new Map<string, SampleClaim[]>();
  for (const claim of claims) {
    if (claim.profile !== 'NORMAL' || claim.careType !== 'INPATIENT') continue;
    const primaryCode = claim.diagnoses[0].icd10Code;
    candidatesByPrimary.set(primaryCode, [
      ...(candidatesByPrimary.get(primaryCode) ?? []),
      claim,
    ]);
  }
  const groups = [...candidatesByPrimary.values()]
    .filter((group) => group.length >= CLONING_CLUSTER_SIZE)
    .sort((first, second) => second.length - first.length)
    .slice(0, CLONING_CLUSTER_COUNT);
  for (const group of groups) {
    const members = group.slice(0, CLONING_CLUSTER_SIZE);
    const source = random.pick(members);
    for (const member of members) {
      member.profile = 'CLONING';
      member.injectedCase = ['CLONING'];
      if (member !== source) copyDocuments(source, member);
    }
  }
}

function copyDocuments(source: SampleClaim, member: SampleClaim): void {
  const shiftMs = member.admittedAt.getTime() - source.admittedAt.getTime();
  member.dischargedAt = new Date(
    member.admittedAt.getTime() +
      (source.dischargedAt.getTime() - source.admittedAt.getTime()),
  );
  member.documents = source.documents.map((document) => ({
    ...document,
    recordedAt: new Date(document.recordedAt.getTime() + shiftMs),
    extracted: structuredClone(document.extracted),
  }));
}

function injectAllTestsCluster(claims: SampleClaim[]): void {
  const upcodedByPrimary = new Map<string, SampleClaim[]>();
  for (const claim of claims) {
    if (claim.profile !== 'UPCODING' || claim.careType !== 'INPATIENT')
      continue;
    const primaryCode = claim.diagnoses[0].icd10Code;
    upcodedByPrimary.set(primaryCode, [
      ...(upcodedByPrimary.get(primaryCode) ?? []),
      claim,
    ]);
  }
  const group = [...upcodedByPrimary.values()]
    .filter(
      (candidates) =>
        candidates.length >= CLONING_CLUSTER_SIZE &&
        candidates.some((claim) =>
          claim.injectedCase.includes('EXAM_MANIPULATION'),
        ),
    )
    .sort((first, second) => second.length - first.length)[0];
  if (!group) return;
  const source = group.find((claim) =>
    claim.injectedCase.includes('EXAM_MANIPULATION'),
  )!;
  const members = [source, ...group.filter((claim) => claim !== source)].slice(
    0,
    CLONING_CLUSTER_SIZE,
  );
  for (const member of members) {
    member.profile = 'ALL_TESTS';
    member.injectedCase = ['UPCODING', 'EXAM_MANIPULATION', 'CLONING'];
    if (member !== source) copyDocuments(source, member);
  }
}
