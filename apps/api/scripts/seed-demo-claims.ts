/**
 * Seeds hundreds of raw, template-based demo claims without calling the LLM.
 * Documents stay unextracted and claims stay "Menunggu keputusan", so the AI
 * analysis (claims selected in Antrean Klaim, or "Analisis dengan AI" on a claim) and the
 * verifier decisions happen in the app. Idempotent: it replaces only claims
 * numbered KLM-DEMO-* (with their findings and decisions) and their patients.
 *
 *   npm run seed:demo                      # 300 claims
 *   npm run seed:demo -- --count=800       # custom size
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import {
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
  const { claims, warnings } = generateDemoClaims(
    readClaimCount(),
    DATASET_SEED,
  );
  for (const warning of warnings) logger.warn(warning);
  const app = await NestFactory.createApplicationContext(SeedDemoClaimsModule, {
    logger: ['log', 'error', 'warn'],
  });
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));

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
              ...document,
              claimId: claimIdByNo.get(claim.claimNo)!,
            })),
          ),
        });
      },
      { timeout: 120_000 },
    );

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
        `Klaim demo: ${claims.length} (mentah, belum dianalisis AI)`,
        ...[...claimsPerProfile]
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([profile, count]) => `  ${profile.padEnd(24)} ${count}`),
        `Dokumen   : ${claims.reduce((total, claim) => total + claim.documents.length, 0)}`,
        'Pilih klaim di Antrean Klaim lalu klik Analisis AI; setiap dokumen dibaca AI (panggilan LLM berbayar).',
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
