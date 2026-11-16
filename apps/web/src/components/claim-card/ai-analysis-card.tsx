'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  LuCircleCheck,
  LuClock,
  LuCopy,
  LuFileSearch,
  LuFlag,
  LuGitCompareArrows,
  LuLightbulb,
  LuSparkles,
} from 'react-icons/lu';
import { useClaimAnalysisRunner } from '@/components/analysis/use-claim-analysis-runner';
import { Button } from '@/components/ui/button';
import {
  DecisionActionPill,
  IntegraAiPill,
  Pill,
} from '@/components/claim-pills';
import { EVIDENCE_STATUS_LABELS, TEST_TYPE_DETAILS } from '@/lib/claim-labels';
import { formatDateTime, formatPercent } from '@/lib/format';
import type { ClaimDetail, TestType } from '@/types/claim.types';
import {
  ClaimLink,
  LinkedClaimText,
  relatedClaimsOf,
} from './linked-claim-text';
import { findSimilarityCoverage } from './test-overviews';

const COPIED_DOCUMENT_SIMILARITY = 0.9;

interface TestSummary {
  testType: TestType;
  icon: IconType;
  isFlagged: boolean;
  isUnassessed: boolean;
  isSupporting: boolean;
  sentence: ReactNode;
}

function describePendingAnalysis(claim: ClaimDetail): {
  headline: string;
  suggestion: string;
} | null {
  const documentCount = claim.documents.length;
  const extractedDocumentCount = claim.documents.filter(
    (document) => document.isExtracted,
  ).length;

  if (documentCount === 0 || extractedDocumentCount < documentCount) {
    return {
      headline: `Rekam medis belum selesai dibaca AI (${extractedDocumentCount} dari ${documentCount} dokumen).`,
      suggestion:
        'Klik Analisis di kartu ini agar AI membaca rekam medisnya dan aturan INTEGRA mengujinya.',
    };
  }
  if (!claim.analyzedAt || !claim.verification) {
    return {
      headline: 'Rekam medis sudah dibaca AI, aturan INTEGRA belum dijalankan.',
      suggestion:
        'Klik Analisis di kartu ini. Tidak ada dokumen baru yang dikirim ke AI, jadi tanpa biaya token.',
    };
  }
  return null;
}

function summarizeTests(claim: ClaimDetail): TestSummary[] {
  const findingsOf = (testType: TestType) =>
    claim.findings.filter((finding) => finding.testType === testType);
  const similarityFindings = findingsOf('SIMILARITY');
  const diagnosisStatuses = claim.diagnoses.flatMap((diagnosis) =>
    diagnosis.evidenceStatus
      ? [{ name: diagnosis.name, status: diagnosis.evidenceStatus }]
      : [],
  );
  const flaggedStatuses = diagnosisStatuses.filter(
    ({ status }) => status !== 'SUPPORTED',
  );
  const consistencyCount = findingsOf('CONSISTENCY').length;
  const existenceCount = findingsOf('EXISTENCE').length;
  const unassessedCount = claim.verification?.unassessedDiagnoses.length ?? 0;
  const coverage = findSimilarityCoverage(claim);
  const highestSimilarity = Math.max(
    0,
    ...similarityFindings.map((finding) => finding.similarity ?? 0),
  );
  const isEscalated = highestSimilarity >= COPIED_DOCUMENT_SIMILARITY;

  return [
    {
      testType: 'SIMILARITY',
      icon: LuCopy,
      isFlagged: similarityFindings.length > 0,
      isUnassessed: false,
      isSupporting: false,
      sentence:
        similarityFindings.length > 0 ? (
          <>
            Mirip sampai {formatPercent(highestSimilarity)} dengan{' '}
            {relatedClaimsOf(similarityFindings).map((relatedClaim, index) => (
              <span key={relatedClaim.id}>
                {index > 0 && ', '}
                <ClaimLink claim={relatedClaim} />
              </span>
            ))}
            {isEscalated
              ? `, nyaris salinan utuh (≥${formatPercent(COPIED_DOCUMENT_SIMILARITY)}).`
              : ', di atas ambang kemiripan. Perlu dicek, belum tentu salinan.'}
          </>
        ) : coverage ? (
          `Paling mirip ${formatPercent(coverage.max)}, di bawah ambang ${formatPercent(coverage.threshold)} untuk penyakit ini.`
        ) : (
          'Ambang kemiripan belum dihitung untuk klaim ini.'
        ),
    },
    {
      testType: 'EXISTENCE',
      icon: LuFileSearch,
      isFlagged: flaggedStatuses.length > 0 || existenceCount > 0,
      isUnassessed: unassessedCount > 0,
      isSupporting: isEscalated,
      sentence:
        flaggedStatuses.length > 0
          ? flaggedStatuses
              .map(
                ({ name, status }) =>
                  `${name}: ${EVIDENCE_STATUS_LABELS[status]}`,
              )
              .join(' · ')
          : existenceCount > 0
            ? `${existenceCount} diagnosis sekunder belum didukung bukti.`
            : unassessedCount > 0
              ? `Belum ada aturan PNPK untuk ${claim.verification?.unassessedDiagnoses.join(', ')}.`
              : diagnosisStatuses.length > 0
                ? 'Semua diagnosis sekunder didukung bukti klinis.'
                : 'Tidak ada diagnosis sekunder.',
    },
    {
      testType: 'CONSISTENCY',
      icon: LuGitCompareArrows,
      isFlagged: consistencyCount > 0,
      isUnassessed: false,
      isSupporting: isEscalated,
      sentence:
        consistencyCount > 0
          ? `${consistencyCount} catatan tidak sejalan dengan catatan lain atau data rumah sakit.`
          : 'Isi dokumen sejalan satu sama lain dan dengan data rumah sakit.',
    },
  ];
}

