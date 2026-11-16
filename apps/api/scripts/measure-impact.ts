import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  collectSecondaryDiagnosisCodes,
  EvaluateClaimUseCase,
} from '../src/application/analysis/evaluate-claim.use-case';
import { RunConsistencyTestUseCase } from '../src/application/analysis/run-consistency-test.use-case';
import { RunExistenceTestUseCase } from '../src/application/analysis/run-existence-test.use-case';
import { RunSimilarityTestUseCase } from '../src/application/analysis/run-similarity-test.use-case';
import type { ClaimEvidence } from '../src/domain/analysis/claim-evidence';
import { groundExtraction } from '../src/domain/analysis/clinical-extraction';
import { readClinicalDocument } from '../src/domain/analysis/rule-reader';
import type { ClaimDetail } from '../src/domain/claims/claim-detail';
import { COPIED_DOCUMENT_SIMILARITY } from '../src/domain/claims/claim-verification';
import type { InjectedCase, TestType } from '../src/generated/prisma/client';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { PrismaAnalysisRepository } from '../src/infrastructure/database/prisma/repositories/prisma-analysis.repository';
import { PrismaClaimRepository } from '../src/infrastructure/database/prisma/repositories/prisma-claim.repository';
import { InacbgTariffSchedule } from '../src/infrastructure/tariffs/inacbg-tariff-schedule';
import { SAMPLE_CLAIM_NO_PREFIX } from './synthetic/bpjs-sample-claims';
import {
  buildTemplateExtractions,
  resetDemoAnalysis,
  withTemplateExtractions,
} from './synthetic/demo-analysis';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const DEFAULT_WORKERS = 4;
const CASE_BY_TEST: Readonly<Record<TestType, InjectedCase>> = {
  EXISTENCE: 'UPCODING',
  CONSISTENCY: 'EXAM_MANIPULATION',
  SIMILARITY: 'CLONING',
};
const TEST_LABELS: Readonly<Record<TestType, string>> = {
  EXISTENCE: 'Uji Ada',
  CONSISTENCY: 'Uji Konsisten',
  SIMILARITY: 'Uji Bukan Salinan',
};
const RECOMMENDATION_LABELS: Readonly<Record<string, string>> = {
  APPROVE: 'Setuju',
  REQUEST_CLARIFICATION: 'Minta Klarifikasi',
  UNASSESSED: 'Belum bisa dinilai',
  ESCALATE: 'Eskalasi',
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class MeasureImpactModule {}

interface Confusion {
  caught: number;
  missed: number;
  outsideAnswerKey: number;
}

function outcomeKey(detail: ClaimDetail): string {
  const tests = [...new Set(detail.findings.map(({ testType }) => testType))];
  return `${detail.verification?.recommendation ?? 'UNASSESSED'} ${tests.sort().join(',')}`;
}

function withRuleReading(evidence: ClaimEvidence): ClaimEvidence {
  return {
    ...evidence,
    documents: evidence.documents.map((document) => ({
      ...document,
      extracted: groundExtraction(
        readClinicalDocument(document.content),
        document.content,
      ),
    })),
  };
}

interface MeasuredClaim {
  injectedCase: InjectedCase[];
  detail: ClaimDetail;
  durationMs: number;
}

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function readWorkerCount(): number {
  const argument = process.argv.find((value) => value.startsWith('--workers='));
  const workers = Number(
    argument?.slice('--workers='.length) ?? DEFAULT_WORKERS,
  );
  if (!Number.isInteger(workers) || workers < 1) {
    throw new Error('--workers must be a positive integer');
  }
  return workers;
}

function formatPercent(numerator: number, denominator: number): string {
  return denominator === 0
    ? '-'
    : `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function percentile(sortedValues: number[], fraction: number): number {
  return sortedValues[
    Math.min(
      sortedValues.length - 1,
      Math.floor(sortedValues.length * fraction),
    )
  ];
}

function highestSimilarity(detail: ClaimDetail): number {
  return Math.max(
    0,
    ...detail.findings
      .filter((finding) => finding.testType === 'SIMILARITY')
      .map((finding) => finding.similarity ?? 0),
  );
}

function summarize(measured: MeasuredClaim[]): string[] {
  const flaggedTestsOf = ({ detail }: MeasuredClaim) =>
    new Set(detail.findings.map((finding) => finding.testType));
  const testLines = (Object.keys(CASE_BY_TEST) as TestType[]).map(
    (testType) => {
      const confusion = measured.reduce<Confusion>(
        (counts, claim) => {
          const expected = claim.injectedCase.includes(CASE_BY_TEST[testType]);
          const flagged = flaggedTestsOf(claim).has(testType);
          if (expected && flagged) counts.caught += 1;
          else if (expected) counts.missed += 1;
          else if (flagged) counts.outsideAnswerKey += 1;
          return counts;
        },
        { caught: 0, missed: 0, outsideAnswerKey: 0 },
      );
      const planted = confusion.caught + confusion.missed;
      return `  ${TEST_LABELS[testType].padEnd(18)} ditanam ${String(planted).padStart(5)}  tertangkap ${String(confusion.caught).padStart(5)} (${formatPercent(confusion.caught, planted)})  terlewat ${String(confusion.missed).padStart(4)}  di luar kunci jawaban ${String(confusion.outsideAnswerKey).padStart(4)}`;
    },
  );

  const recommendationCounts = new Map<string, number>();
  for (const { detail } of measured) {
    const key = detail.verification?.recommendation ?? 'UNASSESSED';
    recommendationCounts.set(key, (recommendationCounts.get(key) ?? 0) + 1);
  }
  const recommendationLines = Object.keys(RECOMMENDATION_LABELS).map(
    (key) =>
      `  ${RECOMMENDATION_LABELS[key].padEnd(18)} ${String(recommendationCounts.get(key) ?? 0).padStart(5)} (${formatPercent(recommendationCounts.get(key) ?? 0, measured.length)})`,
  );

  const escalated = measured.filter(
    ({ detail }) => detail.verification?.recommendation === 'ESCALATE',
  );
  const escalatedCopies = escalated.filter(({ injectedCase }) =>
    injectedCase.includes('CLONING'),
  );
  const flaggedNonCopies = measured.filter(
    (claim) =>
      !claim.injectedCase.includes('CLONING') &&
      flaggedTestsOf(claim).has('SIMILARITY'),
  );
  const nonCopySimilarities = flaggedNonCopies.map(({ detail }) =>
    highestSimilarity(detail),
  );
  const coverage = measured.find(
    ({ detail }) => detail.similarityThreshold !== null,
  )?.detail;

  const gapClaims = measured.filter(({ detail }) => detail.potentialGap > 0);
  const gapTotal = gapClaims.reduce(
    (total, { detail }) => total + detail.potentialGap,
    0,
  );

  const durations = measured
    .map(({ durationMs }) => durationMs)
    .sort((first, second) => first - second);
  const meanDuration =
    durations.reduce((total, duration) => total + duration, 0) /
    durations.length;

  return [
    'Daya tangkap per uji (dibanding kunci jawaban seed):',
    ...testLines,
    '',
    'Keputusan per SEP:',
    ...recommendationLines,
    '',
    `Uji Bukan Salinan: rata-rata ${formatPercent(coverage?.similarityMean ?? 0, 1)}, ambang ${formatPercent(coverage?.similarityThreshold ?? 0, 1)}, Eskalasi mulai ${formatPercent(COPIED_DOCUMENT_SIMILARITY, 1)}`,
    `  Eskalasi ${escalated.length} klaim, ${escalatedCopies.length} di antaranya salinan (${formatPercent(escalatedCopies.length, escalated.length)})`,
    `  Klaim bukan salinan di atas ambang: ${flaggedNonCopies.length}${nonCopySimilarities.length > 0 ? `, kemiripan ${formatPercent(Math.min(...nonCopySimilarities), 1)} sampai ${formatPercent(Math.max(...nonCopySimilarities), 1)}` : ''}`,
    '',
    `Potensi selisih tarif: ${gapClaims.length} klaim, total ${rupiah.format(gapTotal)}, rata-rata ${rupiah.format(gapClaims.length === 0 ? 0 : gapTotal / gapClaims.length)} per klaim`,
    '',
    `Waktu analisis per klaim: rata-rata ${Math.round(meanDuration)} ms, p95 ${Math.round(percentile(durations, 0.95))} ms, paling lama ${Math.round(durations.at(-1) ?? 0)} ms`,
  ];
}

async function main(): Promise<void> {
  const logger = new Logger('MeasureImpact');
  const workerCount = readWorkerCount();
  const app = await NestFactory.createApplicationContext(MeasureImpactModule, {
    logger: ['log', 'error', 'warn'],
  });
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));
  const analysisRepository = new PrismaAnalysisRepository(prisma);
  const claimRepository = new PrismaClaimRepository(prisma);
  const evaluateClaim = new EvaluateClaimUseCase(
    analysisRepository,
    new RunExistenceTestUseCase(
      analysisRepository,
      new InacbgTariffSchedule(prisma),
    ),
    new RunConsistencyTestUseCase(analysisRepository),
    new RunSimilarityTestUseCase(analysisRepository),
  );

  try {
    const claims = await prisma.claim.findMany({
      where: { claimNo: { startsWith: SAMPLE_CLAIM_NO_PREFIX } },
      select: { id: true, injectedCase: true, analyzedAt: true },
      orderBy: { claimNo: 'asc' },
    });
    if (claims.length === 0) {
      logger.warn('Belum ada klaim demo. Jalankan npm run seed:demo dulu.');
      return;
    }

    const templates = buildTemplateExtractions(claims.length);
    const evaluate = async (evidence: ClaimEvidence) =>
      evaluateClaim.execute(
        evidence,
        await analysisRepository.findEvidenceRules(
          collectSecondaryDiagnosisCodes([evidence]),
        ),
      );
    const useRuleReader = process.argv.includes('--reader=rules');
    const disagreements: string[] = [];
    let sameRecommendationCount = 0;
    const measured: MeasuredClaim[] = [];
    const queue = [...claims];
    const startedAt = performance.now();
    const runWorker = async () => {
      for (let claim = queue.shift(); claim; claim = queue.shift()) {
        const evidence = await analysisRepository.findClaimEvidence(claim.id);
        if (!evidence) continue;
        let templateKey = '';
        if (useRuleReader) {
          await evaluate(withTemplateExtractions(evidence, templates));
          const templateDetail = await claimRepository.findDetailById(claim.id);
          templateKey = templateDetail ? outcomeKey(templateDetail) : '';
        }
        const started = performance.now();
        await evaluate(
          useRuleReader
            ? withRuleReading(evidence)
            : withTemplateExtractions(evidence, templates),
        );
        const durationMs = performance.now() - started;
        const detail = await claimRepository.findDetailById(claim.id);
        if (detail && useRuleReader) {
          const ruleKey = outcomeKey(detail);
          if (ruleKey.split(' ')[0] === templateKey.split(' ')[0]) {
            sameRecommendationCount += 1;
          }
          if (ruleKey !== templateKey) {
            disagreements.push(
              `${detail.claimNo}: templat ${templateKey} | aturan ${ruleKey}`,
            );
          }
        }
        if (detail) {
          measured.push({
            injectedCase: claim.injectedCase,
            detail,
            durationMs,
          });
        }
      }
    };
    await Promise.all(Array.from({ length: workerCount }, runWorker));
    const totalSeconds = (performance.now() - startedAt) / 1000;

    await resetDemoAnalysis(
      prisma,
      claims.filter(({ analyzedAt }) => !analyzedAt).map(({ id }) => id),
    );
    for (const claim of claims.filter(({ analyzedAt }) => analyzedAt)) {
      const evidence = await analysisRepository.findClaimEvidence(claim.id);
      if (evidence) await evaluate(evidence);
    }

    logger.log(
      [
        `Dampak terukur: ${measured.length} klaim demo, ${workerCount} worker, selesai dalam ${totalSeconds.toFixed(1)} detik (${Math.round(measured.length / totalSeconds)} klaim per detik)`,
        '',
        ...summarize(measured),
        ...(useRuleReader
          ? [
              '',
              `Pembaca aturan dibanding bacaan templat: rekomendasi sama ${sameRecommendationCount}/${measured.length} (${formatPercent(sameRecommendationCount, measured.length)}), rekomendasi dan uji sama ${measured.length - disagreements.length}/${measured.length}`,
              ...disagreements.slice(0, 15).map((line) => `  ${line}`),
            ]
          : []),
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
