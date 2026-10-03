import { z } from 'zod';
import {
  CLAIM_IMPORT_FORMAT,
  canonicalClaimObjectSchema,
} from './claim-import.schema';

export const CLAIM_IMPORT_SYSTEM_PROMPT = [
  `Anda menyusun ulang data klaim rawat inap BPJS Kesehatan dari sebuah file ke format baku INTEGRA (${CLAIM_IMPORT_FORMAT}).`,
  'Aturan wajib:',
  '- Hanya menyusun ulang. Jangan menambah, meringkas, menerjemahkan, atau memperbaiki isi.',
  '- `content` setiap dokumen disalin kata per kata dari file, persis seperti tertulis, termasuk angka dan tanda baca.',
  '- `claimNo` disalin persis dari file.',
  '- Jangan mengarang nilai apa pun. Jika satu field wajib tidak ada di file, jangan isi dengan tebakan: masukkan klaim itu ke `skipped` dengan `reference` (nomor klaim atau penanda baris) dan `reason` yang menyebut field yang tidak ada.',
  '- Satu klaim bisa tersebar di beberapa baris atau record (misalnya satu baris per dokumen); gabungkan menjadi satu klaim dengan beberapa dokumen.',
  '- Petakan nilai ke enum dan format baku:',
  '  - tipe dokumen: EXAM_NOTE (catatan pemeriksaan/IGD/anamnesis), DAILY_NOTE (catatan harian/CPPT/visite), PRESCRIPTION (resep/obat), PROCEDURE (tindakan/pemeriksaan penunjang), MEDICAL_RESUME (resume medis/ringkasan pulang);',
  '  - tanggal: YYYY-MM-DD; waktu dokumen: ISO 8601 dengan offset, pakai +07:00 jika file tidak menyebut zona waktu; jika dokumen hanya punya tanggal, pakai jam 00:00;',
  '  - jenis kelamin: M (laki-laki/L/pria) atau F (perempuan/P/wanita);',
  '  - tipe faskes: A, B, C, atau D;',
  '  - severityLevel: 1, 2, atau 3 (I, II, III); tariffAmount: angka rupiah tanpa titik ribuan atau simbol;',
  '  - isPrimary: true hanya untuk diagnosis utama.',
  'Bentuk setiap klaim (JSON schema):',
  JSON.stringify(z.toJSONSchema(canonicalClaimObjectSchema)),
].join('\n');

export function buildClaimImportMessage(
  fileName: string,
  chunkText: string,
  chunkNumber: number,
  chunkCount: number,
): string {
  return `Nama file: ${fileName}\nBagian ${chunkNumber} dari ${chunkCount}\n\n<file>\n${chunkText}\n</file>`;
}
