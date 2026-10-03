/**
 * UC-3 cloning: copies one base document set to another patient, changing only
 * age, gender wording, and vital-sign numbers. Every other sentence stays
 * identical so Uji Bukan Salinan can highlight it.
 */
import type { GeneratedDocuments } from './generation-prompt';
import { genderWord } from './generation-prompt';

export interface ClonePatient {
  age: number;
  gender: 'M' | 'F';
}

const GENDER_WORD_PATTERN = /\b(laki-laki|perempuan)\b/gi;
const BLOOD_PRESSURE_PATTERN = /\b(\d{2,3})\/(\d{2,3})(\s*mmhg)/gi;
const PULSE_PATTERN = /\b(nadi|n)(\s*:?\s*)(\d{2,3})\b/gi;
const TEMPERATURE_PATTERN = /\b(suhu|s)(\s*:?\s*)(3\d)([.,])(\d)\b/gi;

function matchCapitalization(original: string, replacement: string): string {
  return original[0] === original[0].toUpperCase()
    ? replacement[0].toUpperCase() + replacement.slice(1)
    : replacement;
}

function cloneText(
  text: string,
  base: ClonePatient,
  clone: ClonePatient,
  variant: number,
): string {
  const pulseShift = (variant % 5) * 2 - 4;
  const systolicShift = ((variant * 3) % 5) * 5 - 10;
  const diastolicShift = ((variant * 3) % 5) * 2 - 4;
  const temperatureShift = ((variant * 2) % 5) - 2;
  return text
    .replace(new RegExp(`\\b${base.age} tahun\\b`, 'g'), `${clone.age} tahun`)
    .replace(GENDER_WORD_PATTERN, (match) =>
      matchCapitalization(match, genderWord(clone.gender)),
    )
    .replace(
      BLOOD_PRESSURE_PATTERN,
      (_, systolic: string, diastolic: string, unit: string) =>
        `${Number(systolic) + systolicShift}/${Number(diastolic) + diastolicShift}${unit}`,
    )
    .replace(
      PULSE_PATTERN,
      (_, label: string, separator: string, pulse: string) =>
        `${label}${separator}${Number(pulse) + pulseShift}`,
    )
    .replace(
      TEMPERATURE_PATTERN,
      (
        _,
        label: string,
        separator: string,
        whole: string,
        decimalMark: string,
        tenth: string,
      ) => {
        const tenths = Number(whole) * 10 + Number(tenth) + temperatureShift;
        return `${label}${separator}${Math.floor(tenths / 10)}${decimalMark}${tenths % 10}`;
      },
    );
}

/** `dailyNoteCount` may be shorter than the base set when the clone stays fewer days. */
export function cloneDocuments(
  baseDocuments: GeneratedDocuments,
  base: ClonePatient,
  clone: ClonePatient,
  variant: number,
  dailyNoteCount: number,
): GeneratedDocuments {
  const copy = (text: string) => cloneText(text, base, clone, variant);
  return {
    examNote: copy(baseDocuments.examNote),
    dailyNotes: baseDocuments.dailyNotes.slice(0, dailyNoteCount).map(copy),
    prescription: copy(baseDocuments.prescription),
    procedureNote: baseDocuments.procedureNote
      ? copy(baseDocuments.procedureNote)
      : null,
    medicalResume: copy(baseDocuments.medicalResume),
  };
}
