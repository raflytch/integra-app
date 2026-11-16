/**
 * Seeds demo claims built from BPJS Kesehatan sample visits (data/bpjs-sample-visits.json):
 * real diagnoses, INA-CBG codes, tariffs, and length of stay, with synthetic
 * patients and SEP numbers. Documents come from templates and are stored
 * unread, so Analisis in the app reads them with the LLM. Runs on every
 * deploy: it skips when the same claims are already seeded, unless --force.
 * It replaces only claims whose SEP number starts with 9900R (with their
 * findings and decisions) and their patients, and removes the KLM-BPJS-* claims
 * imported from data/integra-claim-import-bpjs.json even when it skips.
 *
 *   npm run seed:demo                      # 5,000 claims
 *   npm run seed:demo -- --count=800       # custom size
 *   npm run seed:demo -- --force           # reseed even when already seeded
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
import { buildSimulatedVedikaReply } from '../src/domain/vedika/vedika-reply';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { serializeResponse } from '../src/infrastructure/database/prisma/repositories/prisma-vedika.repository';
import {
  DEMO_DATASET_SEED,
  generateBpjsSampleClaims,
  SAMPLE_CLAIM_NO_PREFIX,
  SAMPLE_RECORD_NO_PREFIX,
  type SampleProfile,
} from './synthetic/bpjs-sample-claims';
import { EVIDENCE_RULES } from './synthetic/scenarios';
import { renderSepPage } from './synthetic/sep-pdf';
import {
  layoutTextPages,
  renderPdf,
  renderTextPdf,
} from './synthetic/text-pdf';
import { upsertEvidenceRules } from './synthetic/upsert-evidence-rules';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const DEFAULT_CLAIM_COUNT = 5000;
const MAX_CLAIM_COUNT = 5000;
const LEGACY_DEMO_CLAIM_NO_PREFIX = 'KLM-DEMO-';
const IMPORTED_CLAIM_NO_PREFIX = 'KLM-BPJS-';
const INSERT_BATCH_SIZE = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ATTACHED_CLARIFICATION_COUNT = 14;
const SYNCED_CLARIFICATION_COUNT = 8;
const DOCUMENT_LABELS: Record<DocumentType, string> = {
  MEDICAL_RESUME: 'Resume medis',
  EXAM_NOTE: 'Catatan pemeriksaan',
  DAILY_NOTE: 'Catatan harian',
  PRESCRIPTION: 'Resep',
  PROCEDURE: 'Catatan tindakan',
};
const SAMPLE_DECISIONS: {
  count: number;
  profiles: SampleProfile[];
  action: DecisionAction;
  reason: string;
  missingDocumentTypes: DocumentType[];
}[] = [
  {
    count: 10,
    profiles: ['SUPPORTED'],
    action: 'APPROVE',
    reason:
      'Diagnosis sekunder didukung bukti klinis lengkap di rekam medis, klaim dibayar sesuai pengajuan.',
    missingDocumentTypes: [],
  },
  {
    count: 20,
    profiles: ['UPCODING'],
    action: 'REQUEST_CLARIFICATION',
    reason:
      'Diagnosis sekunder belum didukung bukti tindakan dan catatan perkembangan pasien. Mohon faskes melengkapi lewat VEDIKA.',
    missingDocumentTypes: ['PROCEDURE', 'DAILY_NOTE'],
  },
  {
    count: 6,
    profiles: ['CLONING'],
    action: 'ESCALATE',
    reason:
      'Dokumen klinis hampir identik dengan klaim pasien lain dengan diagnosis yang sama, perlu ditinjau tim anti-fraud.',
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

function chunks<Item>(items: Item[]): Item[][] {
  return Array.from(
    { length: Math.ceil(items.length / INSERT_BATCH_SIZE) },
    (_, index) =>
      items.slice(index * INSERT_BATCH_SIZE, (index + 1) * INSERT_BATCH_SIZE),
  );
}

async function removeImportedClaims(
  prisma: PrismaService,
  logger: Logger,
): Promise<void> {
  const importedClaimFilter = {
    claimNo: { startsWith: IMPORTED_CLAIM_NO_PREFIX },
  };
  const importedClaims = await prisma.claim.findMany({
    where: importedClaimFilter,
    select: { patientId: true, facilityId: true },
  });
  if (importedClaims.length === 0) return;

  await prisma.$transaction(
    async (transaction) => {
      await transaction.decision.deleteMany({
        where: { claim: importedClaimFilter },
      });
      await transaction.claim.deleteMany({ where: importedClaimFilter });
      await transaction.patient.deleteMany({
        where: {
          id: {
            in: [...new Set(importedClaims.map((claim) => claim.patientId))],
          },
          claims: { none: {} },
        },
      });
      await transaction.facility.deleteMany({
        where: {
          id: {
            in: [...new Set(importedClaims.map((claim) => claim.facilityId))],
          },
          claims: { none: {} },
        },
      });
    },
    { timeout: 120_000 },
  );
  logger.log(
    `${importedClaims.length} klaim ${IMPORTED_CLAIM_NO_PREFIX}* dihapus.`,
  );
}

async function main(): Promise<void> {
  const logger = new Logger('SeedDemoClaims');
  const { claims, facilities } = generateBpjsSampleClaims(
    readClaimCount(),
    DEMO_DATASET_SEED,
  );
  const app = await NestFactory.createApplicationContext(SeedDemoClaimsModule, {
    logger: ['log', 'error', 'warn'],
  });
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));

  try {
    await removeImportedClaims(prisma, logger);

    const demoClaimFilter = {
      OR: [SAMPLE_CLAIM_NO_PREFIX, LEGACY_DEMO_CLAIM_NO_PREFIX].map(
        (prefix) => ({ claimNo: { startsWith: prefix } }),
      ),
    };
    const seededCount = await prisma.claim.count({ where: demoClaimFilter });
    const lastClaim = claims.at(-1);
    const isAlreadySeeded =
      seededCount === claims.length &&
      lastClaim !== undefined &&
      (await prisma.claim.count({ where: { claimNo: lastClaim.claimNo } })) ===
        1;
    if (isAlreadySeeded && !process.argv.includes('--force')) {
      logger.log(
        `Klaim demo sudah ada (${seededCount}); dilewati. Pakai --force untuk mengganti.`,
      );
      return;
    }

    const facilityIdByCode = new Map<string, string>();
    for (const facility of facilities) {
      const { id } = await prisma.facility.upsert({
        where: { code: facility.code },
        create: facility,
        update: facility,
        select: { id: true },
      });
      facilityIdByCode.set(facility.code, id);
    }
    await upsertEvidenceRules(prisma, EVIDENCE_RULES);

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
            medicalRecordNo: { startsWith: SAMPLE_RECORD_NO_PREFIX },
            claims: { none: {} },
          },
        });

        for (const batch of chunks(claims)) {
          await transaction.patient.createMany({
            data: batch.map((claim) => claim.patient),
          });
        }
        const patients = await transaction.patient.findMany({
          where: { medicalRecordNo: { startsWith: SAMPLE_RECORD_NO_PREFIX } },
          select: { id: true, medicalRecordNo: true },
        });
        const patientIdByRecordNo = new Map(
          patients.map((patient) => [patient.medicalRecordNo, patient.id]),
        );

        for (const batch of chunks(claims)) {
          await transaction.claim.createMany({
            data: batch.map((claim) => ({
              claimNo: claim.claimNo,
              facilityId: facilityIdByCode.get(claim.facilityCode)!,
              patientId: patientIdByRecordNo.get(
                claim.patient.medicalRecordNo,
              )!,
              careType: claim.careType,
              admittedAt: claim.admittedAt,
              dischargedAt: claim.dischargedAt,
              inacbgCode: claim.inacbgCode,
              severityLevel: claim.severityLevel,
              tariffAmount: claim.tariffAmount,
              injectedCase: claim.injectedCase,
            })),
          });
        }
        const createdClaims = await transaction.claim.findMany({
          where: demoClaimFilter,
          select: { id: true, claimNo: true },
        });
        const claimIdByNo = new Map(
          createdClaims.map((claim) => [claim.claimNo, claim.id]),
        );

        for (const batch of chunks(claims)) {
          await transaction.claimDiagnosis.createMany({
            data: batch.flatMap((claim) =>
              claim.diagnoses.map((diagnosis) => ({
                ...diagnosis,
                claimId: claimIdByNo.get(claim.claimNo)!,
              })),
            ),
          });
          await transaction.claimProcedure.createMany({
            data: batch.flatMap((claim) =>
              claim.procedures.map((procedure) => ({
                ...procedure,
                claimId: claimIdByNo.get(claim.claimNo)!,
              })),
            ),
          });
          await transaction.clinicalDocument.createMany({
            data: batch.flatMap((claim) =>
              claim.documents.map((document) => ({
                type: document.type,
                recordedAt: document.recordedAt,
                content: document.content,
                claimId: claimIdByNo.get(claim.claimNo)!,
              })),
            ),
          });
        }

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
            .slice(0, sample.count);
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

        const syncedAt = new Date(Date.now() - DAY_MS);
        const clarificationSample = SAMPLE_DECISIONS.find(
          (sample) => sample.action === 'REQUEST_CLARIFICATION',
        )!;
        const clarifiedClaims = claims
          .filter((claim) =>
            clarificationSample.profiles.includes(claim.profile),
          )
          .slice(0, ATTACHED_CLARIFICATION_COUNT);
        const syncedAttachmentClaimNos = new Set<string>();
        for (const [index, claim] of clarifiedClaims.entries()) {
          const claimId = claimIdByNo.get(claim.claimNo)!;
          const isSynced = index < SYNCED_CLARIFICATION_COUNT;
          if (isSynced) syncedAttachmentClaimNos.add(claim.claimNo);
          for (const documentType of clarificationSample.missingDocumentTypes) {
            const label = DOCUMENT_LABELS[documentType];
            const sourceDocument = claim.documents.find(
              (document) => document.type === documentType,
            );
            const content = renderTextPdf([
              `Dokumen klarifikasi VEDIKA: ${label}`,
              `No. SEP ${claim.claimNo} | No. RM ${claim.patient.medicalRecordNo}`,
              `Faskes ${claim.facilityCode} | Tanggal pelayanan ${claim.admittedAt.toISOString().slice(0, 10)}`,
              sourceDocument?.content ??
                `${label} tidak tersedia; tidak ada catatan tambahan selain yang sudah ada di rekam medis.`,
              'Dikirim faskes sebagai jawaban permintaan klarifikasi verifikator.',
            ]);
            await transaction.vedikaAttachment.create({
              data: {
                claimId,
                uploadedById: demoVerifier.id,
                fileName: `${label} ${claim.claimNo}.pdf`,
                mimeType: 'application/pdf',
                sizeBytes: content.byteLength,
                content: Buffer.from(content),
                syncedAt: isSynced ? syncedAt : null,
              },
            });
            if (isSynced) {
              await transaction.decisionDocumentRequest.updateMany({
                where: { decision: { claimId }, documentType },
                data: { receivedAt: syncedAt },
              });
            }
          }
        }

        const approvedClaimNos = new Set(
          claims
            .filter((claim) =>
              SAMPLE_DECISIONS[0].profiles.includes(claim.profile),
            )
            .slice(0, SAMPLE_DECISIONS[0].count)
            .map((claim) => claim.claimNo),
        );
        const facilityNameByCode = new Map(
          facilities.map((facility) => [facility.code, facility.name]),
        );
        const replyByClaimNo = new Map(
          claims.map((claim) => [
            claim.claimNo,
            buildSimulatedVedikaReply(
              {
                claimNo: claim.claimNo,
                admittedAt: claim.admittedAt,
                careType: claim.careType,
                patient: claim.patient,
                facility: {
                  name: facilityNameByCode.get(claim.facilityCode)!,
                },
                diagnoses: claim.diagnoses,
              },
              syncedAttachmentClaimNos.has(claim.claimNo),
              syncedAt,
              approvedClaimNos.has(claim.claimNo),
            ),
          ]),
        );
        for (const batch of chunks(claims)) {
          await transaction.vedikaResponse.createMany({
            data: batch.map((claim) => ({
              claimId: claimIdByNo.get(claim.claimNo)!,
              syncedAt,
              response: serializeResponse(replyByClaimNo.get(claim.claimNo)!),
            })),
          });
        }
        await transaction.claim.updateMany({
          where: {
            claimNo: { in: [...approvedClaimNos] },
            status: 'APPROVED',
          },
          data: { vedikaSyncedAt: syncedAt },
        });

        for (const batch of chunks(claims)) {
          await transaction.vedikaAttachment.createMany({
            data: batch.map((claim) => {
              const content = renderPdf([
                renderSepPage(
                  replyByClaimNo.get(claim.claimNo)!.sep,
                  claim.careType === 'INPATIENT',
                  syncedAt,
                ),
                ...layoutTextPages([
                  `Berkas klaim VEDIKA: ${claim.claimNo}`,
                  `No. RM ${claim.patient.medicalRecordNo} | ${facilityNameByCode.get(claim.facilityCode)}`,
                  `Pelayanan ${claim.admittedAt.toISOString().slice(0, 10)} sampai ${claim.dischargedAt.toISOString().slice(0, 10)} | INA-CBG ${claim.inacbgCode} | Tarif Rp ${claim.tariffAmount.toLocaleString('id-ID')}`,
                  ...claim.diagnoses.map(
                    (diagnosis) =>
                      `${diagnosis.isPrimary ? 'Diagnosis utama' : 'Diagnosis sekunder'}: ${diagnosis.name} (${diagnosis.icd10Code})`,
                  ),
                  ...claim.documents.map(
                    (document) =>
                      `${DOCUMENT_LABELS[document.type]} (${document.recordedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC): ${document.content}`,
                  ),
                ]),
              ]);
              return {
                claimId: claimIdByNo.get(claim.claimNo)!,
                uploadedById: demoVerifier.id,
                fileName: `Berkas klaim ${claim.claimNo}.pdf`,
                mimeType: 'application/pdf',
                sizeBytes: content.byteLength,
                content: Buffer.from(content),
                createdAt: new Date(syncedAt.getTime() - DAY_MS),
                syncedAt,
              };
            }),
          });
        }
      },
      { timeout: 600_000 },
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
        `Faskes    : ${facilities.length}`,
        `Klaim demo: ${claims.length} (dokumen belum dibaca AI, belum dianalisis)`,
        ...[...claimsPerProfile]
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([profile, count]) => `  ${profile.padEnd(24)} ${count}`),
        `Dokumen   : ${claims.reduce((total, claim) => total + claim.documents.length, 0)}`,
        'Pilih klaim di Antrean Klaim lalu klik Analisis; AI membaca dokumennya (berbayar) lalu aturan INTEGRA dijalankan.',
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
