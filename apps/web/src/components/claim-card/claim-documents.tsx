import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ReadByAiPill } from '@/components/claim-pills';
import { DOCUMENT_TYPE_LABELS } from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import type { ClaimDocument } from '@/types/claim.types';

/** Sentence ends at . ! ? followed by whitespace, or at a line break; decimals stay intact. */
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+|\n+/;

export function ClaimDocuments({ documents }: { documents: ClaimDocument[] }) {
  return (
    <section
      aria-labelledby="claim-documents-heading"
      className="rounded-xl border border-hairline bg-surface shadow-xs p-4"
    >
      <h2
        id="claim-documents-heading"
        className="text-body font-semibold tracking-display text-ink"
      >
        Rekam medis
      </h2>
      {documents.length === 0 ? (
        <p className="mt-3 text-small text-ink-secondary">
          Klaim ini belum punya dokumen klinis.
        </p>
      ) : (
        <Accordion type="multiple">
          {documents.map((document) => (
            <AccordionItem
              key={document.id}
              value={document.id}
              id={`document-${document.id}`}
              className="scroll-mt-20 border-hairline"
            >
              <AccordionTrigger className="py-3 text-small text-ink hover:no-underline">
                <span className="flex flex-col items-start gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {DOCUMENT_TYPE_LABELS[document.type]}
                    {document.isExtracted && <ReadByAiPill />}
                  </span>
                  <span className="text-caption font-normal text-ink-secondary">
                    {formatDateTime(document.recordedAt)}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline text-small text-ink-secondary">
                  {document.content
                    .split(SENTENCE_BOUNDARY_PATTERN)
                    .filter((sentence) => sentence.trim())
                    .map((sentence, sentenceIndex) => (
                      <li key={sentenceIndex} className="px-3 py-2">
                        {sentence}
                      </li>
                    ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  );
}
