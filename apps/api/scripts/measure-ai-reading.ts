import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { claimDocumentsExtractionSchema } from '../src/application/analysis/clinical-extraction.schema';
import {
  collectSecondaryDiagnosisCodes,
  EvaluateClaimUseCase,
} from '../src/application/analysis/evaluate-claim.use-case';
import {
  buildExtractionMessage,
  documentLabel,
  EXTRACTION_SYSTEM_PROMPT,
} from '../src/application/analysis/extraction-prompt';
import { RunConsistencyTestUseCase } from '../src/application/analysis/run-consistency-test.use-case';
import { RunExistenceTestUseCase } from '../src/application/analysis/run-existence-test.use-case';
import { RunSimilarityTestUseCase } from '../src/application/analysis/run-similarity-test.use-case';
import type { ClaimEvidence } from '../src/domain/analysis/claim-evidence';
import {
  type ClinicalExtraction,
  groundExtraction,
} from '../src/domain/analysis/clinical-extraction';
import type { ClaimDetail } from '../src/domain/claims/claim-detail';
import type { InjectedCase, TestType } from '../src/generated/prisma/client';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { PrismaAnalysisRepository } from '../src/infrastructure/database/prisma/repositories/prisma-analysis.repository';
import { PrismaClaimRepository } from '../src/infrastructure/database/prisma/repositories/prisma-claim.repository';
import { OpenAiLlmClient } from '../src/infrastructure/llm/openai-llm.client';
import { InacbgTariffSchedule } from '../src/infrastructure/tariffs/inacbg-tariff-schedule';
import { SAMPLE_CLAIM_NO_PREFIX } from './synthetic/bpjs-sample-claims';
import {
  buildTemplateExtractions,
  resetDemoAnalysis,
  withTemplateExtractions,
} from './synthetic/demo-analysis';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const DEFAULT_SAMPLE_SIZE = 10;
const DEFAULT_WORKERS = 5;
const PROGRESS_EVERY = 100;
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class MeasureAiReadingModule {}

interface ClaimOutcome {
  recommendation: string;
  flaggedTests: Set<TestType>;
}

interface MeasuredClaim {
  injectedCase: InjectedCase[];
  template: ClaimOutcome;
  ai: ClaimOutcome;
  durationMs: number;
}

function readNumberOption(name: string, fallback: number): number {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!argument) return fallback;
  const value = Number(argument.slice(name.length + 3));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return value;
}

function sampleEvenly<Item>(items: Item[], size: number): Item[] {
  if (items.length <= size) return items;
  return Array.from(
    { length: size },
    (_, index) => items[Math.floor((index * items.length) / size)],
  );
}

function countItems(extraction: ClinicalExtraction | null): number {
  if (!extraction) return 0;
  return (
    extraction.diagnoses.length +
    extraction.findings.length +
    extraction.vitalSigns.length +
    extraction.medications.length +
    extraction.procedures.length
  );
}

function outcomeOf(detail: ClaimDetail): ClaimOutcome {
  return {
    recommendation: detail.verification?.recommendation ?? 'UNASSESSED',
    flaggedTests: new Set(detail.findings.map((finding) => finding.testType)),
  };
}

