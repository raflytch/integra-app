import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { EvidenceRule } from '../src/domain/analysis/claim-evidence';
import type { ClinicalExtraction } from '../src/domain/analysis/clinical-extraction';
import type { Prisma } from '../src/generated/prisma/client';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import type { ClaimDetailResponse } from '../src/presentation/presenters/claim-detail.presenter';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const CONTRACTS_DIRECTORY = join(__dirname, '../../../docs/contracts');
const FIXTURE_INJECTED_CASES = ['UPCODING'] as const;
const FIXTURE_EVIDENCE_RULES: EvidenceRule[] = [
  {
    icd10Code: 'R57.9',
    evidenceType: 'PROCEDURE',
    expected: 'resusitasi cairan',
    guidelineRef: 'PNPK Dengue 2021, hlm. 34',
  },
  {
    icd10Code: 'R57.9',
    evidenceType: 'FINDING',
    expected: 'akral dingin',
    guidelineRef: 'PNPK Dengue 2021, hlm. 31',
  },
  {
    icd10Code: 'R57.9',
    evidenceType: 'VITAL_SIGN',
    expected: 'hipotensi',
    guidelineRef: 'PNPK Dengue 2021, hlm. 31',
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
class ContractFixtureModule {}

function readContractExample<T>(fileName: string): T {
  return JSON.parse(
    readFileSync(join(CONTRACTS_DIRECTORY, fileName), 'utf-8'),
  ) as T;
}

function extractQuotedInDocument(
  extraction: ClinicalExtraction,
  documentContent: string,
): ClinicalExtraction {
  const isQuotedInDocument = (item: { quote: string }) =>
    documentContent.includes(item.quote);
  return {
    diagnoses: extraction.diagnoses.filter(isQuotedInDocument),
    findings: extraction.findings.filter(isQuotedInDocument),
    vitalSigns: extraction.vitalSigns.filter(isQuotedInDocument),
    medications: extraction.medications.filter(isQuotedInDocument),
    procedures: extraction.procedures.filter(isQuotedInDocument),
  };
}

async function main(): Promise<void> {
  const logger = new Logger('ContractFixture');
  const app = await NestFactory.createApplicationContext(
    ContractFixtureModule,
    { logger: ['log', 'error', 'warn'] },
  );
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));
  const fixture = readContractExample<ClaimDetailResponse>(
    'claim-detail.example.json',
  );
  const clinicalExtraction = readContractExample<ClinicalExtraction>(
    'clinical-extraction.example.json',
  );
  const { facility, patient } = fixture;
  const claimFields = {
    claimNo: fixture.claimNo,
    facilityId: facility.id,
    patientId: patient.id,
    admittedAt: new Date(fixture.admittedAt),
    dischargedAt: new Date(fixture.dischargedAt),
    inacbgCode: fixture.inacbgCode,
    severityLevel: fixture.severityLevel,
    tariffAmount: fixture.tariffAmount,
    potentialGap: 0,
    priorityScore: 0,
    injectedCase: [...FIXTURE_INJECTED_CASES],
  };
  const patientFields = { ...patient, birthDate: new Date(patient.birthDate) };

  await prisma.$transaction([
    prisma.facility.upsert({
      where: { id: facility.id },
      create: facility,
      update: facility,
    }),
    prisma.patient.upsert({
      where: { id: patient.id },
      create: patientFields,
      update: patientFields,
    }),
    prisma.claim.upsert({
      where: { id: fixture.id },
      create: { id: fixture.id, status: fixture.status, ...claimFields },
      update: claimFields,
    }),
    prisma.finding.deleteMany({ where: { claimId: fixture.id } }),
    prisma.clinicalDocument.deleteMany({ where: { claimId: fixture.id } }),
    prisma.claimDiagnosis.deleteMany({ where: { claimId: fixture.id } }),
    prisma.claimDiagnosis.createMany({
      data: fixture.diagnoses.map((diagnosis) => ({
        ...diagnosis,
        claimId: fixture.id,
      })),
    }),
    prisma.clinicalDocument.createMany({
      data: fixture.documents.map((document) => ({
        id: document.id,
        type: document.type,
        content: document.content,
        claimId: fixture.id,
        recordedAt: new Date(document.recordedAt),
        extracted: extractQuotedInDocument(
          clinicalExtraction,
          document.content,
        ) as unknown as Prisma.InputJsonObject,
      })),
    }),
    ...FIXTURE_EVIDENCE_RULES.map((evidenceRule) =>
      prisma.evidenceRule.upsert({
        where: {
          icd10Code_evidenceType_expected: {
            icd10Code: evidenceRule.icd10Code,
            evidenceType: evidenceRule.evidenceType,
            expected: evidenceRule.expected,
          },
        },
        create: evidenceRule,
        update: { guidelineRef: evidenceRule.guidelineRef },
      }),
    ),
  ]);

  logger.log(
    `Loaded ${fixture.claimNo} with extraction and ${FIXTURE_EVIDENCE_RULES.length} evidence rules. Select it in Antrean Klaim and click "Analisis AI" to create findings (no LLM call, it is already extracted).`,
  );
  await prisma.$disconnect();
  await app.close();
}

void main();
