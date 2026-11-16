import type { VedikaSep } from '../../src/domain/vedika/vedika-reply';
import { escapePdfText, type RawPdfPage } from './text-pdf';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const PAGE_WIDTH = 595.2756;
const PAGE_HEIGHT = 420.9449;
const FIRST_ROW_Y = 328.9449;
const ROW_HEIGHT = 15;
const MAX_VALUE_CHARACTERS = 85;

function formatDate(date: Date): string {
  const jakarta = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  const day = String(jakarta.getUTCDate()).padStart(2, '0');
  const month = String(jakarta.getUTCMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${jakarta.getUTCFullYear()}`;
}

function formatTime(date: Date): string {
  return new Date(date.getTime() + JAKARTA_OFFSET_MS)
    .toISOString()
    .slice(11, 19);
}

function text(x: number, y: number, value: string): string {
  return `BT 1 0 0 1 ${x} ${y.toFixed(4)} Tm (${escapePdfText(value)}) Tj T* ET`;
}

function fieldRows(fields: [string, string][], labelX: number, valueX: number) {
  return fields.flatMap(([label, value], index) => {
    const y = FIRST_ROW_Y - index * ROW_HEIGHT;
    return [
      text(labelX, y, label),
      text(valueX, y, `: ${value}`.slice(0, MAX_VALUE_CHARACTERS)),
    ];
  });
}

export function renderSepPage(
  sep: VedikaSep,
  isInpatient: boolean,
  printedAt: Date,
): RawPdfPage {
  const { participant, service, initialDiagnosis } = sep;
  const leftFields: [string, string][] = [
    ['No. SEP', sep.number],
    ['Tgl. SEP', formatDate(sep.date)],
    [
      'No. Kartu',
      `${participant.cardNumber}  (MR. ${participant.medicalRecordNo})`,
    ],
    ['Nama Peserta', participant.name.toUpperCase()],
    [
      'Tgl. Lahir',
      `${formatDate(participant.birthDate)}   Kelamin : ${participant.gender === 'M' ? 'Laki-laki' : 'Perempuan'}`,
    ],
    ['No. Telepon', participant.phone],
    ['Sub/Spesialis', service.specialty],
    ['Dokter', service.doctor],
    ['Faskes Perujuk', service.referringFacility],
    [
      'Diagnosa Awal',
      initialDiagnosis
        ? `${initialDiagnosis.icd10Code} - ${initialDiagnosis.name}`
        : '-',
    ],
    ['Catatan', service.note],
  ];
  const rightFields: [string, string][] = [
    ['Peserta', participant.membership],
    ['Jns. Rawat', service.careType],
    ['Jns. Kunjungan', service.visitType],
    ['Poli Perujuk', '-'],
    ['Kls. Hak', participant.entitledClass],
    ['Kls. Rawat', isInpatient ? participant.entitledClass : '-'],
    ['Penjamin', '-'],
  ];
  const content = [
    '1 0 0 1 0 0 cm  BT /F1 12 Tf 14.4 TL ET',
    'q',
    '.85 .1 .1 rg',
    '/GS1 gs',
    'BT /F2 34 Tf 40.8 TL ET',
    '.951057 .309017 -0.309017 .951057 297.6378 210.4724 cm',
    'BT 1 0 0 1 -263.483 0 Tm (DATA DUMMY - DEMO INTEGRA) Tj T* ET',
    'Q',
    '.043137 .431373 .309804 rg',
    'n',
    '36 358.9449 m',
    '58 358.9449 l',
    '61.3168 358.9449 64 361.6281 64 364.9449 c',
    '64 386.9449 l',
    '64 390.2617 61.3168 392.9449 58 392.9449 c',
    '36 392.9449 l',
    '32.6832 392.9449 30 390.2617 30 386.9449 c',
    '30 364.9449 l',
    '30 361.6281 32.6832 358.9449 36 358.9449 c',
    'h',
    'f*',
    '1 1 1 rg',
    'BT /F2 11 Tf 13.2 TL ET',
    text(43.3315, 371.9449, 'V'),
    '0 0 0 rg',
    'BT /F2 13 Tf 15.6 TL ET',
    text(74, 378.9449, 'SURAT ELEGIBILITAS PESERTA'),
    'BT /F1 10 Tf 12 TL ET',
    text(
      74,
      364.9449,
      `${service.facilityName} (Faskes Simulasi)  ·  Sistem VEDIKA (Simulasi)`,
    ),
    'BT /F3 8 Tf 9.6 TL ET',
    text(409.6676, 378.9449, 'Dokumen contoh untuk uji sistem INTEGRA'),
    text(485.6916, 367.9449, 'Bukan dokumen resmi'),
    'n 30 350.9449 m 565.2756 350.9449 l S',
    'BT /F1 9.5 Tf 11.4 TL ET',
    ...fieldRows(leftFields, 34, 130),
    ...fieldRows(rightFields, 357.1654, 447.1654),
    'BT /F3 7.5 Tf 9 TL ET',
    text(
      34,
      155.9449,
      '*Saya menyetujui BPJS Kesehatan menggunakan informasi medis pasien jika diperlukan.',
    ),
    text(34, 145.9449, '*SEP bukan sebagai bukti penjaminan peserta.'),
    text(
      34,
      135.9449,
      `Cetakan ke 1  ${formatDate(printedAt)} ${formatTime(printedAt)} WIB  ·  DATA FIKTIF UNTUK DEMO`,
    ),
    'BT /F1 9.5 Tf 11.4 TL ET',
    text(425.5285, 213.9449, 'Pasien/Keluarga Pasien'),
    'n 428.5984 133.9449 m 523.8425 133.9449 l S',
  ].join('\n');
  return { width: PAGE_WIDTH, height: PAGE_HEIGHT, content };
}
