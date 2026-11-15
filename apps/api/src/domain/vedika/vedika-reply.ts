import type { CareType, ClaimDetail, Gender } from '../claims/claim-detail';
import type { VedikaAttachment } from './vedika-attachment';

const SIMULATED_SEP_TEMPLATE = {
  number: '0301R0011125V000123',
  cardNumber: '0001234567890',
  phone: '0812-0000-0000',
  membership: 'PBI (APBN)',
  entitledClass: 'Kelas 3',
  visitType: 'Kunjungan Kontrol',
  specialty: 'Penyakit Dalam',
  doctor: 'dr. Andi Pratama, Sp.PD',
  referringFacility: 'Puskesmas Simulasi',
  note: 'Kontrol rutin',
} as const;

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

function buildSimulatedSep(claim: ClaimDetail): VedikaSep {
  const template = SIMULATED_SEP_TEMPLATE;
  const primaryDiagnosis = claim.diagnoses.find(
    (diagnosis) => diagnosis.isPrimary,
  );
  return {
    number: template.number,
    date: claim.admittedAt,
    participant: {
      cardNumber: template.cardNumber,
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

export function buildVedikaStatus(
  claim: ClaimDetail,
  attachments: VedikaAttachment[],
  syncedAt: Date | null,
): VedikaStatus {
  const checkLabels =
    attachments.length > 0
      ? [...SEP_CHECK_LABELS, ATTACHMENT_CHECK_LABEL]
      : SEP_CHECK_LABELS;
  const reply: VedikaReply | null = syncedAt && {
    isSimulated: true,
    syncedAt,
    sep: buildSimulatedSep(claim),
    checks: checkLabels.map((label) => ({ label, isPassed: true })),
  };
  return { attachments, reply };
}
