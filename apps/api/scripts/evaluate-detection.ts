/**
 * Read-only precision/recall estimate of the three detectors against the
 * synthetic answer key (`claims.injected_case`). Only claims the detectors
 * already evaluated (`analyzed_at` set) count, so run the AI analysis on a
 * sample of claims first.
 *
 *   npm run eval:detection
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { InjectedCase, TestType } from '../src/generated/prisma/client';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const SHOCK_ICD10_CODE = 'R57.9';
/**
 * Demo profile SHOCK_NONSTANDARD and dataset scenario UC4_FLAGGED_BUT_VALID:
 * real shock written as "RL 20 cc/kgBB" without "resusitasi". Uji Ada flags
 * them by design, so they are counted as false positives and shown apart.
 */
const NONSTANDARD_FLUID_PHRASE = 'rl 20 cc/kgbb';
const STANDARD_RESUSCITATION_TERM = 'resusitasi';

/** Pemetaan uji ke modus (kontrak bersama). */
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
class EvaluateDetectionModule {}

interface Confusion {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
}

function formatRatio(numerator: number, denominator: number): string {
  return denominator === 0
    ? '-'
    : `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatConfusion(label: string, confusion: Confusion): string {
  const { truePositive, falsePositive, falseNegative } = confusion;
  return [
    label.padEnd(34),
    `TP ${String(truePositive).padStart(3)}`,
    `FP ${String(falsePositive).padStart(3)}`,
    `FN ${String(falseNegative).padStart(3)}`,
    `presisi ${formatRatio(truePositive, truePositive + falsePositive).padStart(6)}`,
    `recall ${formatRatio(truePositive, truePositive + falseNegative).padStart(6)}`,
  ].join('  ');
}

function countConfusion(
  claims: { hasCase: boolean; isFlagged: boolean }[],
): Confusion {
  return {
    truePositive: claims.filter((claim) => claim.hasCase && claim.isFlagged)
      .length,
    falsePositive: claims.filter((claim) => !claim.hasCase && claim.isFlagged)
      .length,
    falseNegative: claims.filter((claim) => claim.hasCase && !claim.isFlagged)
      .length,
  };
}

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

async function main(): Promise<void> {
  const logger = new Logger('EvaluateDetection');
  const app = await NestFactory.createApplicationContext(
    EvaluateDetectionModule,
    { logger: ['log', 'error', 'warn'] },
  );
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));

  try {
    const totalClaimCount = await prisma.claim.count();
    const analyzedClaims = await prisma.claim.findMany({
      where: { analyzedAt: { not: null } },
      select: {
        claimNo: true,
        injectedCase: true,
        potentialGap: true,
        findings: { select: { testType: true } },
        diagnoses: { select: { icd10Code: true, isPrimary: true } },
        documents: { select: { content: true } },
      },
    });
    const evaluatedClaims = analyzedClaims.map((claim) => {
      const flaggedTests = new Set(
        claim.findings.map((finding) => finding.testType),
      );
      const contents = claim.documents.map((document) =>
        document.content.toLowerCase(),
      );
      const isNonstandardShock =
        claim.injectedCase.length === 0 &&
        claim.diagnoses.some(
          (diagnosis) =>
            !diagnosis.isPrimary && diagnosis.icd10Code === SHOCK_ICD10_CODE,
        ) &&
        contents.some((content) =>
          content.includes(NONSTANDARD_FLUID_PHRASE),
        ) &&
        !contents.some((content) =>
          content.includes(STANDARD_RESUSCITATION_TERM),
        );
      return { ...claim, flaggedTests, isNonstandardShock };
    });

    const testLines = (Object.keys(CASE_BY_TEST) as TestType[]).map(
      (testType) =>
        formatConfusion(
          `${TEST_LABELS[testType]} → ${CASE_BY_TEST[testType]}`,
          countConfusion(
            evaluatedClaims.map((claim) => ({
              hasCase: claim.injectedCase.includes(CASE_BY_TEST[testType]),
              isFlagged: claim.flaggedTests.has(testType),
            })),
          ),
        ),
    );
    const overallLine = formatConfusion(
      'Keseluruhan (modus apa pun)',
      countConfusion(
        evaluatedClaims.map((claim) => ({
          hasCase: claim.injectedCase.length > 0,
          isFlagged: claim.flaggedTests.size > 0,
        })),
      ),
    );

    const flaggedUpcodingClaims = evaluatedClaims.filter(
      (claim) =>
        claim.injectedCase.includes('UPCODING') &&
        claim.flaggedTests.has('EXISTENCE'),
    );
    const estimatedTariffGap = flaggedUpcodingClaims.reduce(
      (total, claim) => total + claim.potentialGap.toNumber(),
      0,
    );
    const nonstandardShockClaims = evaluatedClaims.filter(
      (claim) => claim.isNonstandardShock,
    );
    const flaggedNonstandardShock = nonstandardShockClaims.filter((claim) =>
      claim.flaggedTests.has('EXISTENCE'),
    );

    logger.log(
      [
        'Estimasi berbasis data sintetis',
        `Klaim dianalisis: ${evaluatedClaims.length} dari ${totalClaimCount} (metrik hanya mewakili klaim yang sudah dianalisis)`,
        '',
        'Per uji, level klaim:',
        ...testLines.map((line) => `  ${line}`),
        `  ${overallLine}`,
        '',
        `Estimasi selisih tarif (klaim UPCODING yang tertandai Uji Ada, ${flaggedUpcodingClaims.length} klaim): ${rupiah.format(estimatedTariffGap)}`,
        '',
        'Catatan SHOCK_NONSTANDARD / UC4_FLAGGED_BUT_VALID (syok nyata, ditulis tidak baku):',
        `  ${nonstandardShockClaims.length} klaim dianalisis, ${flaggedNonstandardShock.length} tertandai Uji Ada; sengaja dirancang begitu dan dihitung FP di atas.`,
        ...flaggedNonstandardShock.map((claim) => `  - ${claim.claimNo}`),
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
