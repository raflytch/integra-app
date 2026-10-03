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

export function ClaimDocuments({ documents }: { documents: ClaimDocument[] }) {
  return (
    <section
      aria-labelledby="claim-documents-heading"
      className="rounded-xl border border-linen-border bg-eggshell-canvas p-4"
    >
      <h2
        id="claim-documents-heading"
        className="text-sm font-medium text-graphite"
      >
        Rekam medis
      </h2>
      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-quiet-gray">
          Klaim ini belum punya dokumen klinis.
        </p>
      ) : (
        <Accordion type="multiple">
          {documents.map((document) => (
            <AccordionItem
              key={document.id}
              value={document.id}
              id={`document-${document.id}`}
              className="scroll-mt-20 border-linen-border"
            >
              <AccordionTrigger className="py-3 text-sm text-graphite hover:no-underline">
                <span className="flex flex-col items-start gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {DOCUMENT_TYPE_LABELS[document.type]}
                    {document.isExtracted && <ReadByAiPill />}
                  </span>
                  <span className="text-xs font-normal text-quiet-gray">
                    {formatDateTime(document.recordedAt)}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm whitespace-pre-line text-charcoal-copy">
                {document.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  );
}
