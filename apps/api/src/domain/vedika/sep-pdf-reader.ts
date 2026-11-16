export interface ScannedSepField {
  label: string;
  value: string;
}

const SEP_PAGE_TITLE = 'SURAT ELEGIBILITAS PESERTA';
const POSITIONED_TEXT_PATTERN =
  /BT 1 0 0 1 -?[\d.]+ -?[\d.]+ Tm \(((?:\\.|[^\\)])*)\) Tj/g;
const VALUE_PREFIX = ': ';

function unescapePdfText(text: string): string {
  return text.replace(/\\([\\()])/g, '$1');
}

export function readSepFields(pdf: Uint8Array): ScannedSepField[] {
  const source = Buffer.from(pdf).toString('latin1');
  if (!source.includes(SEP_PAGE_TITLE)) return [];
  const texts = [...source.matchAll(POSITIONED_TEXT_PATTERN)].map((match) =>
    unescapePdfText(match[1]),
  );
  return texts.flatMap((label, index) => {
    const value = texts[index + 1];
    return !label.startsWith(VALUE_PREFIX) && value?.startsWith(VALUE_PREFIX)
      ? [{ label, value: value.slice(VALUE_PREFIX.length).trim() }]
      : [];
  });
}