export function AiAnalysisCard({ claim }: { claim: ClaimDetail }) {
  const pendingAnalysis = describePendingAnalysis(claim);
  const { verification } = claim;
  const analysisRunner = useClaimAnalysisRunner();
  const unreadDocumentCount = claim.documents.filter(
    (document) => !document.isExtracted,
  ).length;

  return (
    <section
      aria-labelledby="ai-analysis-heading"
      data-tour="claim-ai-analysis"
      className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-surface p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <IntegraAiPill />
        {claim.analyzedAt ? (
          <Pill tone="neutral" icon={LuClock}>
            Dianalisis{' '}
            <time dateTime={claim.analyzedAt}>
              {formatDateTime(claim.analyzedAt)}
            </time>
          </Pill>
        ) : (
          <Pill tone="outline">Belum dianalisis AI</Pill>
        )}
        {(!claim.analyzedAt || unreadDocumentCount > 0) && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={analysisRunner.isRunning}
            onClick={() =>
              analysisRunner.requestAnalysis([
                { id: claim.id, claimNo: claim.claimNo, unreadDocumentCount },
              ])
            }
          >
            <LuSparkles aria-hidden="true" />
            Analisis
          </Button>
        )}
      </div>
      <h2
        id="ai-analysis-heading"
        className="font-display text-body font-semibold tracking-display text-primary-hover"
      >
        Hasil INTEGRA
      </h2>

      {pendingAnalysis || !verification ? (
        <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary-wash px-4 py-3">
          <LuLightbulb
            className="mt-0.5 size-4 shrink-0 text-primary-hover"
            aria-hidden="true"
          />
          <p className="text-small text-ink">
            <span className="font-semibold text-primary-hover">
              {pendingAnalysis?.headline}{' '}
            </span>
            {pendingAnalysis?.suggestion}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary-wash px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-small font-semibold text-ink">
                Keputusan per SEP
              </span>
              {verification.recommendation ? (
                <DecisionActionPill action={verification.recommendation} />
              ) : (
                <Pill tone="outline">Belum bisa dinilai</Pill>
              )}
            </div>
            <p className="text-small text-ink">
              <LinkedClaimText
                text={verification.reason}
                relatedClaims={relatedClaimsOf(claim.findings)}
              />
            </p>
            <p className="text-caption text-ink-secondary">
              Salinan (mirip ≥90%): Eskalasi. Bukti kurang atau ada temuan:
              Minta Klarifikasi. Semua lengkap: Setuju. Ada diagnosis sekunder
              tanpa aturan PNPK: belum bisa dinilai. (Peraturan BPJS 7/2018,
              Kepmenkes 129/2008, Permenkes 16/2019)
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
            {summarizeTests(claim).map((testSummary) => (
              <li
                key={testSummary.testType}
                className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <a
                  href={`#panel-${testSummary.testType.toLowerCase()}`}
                  className="flex w-44 shrink-0 items-center gap-2 text-small font-semibold text-ink hover:text-primary-hover hover:underline"
                >
                  <testSummary.icon
                    className="size-4 text-primary-hover"
                    aria-hidden="true"
                  />
                  {TEST_TYPE_DETAILS[testSummary.testType].title}
                </a>
                <span className="flex shrink-0 gap-1">
                  {testSummary.isFlagged ? (
                    <Pill tone="warning" icon={LuFlag}>
                      Ditandai
                    </Pill>
                  ) : testSummary.isUnassessed ? (
                    <Pill tone="outline">Belum bisa dinilai</Pill>
                  ) : (
                    <Pill tone="success" icon={LuCircleCheck}>
                      Sesuai
                    </Pill>
                  )}
                  {testSummary.isSupporting && testSummary.isFlagged && (
                    <Pill tone="outline">Pendukung</Pill>
                  )}
                </span>
                <span className="text-small text-ink-secondary">
                  {testSummary.sentence}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {analysisRunner.dialogs}
    </section>
  );
}
