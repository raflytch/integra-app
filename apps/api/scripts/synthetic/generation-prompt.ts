import { z } from 'zod';
import {
  CANONICAL_TERMS,
  TERM_SYNONYMS,
} from '../../src/domain/analysis/clinical-vocabulary';
import type { ClaimPlan } from './claim-plans';
import {
  type ContentRule,
  DISEASES,
  GLOBAL_RULES,
  type RuleTarget,
  type ScenarioSpec,
} from './scenarios';

/** LLM output: every document of one claim in a single call. */
export const generatedDocumentsSchema = z.object({
  examNote: z.string().min(1),
  dailyNotes: z.array(z.string().min(1)),
  prescription: z.string().min(1),
  procedureNote: z.string().min(1).nullable(),
  medicalResume: z.string().min(1),
});

export type GeneratedDocuments = z.infer<typeof generatedDocumentsSchema>;

const TARGET_LABELS: Readonly<Record<RuleTarget, string>> = {
  ALL: 'gabungan semua dokumen',
  EXAM_NOTE: 'catatan pemeriksaan (examNote)',
  DAILY_NOTES: 'gabungan catatan harian (dailyNotes)',
  FIRST_DAILY_NOTE: 'catatan harian pertama (dailyNotes[0])',
  PRESCRIPTION: 'resep (prescription)',
  PROCEDURE: 'catatan tindakan (procedureNote)',
  MEDICAL_RESUME: 'resume medis (medicalResume)',
};

export function genderWord(gender: 'M' | 'F'): string {
  return gender === 'M' ? 'laki-laki' : 'perempuan';
}

export const GENERATION_SYSTEM_PROMPT = [
  'Kamu menulis rekam medis rawat inap SINTETIS untuk menguji perangkat lunak verifikasi klaim. Semua isi fiktif.',
  '',
  'Gaya penulisan:',
  '- Singkat seperti catatan klinis nyata di rumah sakit Indonesia; singkatan umum boleh (TD, N, S, RR, SpO2, IV, PO).',
  '- Resume medis 80-150 kata. Dokumen lain 20-80 kata.',
  '- Jangan menulis tanggal kalender atau nama bulan; waktu dokumen sudah dicatat terpisah. Pakai "hari rawat ke-2" bila perlu.',
  '- Jangan menulis nama orang, nama dokter, atau nama rumah sakit. Sebut pasien sebagai "pasien".',
  '- Jangan pernah menulis kata "fraud", "upcoding", atau "sisipan".',
  '- Tulis angka tanda vital apa adanya, misalnya "TD 110/70 mmHg, N 88x/menit, S 38,5°C". Istilah hipotensi, desaturasi, atau resusitasi cairan hanya ditulis bila diminta instruksi klaim.',
  '- Untuk hal yang memang ada, pakai istilah kanonik berikut persis seperti tertulis:',
  `  - temuan: ${CANONICAL_TERMS.findings.join(', ')}`,
  `  - tanda vital: ${CANONICAL_TERMS.vitalSigns.join(', ')}`,
  `  - obat: ${CANONICAL_TERMS.medications.join(', ')}`,
  `  - tindakan: ${CANONICAL_TERMS.procedures.join(', ')}`,
  `- Hindari sinonim berikut; pakai istilah kanoniknya: ${Object.keys(TERM_SYNONYMS).join(', ')}.`,
  '',
  'Isi tiap field:',
  '- examNote: catatan pemeriksaan dokter saat masuk (anamnesis singkat, pemeriksaan fisik, tanda vital).',
  '- dailyNotes: catatan harian (format SOAP singkat), satu string per hari rawat, berurutan.',
  '- prescription: resep dan instruksi obat hari masuk.',
  '- procedureNote: catatan tindakan penunjang, atau null bila diminta tidak ada.',
  '- medicalResume: resume medis saat pulang (keluhan masuk, pemeriksaan, diagnosis, terapi, kondisi pulang).',
].join('\n');

function describeRules(rules: readonly ContentRule[]): string[] {
  const required = rules.flatMap((rule) =>
    (rule.mustContain ?? []).map(
      (term) => `- "${term}" di ${TARGET_LABELS[rule.target]}`,
    ),
  );
  const forbidden = rules.flatMap((rule) =>
    (rule.mustNotContain ?? []).map(
      (term) => `- "${term}" di ${TARGET_LABELS[rule.target]}`,
    ),
  );
  return [
    'Istilah wajib (harus muncul persis, huruf besar-kecil bebas):',
    ...(required.length > 0 ? required : ['- tidak ada']),
    'Istilah terlarang (tidak boleh muncul sama sekali, termasuk sebagai bagian kata):',
    ...(forbidden.length > 0 ? forbidden : ['- tidak ada']),
  ];
}

