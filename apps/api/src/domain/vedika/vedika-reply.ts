import type { CareType, ClaimDetail, Gender } from '../claims/claim-detail';
import type { VedikaAttachment } from './vedika-attachment';

const SIMULATED_SEP_TEMPLATE = {
  phone: '0812-0000-0000',
  membership: 'PBI (APBN)',
  entitledClass: 'Kelas 3',
  visitType: 'Kunjungan Kontrol',
  specialty: 'Penyakit Dalam',
  doctor: 'dr. Andi Pratama, Sp.PD',
  referringFacility: 'Puskesmas Simulasi',
  note: 'Kontrol rutin',
} as const;

function simulatedCardNumber(seed: string): string {
  let value = 0;
  for (const character of seed) {
    value = (value * 31 + character.charCodeAt(0)) % 10_000_000_000_000;
  }
  return String(value).padStart(13, '0');
}

const CARE_TYPE_LABELS: Record<CareType, string> = {
  OUTPATIENT: 'Rawat Jalan',
  INPATIENT: 'Rawat Inap',
};

const SEP_CHECK_LABELS = [
  'SEP terdaftar di VEDIKA',
  'Peserta aktif pada tanggal pelayanan',
  'Identitas peserta sesuai klaim',
  'Diagnosis utama sesuai SEP',
];
const ATTACHMENT_CHECK_LABEL = 'Dokumen klarifikasi diterima';

export interface VedikaSep {
  number: string;
  date: Date;
  participant: {
    cardNumber: string;
    medicalRecordNo: string;
    name: string;
    birthDate: Date;
    gender: Gender;
    phone: string;
    membership: string;
    entitledClass: string;
  };
  service: {
    facilityName: string;
    referringFacility: string;
    careType: string;
    visitType: string;
    specialty: string;
    doctor: string;
    note: string;
  };
  initialDiagnosis: { icd10Code: string; name: string } | null;
}

export interface VedikaReply {
  isSimulated: true;
  syncedAt: Date;
  sep: VedikaSep;
  checks: { label: string; isPassed: true }[];
}

export interface VedikaStatus {
  attachments: VedikaAttachment[];
  reply: VedikaReply | null;
}

type SimulatedClaim = Pick<ClaimDetail, 'claimNo' | 'admittedAt' | 'careType'> & {
  patient: Pick<ClaimDetail['patient'], 'medicalRecordNo' | 'name' | 'gender' | 'birthDate'>;
  facility: Pick<ClaimDetail['facility'], 'name'>;
  diagnoses: Array<
    Pick<ClaimDetail['diagnoses'][number], 'icd10Code' | 'name' | 'isPrimary'>
  >;
};

function buildSimulatedSep(claim: SimulatedClaim): VedikaSep {
  const template = SIMULATED_SEP_TEMPLATE;
  const primaryDiagnosis = claim.diagnoses.find(
    (diagnosis) => diagnosis.isPrimary,
  );
  return {
    number: claim.claimNo,
    date: claim.admittedAt,
    participant: {
      cardNumber: simulatedCardNumber(claim.patient.medicalRecordNo),
      medicalRecordNo: claim.patient.medicalRecordNo,
      name: claim.patient.name,
      birthDate: claim.patient.birthDate,
      gender: claim.patient.gender,
      phone: template.phone,
      membership: template.membership,
      entitledClass: template.entitledClass,
    },
    service: {
      facilityName: claim.facility.name,
      referringFacility: template.referringFacility,
      careType: CARE_TYPE_LABELS[claim.careType],
      visitType: template.visitType,
      specialty: template.specialty,
      doctor: template.doctor,
      note: template.note,
    },
    initialDiagnosis: primaryDiagnosis
      ? { icd10Code: primaryDiagnosis.icd10Code, name: primaryDiagnosis.name }
      : null,
  };
}

export function buildSimulatedVedikaReply(
  claim: SimulatedClaim,
  hasAttachments: boolean,
  syncedAt: Date,
  isApproved: boolean,
): VedikaReply {
  const checkLabels = isApproved
    ? hasAttachments
      ? [...SEP_CHECK_LABELS, ATTACHMENT_CHECK_LABEL]
      : SEP_CHECK_LABELS
    : [];
  return {
    isSimulated: true,
    syncedAt,
    sep: buildSimulatedSep(claim),
    checks: checkLabels.map((label) => ({ label, isPassed: true })),
  };
}

export function buildVedikaStatus(
  claim: ClaimDetail,
  attachments: VedikaAttachment[],
  syncedAt: Date | null,
  savedReply: VedikaReply | null = null,
): VedikaStatus {
  const reply: VedikaReply | null =
    savedReply ??
    (syncedAt
      ? buildSimulatedVedikaReply(
          claim,
          attachments.length > 0,
          syncedAt,
          claim.status === 'APPROVED',
        )
      : null);
  return { attachments, reply };
}
