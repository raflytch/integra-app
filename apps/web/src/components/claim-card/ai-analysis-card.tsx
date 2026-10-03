import type { IconType } from 'react-icons';
import {
  LuClock,
  LuLightbulb,
  LuScale,
  LuSparkles,
  LuUserCheck,
} from 'react-icons/lu';
import { IntegraAiPill, Pill } from '@/components/claim-pills';
import { AnalyzeClaimButton } from './analyze-claim-button';
import { TEST_TYPE_DETAILS, TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { ClaimDetail } from '@/types/claim.types';

interface AnalysisNarrative {
  headline: string;
  explanation: string;
  suggestion: string;
}

function describeAnalysis(claim: ClaimDetail): AnalysisNarrative {
  const documentCount = claim.documents.length;
  const extractedDocumentCount = claim.documents.filter(
    (document) => document.isExtracted,
  ).length;

  if (documentCount === 0 || extractedDocumentCount < documentCount) {
    return {
      headline: 'Rekam medis belum selesai dibaca AI',
      explanation: `${extractedDocumentCount} dari ${documentCount} dokumen sudah diekstraksi. Uji baru bisa menilai klaim setelah semua dokumen dibaca.`,
      suggestion:
        'Klik Analisis dengan AI agar AI membaca rekam medis klaim ini dan aturan klinis mengujinya.',
    };
  }

  if (!claim.analyzedAt) {
    return {
      headline: 'Rekam medis sudah dibaca AI, uji belum dijalankan',
      explanation: `Semua ${documentCount} dokumen sudah diekstraksi, tetapi aturan klinis belum menilai klaim ini.`,
      suggestion:
        'Klik Analisis dengan AI untuk menjalankan uji. Tidak ada dokumen baru yang dikirim ke AI, jadi tanpa biaya token.',
    };
  }

  const readingSentence = `AI membaca ${documentCount} dokumen rekam medis dan menyusun bukti klinisnya: diagnosis, temuan, tanda vital, obat, dan tindakan.`;
  if (claim.findings.length === 0) {
    return {
      headline: 'Belum ada tanda pada klaim ini',
      explanation: `${readingSentence} Aturan klinis belum menemukan bukti yang kurang, tidak konsisten, atau tersalin.`,
      suggestion: 'Periksa ringkasan klaim, lalu putuskan.',
    };
  }

  const diagnosesById = new Map(
    claim.diagnoses.map((diagnosis) => [diagnosis.id, diagnosis]),
  );
  const unsupportedDiagnosisNames = claim.findings
    .filter((finding) => finding.testType === 'EXISTENCE')
    .map((finding) => diagnosesById.get(finding.diagnosisId ?? '')?.name)
    .filter(Boolean);
  const flaggedTestSummaries = TEST_TYPE_ORDER.map((testType) => ({
    title: TEST_TYPE_DETAILS[testType].title,
    findingCount: claim.findings.filter(
      (finding) => finding.testType === testType,
    ).length,
  }))
    .filter((testSummary) => testSummary.findingCount > 0)
    .map((testSummary) => `${testSummary.title} (${testSummary.findingCount})`);
  const unsupportedSentence =
    unsupportedDiagnosisNames.length > 0
      ? ` Diagnosis sekunder ${unsupportedDiagnosisNames.join(', ')} belum didukung bukti klinis.`
      : '';
  const gapSentence =
    claim.potentialGap > 0
      ? ` Potensi selisih tarif ${formatRupiah(claim.potentialGap)}.`
      : '';

  return {
    headline: `INTEGRA menemukan ${claim.findings.length} tanda yang perlu diklarifikasi`,
    explanation: `${readingSentence} Aturan klinis menandai ${flaggedTestSummaries.join(', ')}.${unsupportedSentence}${gapSentence}`,
    suggestion:
      'Minta klarifikasi ke faskes dengan menyebut bukti yang belum ditemukan. Label ini bukan tuduhan, faskes tetap bisa melengkapi dokumentasinya.',
  };
}

const ANALYSIS_STEPS: { icon: IconType; title: string; detail: string }[] = [
  {
    icon: LuSparkles,
    title: 'AI membaca rekam medis',
    detail: 'Mengekstrak bukti beserta kutipan aslinya.',
  },
  {
    icon: LuScale,
    title: 'Aturan klinis menilai',
    detail: 'Pedoman klinis yang bisa diaudit, bukan skor tanpa alasan.',
  },
  {
    icon: LuUserCheck,
    title: 'Anda memutuskan',
    detail: 'Setujui, minta klarifikasi, atau eskalasi.',
  },
];

export function AiAnalysisCard({ claim }: { claim: ClaimDetail }) {
  const { headline, explanation, suggestion } = describeAnalysis(claim);
  const unreadDocumentCount = claim.documents.filter(
    (document) => !document.isExtracted,
  ).length;

  return (
    <section
      aria-labelledby="ai-analysis-heading"
      data-tour="claim-ai-analysis"
      className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 shadow-xs"
    >
      <div className="flex flex-col items-start gap-2">
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
        </div>
        <h2
          id="ai-analysis-heading"
          className="text-body font-semibold tracking-display text-ink"
        >
          {headline}
        </h2>
        <p className="text-body text-ink-secondary">{explanation}</p>
      </div>
      <AnalyzeClaimButton
        claimId={claim.id}
        claimNo={claim.claimNo}
        unreadDocumentCount={unreadDocumentCount}
        isAnalyzed={claim.analyzedAt !== null}
      />
      <div className="flex gap-3 rounded-lg border border-hairline bg-canvas px-4 py-3">
        <LuLightbulb
          className="mt-0.5 size-4 shrink-0 text-ink"
          aria-hidden="true"
        />
        <p className="text-small text-ink">
          <span className="font-medium">Saran langkah berikutnya. </span>
          {suggestion}
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {ANALYSIS_STEPS.map((analysisStep, stepIndex) => (
          <li key={analysisStep.title} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink">
              <analysisStep.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-caption text-ink-secondary">
                Langkah {stepIndex + 1}
              </span>
              <span className="text-small font-medium text-ink">
                {analysisStep.title}
              </span>
              <span className="text-caption text-ink-secondary">
                {analysisStep.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