export function buildGenerationPrompt(
  plan: ClaimPlan,
  generationScenario: ScenarioSpec,
): string {
  const disease = DISEASES[generationScenario.disease];
  const { claim, slots } = plan;
  const secondaryDiagnosis = claim.diagnoses.find(
    (diagnosis) => !diagnosis.isPrimary,
  );
  return [
    'Tulis seluruh dokumen untuk klaim rawat inap berikut.',
    '',
    `- Pasien: ${genderWord(plan.patient.gender)}, ${plan.age} tahun`,
    `- Diagnosis utama: ${disease.primaryDiagnosis.name} (${disease.primaryDiagnosis.icd10Code})`,
    `- Diagnosis sekunder: ${secondaryDiagnosis ? `${secondaryDiagnosis.name} (${secondaryDiagnosis.icd10Code})` : 'tidak ada'}`,
    `- Lama rawat: ${plan.lengthOfStayDays} hari`,
    `- Jumlah catatan harian: ${slots.dailyNotes.length} (dailyNotes berisi tepat ${slots.dailyNotes.length} string)`,
    `- Catatan tindakan: ${disease.procedure ?? 'tidak ada, isi procedureNote dengan null'}`,
    `- Gambaran klinis umum: ${disease.clinicalOutline}`,
    '',
    'Ciri khusus klaim ini:',
    ...generationScenario.narrative.map((line) => `- ${line}`),
    `- Resume medis menyebut "${genderWord(plan.patient.gender)}" dan "${plan.age} tahun".`,
    '',
    ...describeRules([...GLOBAL_RULES, ...generationScenario.rules]),
  ].join('\n');
}

function targetTexts(
  documents: GeneratedDocuments,
  target: RuleTarget,
): string[] {
  switch (target) {
    case 'ALL':
      return [
        documents.examNote,
        ...documents.dailyNotes,
        documents.prescription,
        documents.procedureNote ?? '',
        documents.medicalResume,
      ];
    case 'EXAM_NOTE':
      return [documents.examNote];
    case 'DAILY_NOTES':
      return documents.dailyNotes;
    case 'FIRST_DAILY_NOTE':
      return documents.dailyNotes.slice(0, 1);
    case 'PRESCRIPTION':
      return [documents.prescription];
    case 'PROCEDURE':
      return [documents.procedureNote ?? ''];
    case 'MEDICAL_RESUME':
      return [documents.medicalResume];
  }
}

/** Lists every structural and content rule the generated documents break. */
export function findRuleViolations(
  documents: GeneratedDocuments,
  plan: ClaimPlan,
  generationScenario: ScenarioSpec,
): string[] {
  const violations: string[] = [];
  const expectedDailyNoteCount = plan.slots.dailyNotes.length;
  if (documents.dailyNotes.length !== expectedDailyNoteCount) {
    violations.push(
      `dailyNotes harus berisi ${expectedDailyNoteCount} string, bukan ${documents.dailyNotes.length}`,
    );
  }
  if (plan.slots.procedure !== null && documents.procedureNote === null) {
    violations.push('procedureNote wajib diisi');
  }

  const rules: ContentRule[] = [
    ...GLOBAL_RULES,
    ...generationScenario.rules,
    {
      target: 'MEDICAL_RESUME',
      mustContain: [genderWord(plan.patient.gender), `${plan.age} tahun`],
    },
  ];
  for (const rule of rules) {
    const combinedText = targetTexts(documents, rule.target)
      .join('\n')
      .toLowerCase();
    for (const term of rule.mustContain ?? []) {
      if (!combinedText.includes(term.toLowerCase())) {
        violations.push(`"${term}" wajib ada di ${TARGET_LABELS[rule.target]}`);
      }
    }
    for (const term of rule.mustNotContain ?? []) {
      if (combinedText.includes(term.toLowerCase())) {
        violations.push(
          `"${term}" tidak boleh ada di ${TARGET_LABELS[rule.target]}`,
        );
      }
    }
  }
  return violations;
}
