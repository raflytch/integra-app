const JSON_RECORDS_PER_CHUNK = 5;
const CSV_ROWS_PER_CHUNK = 40;
const TEXT_CHUNK_MAX_BYTES = 12 * 1024;

export interface ImportChunk {
  /** What the AI reads. */
  text: string;
  /** What normalized content must be found in (string values for JSON). */
  sourceText: string;
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/** The array of records in a parsed JSON file: the top-level array or the first array of objects inside it. */
function findJsonRecords(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) {
    const nestedArray = Object.values(parsed).find(
      (value) =>
        Array.isArray(value) &&
        value.some((item) => typeof item === 'object' && item !== null),
    );
    if (Array.isArray(nestedArray)) return nestedArray;
  }
  return [parsed];
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => [
      key,
      ...collectStringValues(item),
    ]);
  }
  return [];
}

function chunkJsonRecords(records: unknown[]): ImportChunk[] {
  const chunks: ImportChunk[] = [];
  for (let start = 0; start < records.length; start += JSON_RECORDS_PER_CHUNK) {
    const chunkRecords = records.slice(start, start + JSON_RECORDS_PER_CHUNK);
    chunks.push({
      text: JSON.stringify(chunkRecords, null, 2),
      sourceText: collectStringValues(chunkRecords).join('\n'),
    });
  }
  return chunks;
}

/** CSV records as raw text, keeping quoted line breaks inside one record. */
function splitCsvRecords(content: string): string[] {
  const records: string[] = [];
  let current = '';
  let isQuoted = false;
  for (const character of content.replace(/\r\n?/g, '\n')) {
    if (character === '"') isQuoted = !isQuoted;
    if (character === '\n' && !isQuoted) {
      if (current.trim()) records.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) records.push(current);
  return records;
}

function firstCsvField(record: string, delimiter: string): string {
  let field = '';
  let isQuoted = false;
  for (const character of record) {
    if (character === '"') {
      isQuoted = !isQuoted;
      continue;
    }
    if (character === delimiter && !isQuoted) break;
    field += character;
  }
  return field.trim();
}

/** Comma, or semicolon for spreadsheet exports with an Indonesian locale. */
function detectCsvDelimiter(header: string): string {
  const count = (delimiter: string) => header.split(delimiter).length;
  return count(';') > count(',') ? ';' : ',';
}

/** Rows sharing a first-column value (usually the claim number) stay in one chunk. */
function chunkCsv(content: string): ImportChunk[] {
  const [header, ...rows] = splitCsvRecords(content);
  if (!header) return [];
  const delimiter = detectCsvDelimiter(header);
  const rowGroups = new Map<string, string[]>();
  for (const row of rows) {
    const key = firstCsvField(row, delimiter);
    rowGroups.set(key, [...(rowGroups.get(key) ?? []), row]);
  }

  const chunks: ImportChunk[] = [];
  let chunkRows: string[] = [];
  const flush = () => {
    if (chunkRows.length === 0) return;
    const text = [header, ...chunkRows].join('\n');
    chunks.push({ text, sourceText: text.replace(/""/g, '"') });
    chunkRows = [];
  };
  for (const group of rowGroups.values()) {
    if (
      chunkRows.length > 0 &&
      chunkRows.length + group.length > CSV_ROWS_PER_CHUNK
    ) {
      flush();
    }
    chunkRows.push(...group);
  }
  flush();
  return chunks;
}

/** Paragraphs packed up to 12 KB; a longer paragraph becomes its own chunk. */
function chunkText(content: string): ImportChunk[] {
  const paragraphs = content
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: ImportChunk[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (current && byteLength(candidate) > TEXT_CHUNK_MAX_BYTES) {
      chunks.push({ text: current, sourceText: current });
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push({ text: current, sourceText: current });
  return chunks;
}

/** The parsed value, or `undefined` when the content is not JSON. */
export function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Splits a non-canonical file so that no claim is cut across two AI calls.
 * `parsedJson` is the result of `parseJsonContent`.
 */
export function splitImportFile(
  fileName: string,
  content: string,
  parsedJson: unknown,
): ImportChunk[] {
  if (parsedJson !== undefined) {
    return chunkJsonRecords(findJsonRecords(parsedJson));
  }
  return fileName.toLowerCase().endsWith('.csv')
    ? chunkCsv(content)
    : chunkText(content);
}
