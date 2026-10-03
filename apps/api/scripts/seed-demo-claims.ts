/**
 * Seeds hundreds of template-based demo claims (no LLM calls), then runs the
 * same analysis as "Jalankan analisis" so the queue and dashboards are filled.
 * Idempotent: it replaces only claims numbered KLM-DEMO-* and their patients.
 *
 *   npm run seed:demo                      # 300 claims
 *   npm run seed:demo -- --count=800       # custom size
 *
 * Run `npm run seed:users` first so decided claims get a verifier.
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RunAnalysisUseCase } from '../src/application/analysis/run-analysis.use-case';
import { RunExistenceTestUseCase } from '../src/application/analysis/run-existence-test.use-case';
import type { Prisma } from '../src/generated/prisma/client';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { PrismaAnalysisRepository } from '../src/infrastructure/database/prisma/repositories/prisma-analysis.repository';
import { SyntheticTariffSchedule } from '../src/infrastructure/tariffs/synthetic-tariff-schedule';
import {
  DECISION_STATUS,
  DEMO_CLAIM_NO_PREFIX,
  DEMO_FACILITIES,
  DEMO_RECORD_NO_PREFIX,
  generateDemoClaims,
} from './synthetic/demo-claims';
import { EVIDENCE_RULES } from './synthetic/scenarios';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const DEFAULT_CLAIM_COUNT = 300;
const MAX_CLAIM_COUNT = 5000;
const DATASET_SEED = 20260401;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class SeedDemoClaimsModule {}

function readClaimCount(): number {
  const countArgument = process.argv.find((argument) =>
    argument.startsWith('--count='),
  );
  if (!countArgument) return DEFAULT_CLAIM_COUNT;
  const claimCount = Number(countArgument.slice('--count='.length));
  if (
    !Number.isInteger(claimCount) ||
    claimCount < 1 ||
    claimCount > MAX_CLAIM_COUNT
  ) {
    throw new Error(`--count must be an integer from 1 to ${MAX_CLAIM_COUNT}`);
  }
  return claimCount;
}

async function main(): Promise<void> {
  const logger = new Logger('SeedDemoClaims');
  const claims = generateDemoClaims(readClaimCount(), DATASET_SEED);
  const app = await NestFactory.createApplicationContext(SeedDemoClaimsModule, {
    logger: ['log', 'error', 'warn'],
  });
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));
  const analysisRepository = new PrismaAnalysisRepository(prisma);
  const runAnalysis = new RunAnalysisUseCase(
    analysisRepository,
    new RunExistenceTestUseCase(
      analysisRepository,
      new SyntheticTariffSchedule(),
    ),
  );

  try {
    const facilityIdByCode = new Map<string, string>();
    for (const facility of DEMO_FACILITIES) {
      const { id } = await prisma.facility.upsert({
        where: { code: facility.code },
        create: facility,
        update: facility,
        select: { id: true },
      });
      facilityIdByCode.set(facility.code, id);
    }
    for (const evidenceRule of EVIDENCE_RULES) {
      await prisma.evidenceRule.upsert({
        where: {
          icd10Code_evidenceType_expected: {
            icd10Code: evidenceRule.icd10Code,
            evidenceType: evidenceRule.evidenceType,
            expected: evidenceRule.expected,
          },
        },
        create: evidenceRule,
        update: { guidelineRef: evidenceRule.guidelineRef },
      });
    }

    const verifier = await prisma.user.findFirst({
      where: { role: 'VERIFIER' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!verifier) {
      logger.warn(
        'Belum ada akun verifikator; semua klaim demo dibuat Menunggu keputusan. Jalankan "npm run seed:users" lalu ulangi.',
      );
    }

    const demoClaimFilter = { claimNo: { startsWith: DEMO_CLAIM_NO_PREFIX } };
    await prisma.$transaction(
      async (transaction) => {
        // Decisions are an append-only audit trail with a Restrict FK, so the
        // demo rows are removed explicitly before their claims.
        await transaction.decision.deleteMany({
          where: { claim: demoClaimFilter },
        });
        await transaction.claim.deleteMany({ where: demoClaimFilter });
        await transaction.patient.deleteMany({
          where: { medicalRecordNo: { startsWith: DEMO_RECORD_NO_PREFIX } },
        });

        await transaction.patient.createMany({
          data: claims.map((claim) => claim.patient),
        });
        const patients = await transaction.patient.findMany({
          where: { medicalRecordNo: { startsWith: DEMO_RECORD_NO_PREFIX } },
          select: { id: true, medicalRecordNo: true },
        });
        const patientIdByRecordNo = new Map(
          patients.map((patient) => [patient.medicalRecordNo, patient.id]),
        );

        await transaction.claim.createMany({
          data: claims.map((claim) => ({
            claimNo: claim.claimNo,
            facilityId: facilityIdByCode.get(claim.facilityCode)!,
            patientId: patientIdByRecordNo.get(claim.patient.medicalRecordNo)!,
            admittedAt: claim.admittedAt,
            dischargedAt: claim.dischargedAt,
            inacbgCode: claim.inacbgCode,
            severityLevel: claim.severityLevel,
            tariffAmount: claim.tariffAmount,
            status:
              verifier && claim.decision
                ? DECISION_STATUS[claim.decision.action]
                : 'PENDING',
            injectedCase: claim.injectedCase,
          })),
        });
        const createdClaims = await transaction.claim.findMany({
          where: demoClaimFilter,
          select: { id: true, claimNo: true },
        });
        const claimIdByNo = new Map(
          createdClaims.map((claim) => [claim.claimNo, claim.id]),
        );

        await transaction.claimDiagnosis.createMany({
          data: claims.flatMap((claim) =>
            claim.diagnoses.map((diagnosis) => ({
              ...diagnosis,
              claimId: claimIdByNo.get(claim.claimNo)!,
            })),
          ),
        });
        await transaction.clinicalDocument.createMany({
          data: claims.flatMap((claim) =>
            claim.documents.map((document) => ({
              claimId: claimIdByNo.get(claim.claimNo)!,
              type: document.type,
              recordedAt: document.recordedAt,
              content: document.content,
              extracted:
                document.extracted as unknown as Prisma.InputJsonObject,
            })),
          ),
        });
        if (verifier) {
          await transaction.decision.createMany({
            data: claims.flatMap((claim) =>
              claim.decision
                ? [
                    {
                      claimId: claimIdByNo.get(claim.claimNo)!,
                      verifierId: verifier.id,
                      action: claim.decision.action,
                      reason: claim.decision.reason,
                      createdAt: claim.decision.decidedAt,
                    },
                  ]
                : [],
            ),
          });
        }
      },
      { timeout: 120_000 },
    );

    logger.log(
      `Menyimpan ${claims.length} klaim demo selesai. Menjalankan analisis...`,
    );
    const analysisSummary = await runAnalysis.execute();

    const claimsPerProfile = new Map<string, number>();
    for (const claim of claims) {
      claimsPerProfile.set(
        claim.profile,
        (claimsPerProfile.get(claim.profile) ?? 0) + 1,
      );
    }
    logger.log(
      [
        `Faskes    : ${DEMO_FACILITIES.length}`,
        `Klaim demo: ${claims.length}`,
        ...[...claimsPerProfile]
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([profile, count]) => `  ${profile.padEnd(24)} ${count}`),
        `Dokumen   : ${claims.reduce((total, claim) => total + claim.documents.length, 0)}`,
        `Keputusan : ${verifier ? claims.filter((claim) => claim.decision).length : 0}`,
        `Analisis  : ${analysisSummary.analyzedClaimCount} klaim dianalisis, ${analysisSummary.flaggedClaimCount} bertanda, ${analysisSummary.findingCount} tanda`,
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
