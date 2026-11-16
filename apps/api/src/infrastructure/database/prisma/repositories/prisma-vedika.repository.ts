import { Injectable } from '@nestjs/common';
import type {
  NewVedikaAttachment,
  VedikaAttachment,
  VedikaAttachmentFile,
} from '../../../../domain/vedika/vedika-attachment';
import {
  buildSimulatedVedikaReply,
  type VedikaReply,
} from '../../../../domain/vedika/vedika-reply';
import type {
  CareType,
  ClaimStatus,
} from '../../../../domain/claims/claim-detail';
import {
  toVedikaSyncState,
  type VedikaClaimPage,
  type VedikaClaimQuery,
  type VedikaClaimSortKey,
  type VedikaSyncState,
} from '../../../../domain/vedika/vedika-claim-summary';
import { VedikaRepository } from '../../../../domain/vedika/vedika.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const VEDIKA_ATTACHMENT_FIELDS = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  syncedAt: true,
  uploadedBy: { select: { id: true, name: true } },
} as const;

const VEDIKA_CLAIM_ORDER_BY: Record<VedikaClaimSortKey, Prisma.Sql> = {
  claimNo: Prisma.sql`c.claim_no`,
  facility: Prisma.sql`fa.name`,
  admittedAt: Prisma.sql`c.admitted_at`,
  syncedAt: Prisma.sql`(SELECT r.synced_at FROM vedika_responses r WHERE r.claim_id = c.id)`,
};

const SYNC_STATE_CONDITIONS: Record<VedikaSyncState, Prisma.Sql> = {
  LATEST: Prisma.sql`c.status <> 'APPROVED'`,
  SENT: Prisma.sql`c.status = 'APPROVED' AND c.vedika_synced_at IS NULL`,
  VERIFIED: Prisma.sql`c.status = 'APPROVED' AND c.vedika_synced_at IS NOT NULL`,
};

const CLAIM_JOINS = Prisma.sql`
  FROM claims c
  JOIN patients p ON p.id = c.patient_id
  JOIN facilities fa ON fa.id = c.facility_id`;

interface VedikaClaimRow {
  claimId: string;
  claimNo: string;
  claimStatus: ClaimStatus;
  careType: CareType;
  admittedAt: Date;
  patientName: string;
  facilityName: string;
  primaryDiagnosis: string | null;
  attachmentCount: number;
  syncedAt: Date | null;
  refreshedAt: Date | null;
}

