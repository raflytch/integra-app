import { DOCUMENT_TYPE_LABELS, EVIDENCE_TYPE_LABELS } from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import type { ClaimDocument, FindingCitation } from '@/types/claim.types';

function DocumentSource({ document }: { document: ClaimDocument | undefined }) {
  if (!document) return null;
  return (
    <a
      data-tour="claim-citation-source"
      href={`#document-${document.id}`}
      className="text-xs text-integra-teal hover:underline"
    >
      {DOCUMENT_TYPE_LABELS[document.type]} ·{' '}
      {formatDateTime(document.recordedAt)}
    </a>
  );
}

export function FindingCitationItem({
  citation,
  documentsById,
}: {
  citation: FindingCitation;
  documentsById: Map<string, ClaimDocument>;
}) {
  if (citation.kind === 'MISSING_EVIDENCE') {
    return (
      <div className="flex flex-col gap-1 rounded-md bg-paper-beige px-3 py-2">
        <p className="text-xs text-quiet-gray">
          Bukti tidak ditemukan · {EVIDENCE_TYPE_LABELS[citation.evidenceType]}
        </p>
        <p className="text-sm font-medium text-graphite">{citation.expected}</p>
        <p className="text-xs text-charcoal-copy">{citation.guidelineRef}</p>
      </div>
    );
  }

  if (citation.kind === 'QUOTE') {
    return (
      <figure className="flex flex-col gap-1 border-l-2 border-integra-mint pl-3">
        <blockquote className="text-sm text-charcoal-copy">
          “{citation.quote}”
        </blockquote>
        <figcaption>
          <DocumentSource document={documentsById.get(citation.documentId)} />
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="flex flex-col gap-1">
      <blockquote className="text-sm text-charcoal-copy">
        <mark className="rounded-sm bg-integra-wash px-0.5 text-graphite">
          {citation.text}
        </mark>
      </blockquote>
      <figcaption>
        <DocumentSource document={documentsById.get(citation.documentId)} />
      </figcaption>
    </figure>
  );
}