function formatPercent(numerator: number, denominator: number): string {
  return denominator === 0
    ? '-'
    : `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function detectionLine(
  measured: MeasuredClaim[],
  testType: TestType,
  source: 'template' | 'ai',
): string {
  let caught = 0;
  let missed = 0;
  let outsideAnswerKey = 0;
  for (const claim of measured) {
    const expected = claim.injectedCase.includes(CASE_BY_TEST[testType]);
    const flagged = claim[source].flaggedTests.has(testType);
    if (expected && flagged) caught += 1;
    else if (expected) missed += 1;
    else if (flagged) outsideAnswerKey += 1;
  }
  return `tertangkap ${caught}/${caught + missed} (${formatPercent(caught, caught + missed)}), di luar kunci jawaban ${outsideAnswerKey}`;
}

async function main(): Promise<void> {
  const logger = new Logger('MeasureAiReading');
  const sampleSize = process.argv.includes('--all')
    ? Number.POSITIVE_INFINITY
    : readNumberOption('sample', DEFAULT_SAMPLE_SIZE);
  const workerCount = readNumberOption('workers', DEFAULT_WORKERS);
  const app = await NestFactory.createApplicationContext(
    MeasureAiReadingModule,
    { logger: ['error', 'warn'] },
  );
  const config = app.get(ConfigService<Env, true>);
  const prisma = new PrismaService(config);
  const analysisRepository = new PrismaAnalysisRepository(prisma);
  const claimRepository = new PrismaClaimRepository(prisma);
  const llmClient = new OpenAiLlmClient(config);
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
    const sampled = Number.isFinite(sampleSize)
      ? sampleEvenly(claims, sampleSize)
      : claims;
    const templates = buildTemplateExtractions(claims.length);

    const evaluate = async (evidence: ClaimEvidence) => {
      await evaluateClaim.execute(
        evidence,
        await analysisRepository.findEvidenceRules(
          collectSecondaryDiagnosisCodes([evidence]),
        ),
      );
      const detail = await claimRepository.findDetailById(evidence.claimId);
      if (!detail) throw new Error(`Claim ${evidence.claimId} disappeared`);
      return outcomeOf(detail);
    };

    const measured: MeasuredClaim[] = [];
    const durations: number[] = [];
    let failedCount = 0;
    let modelItemCount = 0;
    let groundedItemCount = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let model = config.get('LLM_MODEL', { infer: true });
    const queue = [...sampled];
    const startedAt = performance.now();

    const runWorker = async () => {
      for (let claim = queue.shift(); claim; claim = queue.shift()) {
        const evidence = await analysisRepository.findClaimEvidence(claim.id);
        if (!evidence) continue;
        const template = await evaluate(
          withTemplateExtractions(evidence, templates),
        );
        const started = performance.now();
        try {
          const result = await llmClient.generateStructured({
            system: EXTRACTION_SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: buildExtractionMessage(
                  evidence.documents.map(({ id, type, content }) => ({
                    id,
                    type,
                    content,
                  })),
                ),
              },
            ],
            schema: claimDocumentsExtractionSchema,
            temperature: 0,
          });
          model = result.model;
          inputTokens += result.usage.inputTokens;
          outputTokens += result.usage.outputTokens;
          const extractions = new Map<string, ClinicalExtraction>(
            result.output.documents.map(({ documentId, ...extraction }) => [
              documentId.trim(),
              extraction,
            ]),
          );
          const ai = await evaluate({
            ...evidence,
            documents: evidence.documents.map((document, index) => {
              const extraction = extractions.get(documentLabel(index)) ?? null;
              const grounded = extraction
                ? groundExtraction(extraction, document.content)
                : null;
              modelItemCount += countItems(extraction);
              groundedItemCount += countItems(grounded);
              return { ...document, extracted: grounded };
            }),
          });
          durations.push(performance.now() - started);
          measured.push({
            injectedCase: claim.injectedCase,
            template,
            ai,
            durationMs: performance.now() - started,
          });
        } catch (error) {
          failedCount += 1;
          logger.warn(`Gagal membaca klaim ${claim.id}: ${String(error)}`);
        }
        const done = measured.length + failedCount;
        if (done % PROGRESS_EVERY === 0) {
          logger.warn(`Progres ${done}/${sampled.length}`);
        }
      }
    };
    await Promise.all(Array.from({ length: workerCount }, runWorker));
    await resetDemoAnalysis(
      prisma,
      sampled.filter(({ analyzedAt }) => !analyzedAt).map(({ id }) => id),
    );
    for (const claim of sampled.filter(({ analyzedAt }) => analyzedAt)) {
      const evidence = await analysisRepository.findClaimEvidence(claim.id);
      if (evidence) await evaluate(evidence);
    }

    const totalSeconds = (performance.now() - startedAt) / 1000;
    const sortedDurations = [...durations].sort(
      (first, second) => first - second,
    );
    const sameRecommendation = measured.filter(
      ({ template, ai }) => template.recommendation === ai.recommendation,
    ).length;
    const testLines = (Object.keys(CASE_BY_TEST) as TestType[]).flatMap(
      (testType) => {
        const sameResult = measured.filter(
          ({ template, ai }) =>
            template.flaggedTests.has(testType) ===
            ai.flaggedTests.has(testType),
        ).length;
        return [
          `  ${TEST_LABELS[testType]}: hasil sama ${sameResult}/${measured.length}`,
          `    bacaan templat: ${detectionLine(measured, testType, 'template')}`,
          `    bacaan AI     : ${detectionLine(measured, testType, 'ai')}`,
        ];
      },
    );

    console.log(
      [
        `Pengukuran bacaan AI: model ${model}, ${sampled.length} klaim, ${workerCount} worker, ${(totalSeconds / 60).toFixed(1)} menit`,
        `Berhasil ${measured.length}, gagal ${failedCount}`,
        `Rekomendasi sama dengan bacaan templat: ${sameRecommendation}/${measured.length} (${formatPercent(sameRecommendation, measured.length)})`,
        ...testLines,
        `Kutipan AI: ${modelItemCount} item, ${groundedItemCount} ada di dokumen, ${modelItemCount - groundedItemCount} dibuang (${formatPercent(modelItemCount - groundedItemCount, modelItemCount)})`,
        `Waktu baca AI + analisis per klaim: rata-rata ${(sortedDurations.reduce((total, value) => total + value, 0) / Math.max(1, sortedDurations.length) / 1000).toFixed(1)} s, p95 ${((sortedDurations[Math.floor(sortedDurations.length * 0.95)] ?? 0) / 1000).toFixed(1)} s, paling lama ${((sortedDurations.at(-1) ?? 0) / 1000).toFixed(1)} s`,
        `Token per klaim: masuk ${Math.round(inputTokens / Math.max(1, measured.length))}, keluar ${Math.round(outputTokens / Math.max(1, measured.length))} (total ${inputTokens + outputTokens})`,
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
