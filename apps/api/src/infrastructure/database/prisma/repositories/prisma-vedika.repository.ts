import { Injectable } from '@nestjs/common';
import type {
  NewVedikaAttachment,
  VedikaAttachment,
  VedikaAttachmentFile,
} from '../../../../domain/vedika/vedika-attachment';
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
  syncedAt: Prisma.sql`c.vedika_synced_at`,
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
}

type SyncStateCountRow = Record<VedikaSyncState, number> & { total: number };

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
          c.vedika_synced_at AS "syncedAt"
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

  async syncAllClaims(syncedAt: Date): Promise<number> {
    const [{ count }] = await this.prisma.$transaction([
      this.prisma.claim.updateMany({
        where: { status: 'APPROVED' },
        data: { vedikaSyncedAt: syncedAt },
      }),
      this.prisma.vedikaAttachment.updateMany({
        where: { syncedAt: null },
        data: { syncedAt },
      }),
    ]);
    return count;
  }
}