type SyncStateCountRow = Record<VedikaSyncState, number> & { total: number };

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getString(record: Prisma.JsonObject, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function parseStoredResponse(
  value: Prisma.JsonValue,
  syncedAt: Date,
): VedikaReply | null {
  if (!isJsonObject(value) || value.isSimulated !== true) return null;
  const sep = value.sep;
  const checks = value.checks;
  if (sep === undefined || !isJsonObject(sep) || !Array.isArray(checks))
    return null;
  const number = getString(sep, 'number');
  const sepDateValue = getString(sep, 'date');
  if (number === null || sepDateValue === null) return null;

  const participant = sep.participant;
  const service = sep.service;
  const diagnosis = sep.initialDiagnosis;
  if (
    participant === undefined ||
    service === undefined ||
    !isJsonObject(participant) ||
    !isJsonObject(service)
  )
    return null;
  const cardNumber = getString(participant, 'cardNumber');
  const medicalRecordNo = getString(participant, 'medicalRecordNo');
  const name = getString(participant, 'name');
  const birthDateValue = getString(participant, 'birthDate');
  const phone = getString(participant, 'phone');
  const membership = getString(participant, 'membership');
  const entitledClass = getString(participant, 'entitledClass');
  const facilityName = getString(service, 'facilityName');
  const referringFacility = getString(service, 'referringFacility');
  const careType = getString(service, 'careType');
  const visitType = getString(service, 'visitType');
  const specialty = getString(service, 'specialty');
  const doctor = getString(service, 'doctor');
  const note = getString(service, 'note');
  if (
    cardNumber === null ||
    medicalRecordNo === null ||
    name === null ||
    birthDateValue === null ||
    (participant.gender !== 'M' && participant.gender !== 'F') ||
    phone === null ||
    membership === null ||
    entitledClass === null ||
    facilityName === null ||
    referringFacility === null ||
    careType === null ||
    visitType === null ||
    specialty === null ||
    doctor === null ||
    note === null
  )
    return null;
  let initialDiagnosis: VedikaReply['sep']['initialDiagnosis'];
  if (
    diagnosis !== null &&
    (diagnosis === undefined || !isJsonObject(diagnosis))
  )
    return null;
  if (diagnosis === null) {
    initialDiagnosis = null;
  } else {
    const icd10Code = getString(diagnosis, 'icd10Code');
    const diagnosisName = getString(diagnosis, 'name');
    if (icd10Code === null || diagnosisName === null) return null;
    initialDiagnosis = { icd10Code, name: diagnosisName };
  }

  const parsedChecks: VedikaReply['checks'] = [];
  for (const check of checks) {
    if (!isJsonObject(check)) return null;
    const label = getString(check, 'label');
    if (label === null || check.isPassed !== true) return null;
    parsedChecks.push({ label, isPassed: true });
  }

  const sepDate = new Date(sepDateValue);
  const birthDate = new Date(birthDateValue);
  if (Number.isNaN(sepDate.getTime()) || Number.isNaN(birthDate.getTime()))
    return null;

  return {
    isSimulated: true,
    syncedAt,
    sep: {
      number,
      date: sepDate,
      participant: {
        cardNumber,
        medicalRecordNo,
        name,
        birthDate,
        gender: participant.gender,
        phone,
        membership,
        entitledClass,
      },
      service: {
        facilityName,
        referringFacility,
        careType,
        visitType,
        specialty,
        doctor,
        note,
      },
      initialDiagnosis,
    },
    checks: parsedChecks,
  };
}

export function serializeResponse(
  reply: ReturnType<typeof buildSimulatedVedikaReply>,
): Prisma.InputJsonObject {
  return {
    isSimulated: true,
    sep: {
      number: reply.sep.number,
      date: reply.sep.date.toISOString(),
      participant: {
        ...reply.sep.participant,
        birthDate: reply.sep.participant.birthDate.toISOString(),
      },
      service: reply.sep.service,
      initialDiagnosis: reply.sep.initialDiagnosis,
    },
    checks: reply.checks.map(({ label, isPassed }) => ({ label, isPassed })),
  };
}

function toWhere(conditions: Prisma.Sql[]): Prisma.Sql {
  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

function toSearchConditions(search: string | undefined): Prisma.Sql[] {
  const trimmedSearch = search?.trim();
  if (!trimmedSearch) return [];
  const pattern = `%${trimmedSearch.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  return [
    Prisma.sql`(c.claim_no ILIKE ${pattern} OR p.name ILIKE ${pattern} OR fa.name ILIKE ${pattern})`,
  ];
}

@Injectable()
export class PrismaVedikaRepository extends VedikaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findClaimPage(query: VedikaClaimQuery): Promise<VedikaClaimPage> {
    const searchConditions = toSearchConditions(query.search);
    const where = toWhere(
      query.syncState
        ? [...searchConditions, SYNC_STATE_CONDITIONS[query.syncState]]
        : searchConditions,
    );
    const direction =
      query.sortDirection === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const [rows, [counts]] = await Promise.all([
      this.prisma.$queryRaw<VedikaClaimRow[]>`
        SELECT
          c.id AS "claimId",
          c.claim_no AS "claimNo",
          c.status::text AS "claimStatus",
          c.care_type::text AS "careType",
          c.admitted_at AS "admittedAt",
          p.name AS "patientName",
          fa.name AS "facilityName",
          (
            SELECT d.name FROM claim_diagnoses d
            WHERE d.claim_id = c.id AND d.is_primary
            LIMIT 1
          ) AS "primaryDiagnosis",
          (
            SELECT count(*)::int FROM vedika_attachments a
            WHERE a.claim_id = c.id
          ) AS "attachmentCount",
          c.vedika_synced_at AS "syncedAt",
          (
            SELECT r.synced_at FROM vedika_responses r
            WHERE r.claim_id = c.id
          ) AS "refreshedAt"
        ${CLAIM_JOINS}
        ${where}
        ORDER BY ${VEDIKA_CLAIM_ORDER_BY[query.sortBy]} ${direction} NULLS LAST, c.id ASC
        LIMIT ${query.pageSize}
        OFFSET ${(query.page - 1) * query.pageSize}`,
      this.prisma.$queryRaw<[SyncStateCountRow]>`
        SELECT
          (count(*) FILTER (WHERE ${SYNC_STATE_CONDITIONS.LATEST}))::int AS "LATEST",
          (count(*) FILTER (WHERE ${SYNC_STATE_CONDITIONS.SENT}))::int AS "SENT",
          (count(*) FILTER (WHERE ${SYNC_STATE_CONDITIONS.VERIFIED}))::int AS "VERIFIED",
          count(*)::int AS total
        ${CLAIM_JOINS}
        ${toWhere(searchConditions)}`,
    ]);
    const { total, ...syncStateCounts } = counts;

    return {
      items: rows.map((row) => ({
        ...row,
        syncState: toVedikaSyncState(row.claimStatus, row.syncedAt),
      })),
      total: query.syncState ? syncStateCounts[query.syncState] : total,
      page: query.page,
      pageSize: query.pageSize,
      syncStateCounts,
    };
  }

  addAttachment(newAttachment: NewVedikaAttachment): Promise<VedikaAttachment> {
    return this.prisma.vedikaAttachment.create({
      data: {
        ...newAttachment,
        content: Buffer.from(newAttachment.content),
        sizeBytes: newAttachment.content.byteLength,
      },
      select: VEDIKA_ATTACHMENT_FIELDS,
    });
  }

  listAttachments(claimId: string): Promise<VedikaAttachment[]> {
    return this.prisma.vedikaAttachment.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
      select: VEDIKA_ATTACHMENT_FIELDS,
    });
  }

  findAttachmentFile(
    claimId: string,
    attachmentId: string,
  ): Promise<VedikaAttachmentFile | null> {
    return this.prisma.vedikaAttachment.findFirst({
      where: { id: attachmentId, claimId },
      select: { fileName: true, mimeType: true, content: true },
    });
  }

  async findClaimSyncedAt(claimId: string): Promise<Date | null> {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      select: { vedikaSyncedAt: true },
    });
    return claim?.vedikaSyncedAt ?? null;
  }

  async findClaimResponse(claimId: string): Promise<VedikaReply | null> {
    const snapshot = await this.prisma.vedikaResponse.findUnique({
      where: { claimId },
      select: { response: true, syncedAt: true },
    });
    return snapshot
      ? parseStoredResponse(snapshot.response, snapshot.syncedAt)
      : null;
  }

  async syncAllClaims(
    syncedAt: Date,
  ): Promise<{ refreshedClaimCount: number; verifiedClaimCount: number }> {
    return this.prisma.$transaction(async (transaction) => {
      const claims = await transaction.claim.findMany({
        select: {
          id: true,
          status: true,
          claimNo: true,
          admittedAt: true,
          careType: true,
          patient: {
            select: {
              medicalRecordNo: true,
              name: true,
              gender: true,
              birthDate: true,
            },
          },
          facility: { select: { name: true } },
          diagnoses: {
            where: { isPrimary: true },
            select: { icd10Code: true, name: true },
            take: 1,
          },
          vedikaAttachments: { select: { id: true } },
        },
      });

      const snapshots = claims.map((claim) => {
        const diagnosis = claim.diagnoses[0];
        const reply = buildSimulatedVedikaReply(
          {
            claimNo: claim.claimNo,
            admittedAt: claim.admittedAt,
            careType: claim.careType,
            patient: claim.patient,
            facility: claim.facility,
            diagnoses: diagnosis ? [{ ...diagnosis, isPrimary: true }] : [],
          },
          claim.vedikaAttachments.length > 0,
          syncedAt,
          claim.status === 'APPROVED',
        );
        return {
          claimId: claim.id,
          syncedAt,
          response: serializeResponse(reply),
        };
      });

      const claimIds = claims.map((claim) => claim.id);
      const approvedClaimIds = claims
        .filter((claim) => claim.status === 'APPROVED')
        .map((claim) => claim.id);
      if (claimIds.length > 0) {
        await transaction.vedikaResponse.deleteMany({
          where: { claimId: { in: claimIds } },
        });
        await transaction.vedikaResponse.createMany({ data: snapshots });
      }
      if (approvedClaimIds.length > 0) {
        await transaction.claim.updateMany({
          where: { id: { in: approvedClaimIds }, status: 'APPROVED' },
          data: { vedikaSyncedAt: syncedAt },
        });
      }
      await transaction.vedikaAttachment.updateMany({
        where: { syncedAt: null },
        data: { syncedAt },
      });
      return {
        refreshedClaimCount: claims.length,
        verifiedClaimCount: approvedClaimIds.length,
      };
    });
  }
}
