import { LuCircleCheck, LuCircleDashed } from 'react-icons/lu';
import { DecisionActionPill, Pill } from '@/components/claim-pills';
import { DOCUMENT_TYPE_LABELS } from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import type { ClaimDecision, ClaimDetail } from '@/types/claim.types';

const SCORE_FORMATTER = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  const { verification } = claim;

  return (
    <section
      aria-labelledby="verification-heading"
      className="grid gap-4 rounded-xl border border-hairline bg-surface p-4 shadow-xs md:grid-cols-2"
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
      <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-canvas p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-small font-semibold text-ink">
            Rekomendasi INTEGRA
          </h3>
          <Pill tone="outline">Asumsi</Pill>
        </div>
        {verification ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <DecisionActionPill action={verification.recommendation} />
              <span className="text-small text-ink-secondary">
                Skor korelasi{' '}
                <span className="font-display text-subhead font-semibold text-ink tabular-nums">
                  {SCORE_FORMATTER.format(verification.score)}
                </span>
              </span>
            </div>
            <p className="text-small text-ink">{verification.reason}</p>
            <p className="text-caption text-ink-secondary">
              Skor dan ambang masih asumsi: skor = 1 dikurangi kekuatan temuan
              terkuat; 0,80 ke atas Setujui, 0,50 sampai 0,79 Minta klarifikasi,
              di bawah 0,50 atau ada dokumen tersalin Eskalasi.
            </p>
          </>
        ) : (
          <p className="text-small text-ink-secondary">
            Skor dan rekomendasi muncul setelah klaim dianalisis AI.
          </p>
        )}
      </div>
    </section>
  );
}
