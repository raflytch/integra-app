/**
 * M-02: loads `prisma/seed-data/synthetic-dataset.json` into the database.
 * Idempotent; touches only the dataset's facilities, patients, evidence rules,
 * and claims (never users or the contract fixture claim).
 *
 *   npm run data:seed --workspace=@app/api
 */
import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Prisma } from '../src/generated/prisma/client';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import {
  DATASET_FILE_PATH,
  syntheticDatasetSchema,
} from './synthetic/dataset.schema';

const API_ENV_FILE_PATH = join(__dirname, '../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class SeedDatasetModule {}

async function main(): Promise<void> {
  const logger = new Logger('SeedDataset');
  const dataset = syntheticDatasetSchema.parse(
    JSON.parse(await readFile(DATASET_FILE_PATH, 'utf-8')),
  );
  const app = await NestFactory.createApplicationContext(SeedDatasetModule, {
    logger: ['log', 'error', 'warn'],
  });
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));

  try {
    const facilityIdByCode = new Map<string, string>();
    for (const facility of dataset.facilities) {
      const { id } = await prisma.facility.upsert({
        where: { code: facility.code },
        create: facility,
        update: facility,
        select: { id: true },
      });
      facilityIdByCode.set(facility.code, id);
    }

    const patientIdByRecordNo = new Map<string, string>();
    for (const patient of dataset.patients) {
      const patientFields = {
        ...patient,
        birthDate: new Date(patient.birthDate),
      };
      const { id } = await prisma.patient.upsert({
        where: { medicalRecordNo: patient.medicalRecordNo },
        create: patientFields,
        update: patientFields,
        select: { id: true },
      });
      patientIdByRecordNo.set(patient.medicalRecordNo, id);
    }

    for (const evidenceRule of dataset.evidenceRules) {
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

    for (const claim of dataset.claims) {
      const facilityId = facilityIdByCode.get(claim.facilityCode);
      const patientId = patientIdByRecordNo.get(claim.medicalRecordNo);
      if (!facilityId || !patientId) {
        throw new Error(
          `${claim.claimNo} references an unknown facility or patient`,
        );
      }
      const claimFields = {
        facilityId,
        patientId,
        admittedAt: new Date(claim.admittedAt),
        dischargedAt: new Date(claim.dischargedAt),
        inacbgCode: claim.inacbgCode,
        severityLevel: claim.severityLevel,
        tariffAmount: claim.tariffAmount,
        potentialGap: 0,
        priorityScore: 0,
        status: 'PENDING' as const,
        injectedCase: claim.injectedCase,
      };

      await prisma.$transaction(async (transaction) => {
        const { id: claimId } = await transaction.claim.upsert({
          where: { claimNo: claim.claimNo },
          create: { claimNo: claim.claimNo, ...claimFields },
          update: claimFields,
          select: { id: true },
        });
        await transaction.finding.deleteMany({ where: { claimId } });
        await transaction.decision.deleteMany({ where: { claimId } });
        await transaction.claimDiagnosis.deleteMany({ where: { claimId } });
        await transaction.clinicalDocument.deleteMany({ where: { claimId } });
        await transaction.claimDiagnosis.createMany({
          data: claim.diagnoses.map((diagnosis) => ({ ...diagnosis, claimId })),
        });
        await transaction.clinicalDocument.createMany({
          data: claim.documents.map((document) => ({
            claimId,
            type: document.type,
            recordedAt: new Date(document.recordedAt),
            content: document.content,
            extracted: document.extracted as Prisma.InputJsonValue | undefined,
          })),
        });
      });
    }

    const claimsPerScenario = new Map<string, number>();
    for (const claim of dataset.claims) {
      claimsPerScenario.set(
        claim.scenario,
        (claimsPerScenario.get(claim.scenario) ?? 0) + 1,
      );
    }
    const documents = dataset.claims.flatMap((claim) => claim.documents);
    logger.log(
      [
        `Facilities: ${dataset.facilities.length}`,
        `Patients  : ${dataset.patients.length}`,
        `Claims    : ${dataset.claims.length}`,
        ...[...claimsPerScenario].map(
          ([scenario, count]) => `  ${scenario.padEnd(24)} ${count}`,
        ),
        `Documents : ${documents.length} (${documents.filter((document) => document.extracted !== undefined).length} extracted)`,
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
