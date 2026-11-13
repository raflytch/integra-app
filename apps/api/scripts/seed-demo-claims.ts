/**
 * Seeds hundreds of raw, template-based demo claims without calling the LLM.
 * Documents stay unextracted, so the AI analysis (claims selected in Antrean
 * Klaim, or "Analisis dengan AI" on a claim) happens in the app. A few claims
 * get a sample decision of each kind from the demo verifier. Idempotent: it
 * replaces only claims whose SEP number starts with 9900R (with their findings
 * and decisions) and their patients.
 *
 *   npm run seed:demo                      # 300 claims
 *   npm run seed:demo -- --count=800       # custom size
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { DocumentType } from '../src/domain/claims/claim-detail';
import type { DecisionAction } from '../src/domain/decisions/decision';
import { CLAIM_STATUS_BY_DECISION_ACTION } from '../src/domain/decisions/decision';
import { DEMO_ACCOUNTS } from '../src/domain/users/demo-accounts';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import {
  type ClaimProfile,
  DEMO_CLAIM_NO_PREFIX,
  DEMO_FACILITIES,
  DEMO_RECORD_NO_PREFIX,
  generateDemoClaims,
} from './synthetic/demo-claims';
import { EVIDENCE_RULES } from './synthetic/scenarios';
import { upsertEvidenceRules } from './synthetic/upsert-evidence-rules';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const DEFAULT_CLAIM_COUNT = 300;
const MAX_CLAIM_COUNT = 5000;
const DATASET_SEED = 20260401;
const DECISIONS_PER_KIND = 3;

const SAMPLE_DECISIONS: {
  profiles: ClaimProfile[];
  action: DecisionAction;
  reason: string;
  missingDocumentTypes: DocumentType[];
}[] = [
  {
    profiles: ['GENUINE_SHOCK', 'GENUINE_RESP_FAILURE'],
    action: 'APPROVE',
    reason:
      'Diagnosis sekunder didukung bukti klinis lengkap di rekam medis, klaim dibayar sesuai pengajuan.',
    missingDocumentTypes: [],
  },
  {
    profiles: ['SHOCK_UPCODING', 'RESP_FAILURE_UPCODING'],
    action: 'REQUEST_CLARIFICATION',
    reason:
      'Diagnosis sekunder belum didukung bukti tindakan dan catatan perkembangan pasien. Mohon faskes melengkapi lewat VEDIKA.',
    missingDocumentTypes: ['PROCEDURE', 'DAILY_NOTE'],
  },
  {
    profiles: ['CLONING'],
    action: 'ESCALATE',
    reason:
      'Dokumen klinis hampir identik dengan klaim pasien lain di faskes yang sama, perlu ditinjau tim anti-fraud.',
    missingDocumentTypes: [],
  },
];

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
    await upsertEvidenceRules(prisma, EVIDENCE_RULES);

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
          where: {
            medicalRecordNo: { startsWith: DEMO_RECORD_NO_PREFIX },
            claims: { none: {} },
          },
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
            careType: claim.careType,
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
        await transaction.claimProcedure.createMany({
          data: claims.flatMap((claim) =>
            claim.procedures.map((procedure) => ({
              ...procedure,
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

        const demoVerifier = await transaction.user.findUnique({
          where: { email: DEMO_ACCOUNTS[0].email },
          select: { id: true },
        });
        if (!demoVerifier) {
          logger.warn(
            'Akun verifikator demo belum ada; jalankan npm run seed:users agar keputusan contoh ikut dibuat.',
          );
          return;
        }
        for (const sample of SAMPLE_DECISIONS) {
          const sampleClaims = claims
            .filter((claim) => sample.profiles.includes(claim.profile))
            .slice(0, DECISIONS_PER_KIND);
          for (const claim of sampleClaims) {
            const claimId = claimIdByNo.get(claim.claimNo)!;
            await transaction.decision.create({
              data: {
                claimId,
                verifierId: demoVerifier.id,
                action: sample.action,
                reason: sample.reason,
                documentRequests: {
                  create: sample.missingDocumentTypes.map((documentType) => ({
                    documentType,
                  })),
                },
              },
            });
            await transaction.claim.update({
              where: { id: claimId },
              data: { status: CLAIM_STATUS_BY_DECISION_ACTION[sample.action] },
            });
          }
        }
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
