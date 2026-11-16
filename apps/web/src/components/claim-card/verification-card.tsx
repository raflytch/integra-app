import { LuCircleCheck, LuCircleDashed } from 'react-icons/lu';
import { DecisionActionPill } from '@/components/claim-pills';
import { DOCUMENT_TYPE_LABELS } from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import type { ClaimDecision, ClaimDetail } from '@/types/claim.types';

function MissingDocumentChecklist({ decision }: { decision: ClaimDecision }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-caption text-ink-secondary">
        Dokumen yang perlu dilengkapi di VEDIKA
      </h3>
      <ul className="flex flex-col gap-1.5">
        {decision.missingDocuments.map((missingDocument) => {
          const isReceived = missingDocument.receivedAt !== null;
          const Icon = isReceived ? LuCircleCheck : LuCircleDashed;
          return (
            <li
              key={missingDocument.documentType}
              className="flex items-center gap-2 text-small text-ink"
            >
              <Icon
                aria-hidden="true"
                className={isReceived ? 'text-success' : 'text-warning'}
              />
              <span>{DOCUMENT_TYPE_LABELS[missingDocument.documentType]}</span>
              <span className="text-caption text-ink-secondary">
                {isReceived ? 'Sudah masuk' : 'Belum masuk'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VerificationCard({ claim }: { claim: ClaimDetail }) {
  const latestDecision = claim.decisions[0];

  return (
    <section
      aria-labelledby="verification-heading"
      className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2
            id="verification-heading"
            className="text-body font-semibold tracking-display text-ink"
          >
            Hasil verifikasi
          </h2>
          <p className="text-caption text-ink-secondary">
            No. SEP <span className="font-mono text-ink">{claim.claimNo}</span>
          </p>
        </div>
        {latestDecision ? (
          <div className="flex flex-col items-start gap-1.5">
            <DecisionActionPill action={latestDecision.action} />
            <p className="text-small text-ink">{latestDecision.reason}</p>
            <p className="text-caption text-ink-secondary">
              {latestDecision.verifier.name} ·{' '}
              {formatDateTime(latestDecision.createdAt)}
            </p>
            {latestDecision.action === 'REQUEST_CLARIFICATION' &&
              latestDecision.missingDocuments.length > 0 && (
                <MissingDocumentChecklist decision={latestDecision} />
              )}
          </div>
        ) : (
          <p className="text-small text-ink-secondary">
            Belum ada keputusan verifikator untuk SEP ini.
          </p>
        )}
      </div>
    </section>
  );
}
