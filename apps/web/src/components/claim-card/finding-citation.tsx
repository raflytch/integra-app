import { DOCUMENT_TYPE_LABELS, EVIDENCE_TYPE_LABELS } from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import type { ClaimDocument, FindingCitation } from '@/types/claim.types';

function DocumentSource({ document }: { document: ClaimDocument | undefined }) {
  if (!document) return null;
  return (
    <a
      href={`#document-${document.id}`}
      className="text-caption text-primary-hover hover:underline"
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
      <div className="flex flex-col gap-1 rounded-lg border border-hairline bg-canvas px-3 py-2">
        <p className="text-caption text-ink-secondary">
          Bukti tidak ditemukan · {EVIDENCE_TYPE_LABELS[citation.evidenceType]}
        </p>
        <p className="text-small font-medium text-ink">{citation.expected}</p>
        <p className="text-caption text-ink-secondary">
          {citation.guidelineRef}
        </p>
      </div>
    );
  }

  if (citation.kind === 'QUOTE') {
    return (
      <figure className="flex flex-col gap-1 border-l-2 border-ink-muted pl-3">
        <blockquote className="text-small text-ink-secondary">
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
      <blockquote className="text-small text-ink-secondary">
        <mark className="rounded-sm bg-warning/20 px-0.5 text-ink">
          {citation.text}
        </mark>
      </blockquote>
      <figcaption>
        <DocumentSource document={documentsById.get(citation.documentId)} />
      </figcaption>
    </figure>
  );
}
