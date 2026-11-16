const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const MAX_LINE_CHARACTERS = 88;
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LINE_HEIGHT);

export interface RawPdfPage {
  width: number;
  height: number;
  content: string;
}

export interface PdfTextItem {
  x: number;
  y: number;
  text: string;
  size?: number;
  bold?: boolean;
}

function toLatin1(text: string): string {
  return text
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
}

export function escapePdfText(text: string): string {
  return toLatin1(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(paragraph: string): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    if (line && line.length + word.length + 1 > MAX_LINE_CHARACTERS) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return [...lines, line];
}

export function layoutTextPages(paragraphs: string[]): PdfTextItem[][] {
  const lines = paragraphs.flatMap((paragraph) => [...wrap(paragraph), '']);
  return Array.from(
    { length: Math.max(1, Math.ceil(lines.length / LINES_PER_PAGE)) },
    (_, pageIndex) =>
      lines
        .slice(pageIndex * LINES_PER_PAGE, (pageIndex + 1) * LINES_PER_PAGE)
        .map((text, lineIndex) => ({
          x: MARGIN,
          y: PAGE_HEIGHT - MARGIN - lineIndex * LINE_HEIGHT,
          text,
        })),
  );
}

function toRawPage(items: PdfTextItem[]): RawPdfPage {
  return {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    content: items
      .map(
        ({ x, y, text, size = FONT_SIZE, bold = false }) =>
          `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`,
      )
      .join('\n'),
  };
}

export function renderPdf(pages: (PdfTextItem[] | RawPdfPage)[]): Uint8Array {
  const rawPages = pages.map((page) =>
    Array.isArray(page) ? toRawPage(page) : page,
  );
  const objects: string[] = [];
  const pageIds = rawPages.map((_, index) => 7 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${rawPages.length} >>`;
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[5] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';
  objects[6] = '<< /Type /ExtGState /ca .1 >>';
  rawPages.forEach(({ width, height, content }, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> /ExtGState << /GS1 6 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] =
      `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
  });

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(body, 'latin1');
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, 'latin1'));
}

export function renderTextPdf(paragraphs: string[]): Uint8Array {
  return renderPdf(layoutTextPages(paragraphs));
}
