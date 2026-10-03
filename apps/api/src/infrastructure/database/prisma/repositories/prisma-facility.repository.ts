import { Injectable } from '@nestjs/common';
import type { FacilityType } from '../../../../domain/claims/claim-detail';
import type { FacilityOption } from '../../../../domain/facilities/facility-option';
import type {
  FacilitySummaryPage,
  FacilitySummaryQuery,
  FacilitySummarySortKey,
} from '../../../../domain/facilities/facility-summary';
import { FacilityRepository } from '../../../../domain/facilities/facility.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

interface FacilitySummaryRow {
  id: string;
  code: string;
  name: string;
  type: FacilityType;
  city: string;
  claimCount: number;
  flaggedClaimCount: number;
  existenceCount: number;
  consistencyCount: number;
  similarityCount: number;
  totalPotentialGap: number;
}

/** Whitelisted ORDER BY targets; never interpolate a client value into SQL. */
const SUMMARY_ORDER_BY: Record<FacilitySummarySortKey, Prisma.Sql> = {
  facility: Prisma.sql`fa.name`,
  claimCount: Prisma.sql`"claimCount"`,
  flaggedClaimCount: Prisma.sql`"flaggedClaimCount"`,
  EXISTENCE: Prisma.sql`"existenceCount"`,
  CONSISTENCY: Prisma.sql`"consistencyCount"`,
  SIMILARITY: Prisma.sql`"similarityCount"`,
  totalPotentialGap: Prisma.sql`"totalPotentialGap"`,
};

function toSummaryWhere(query: FacilitySummaryQuery): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  const search = query.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    conditions.push(
      Prisma.sql`(fa.name ILIKE ${pattern} OR fa.code ILIKE ${pattern} OR fa.city ILIKE ${pattern})`,
    );
  }
  if (query.type) conditions.push(Prisma.sql`fa.type::text = ${query.type}`);
  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

@Injectable()
export class PrismaFacilityRepository extends FacilityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findOptions(): Promise<FacilityOption[]> {
    return this.prisma.facility.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findSummaryPage(
    query: FacilitySummaryQuery,
  ): Promise<FacilitySummaryPage> {
    const where = toSummaryWhere(query);
    const direction =
      query.sortDirection === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<FacilitySummaryRow[]>`
        WITH claim_stats AS (
          SELECT
            c.facility_id,
            count(*)::int AS claim_count,
            (count(*) FILTER (
              WHERE EXISTS (SELECT 1 FROM findings f WHERE f.claim_id = c.id)
            ))::int AS flagged_claim_count,
            sum(c.potential_gap) AS total_potential_gap
          FROM claims c
          GROUP BY c.facility_id
        ),
        finding_stats AS (
          SELECT
            c.facility_id,
            (count(*) FILTER (WHERE f.test_type = 'EXISTENCE'))::int AS existence_count,
            (count(*) FILTER (WHERE f.test_type = 'CONSISTENCY'))::int AS consistency_count,
            (count(*) FILTER (WHERE f.test_type = 'SIMILARITY'))::int AS similarity_count
          FROM findings f
          JOIN claims c ON c.id = f.claim_id
          GROUP BY c.facility_id
        )
        SELECT
          fa.id,
          fa.code,
          fa.name,
          fa.type::text AS "type",
          fa.city,
          coalesce(cs.claim_count, 0) AS "claimCount",
          coalesce(cs.flagged_claim_count, 0) AS "flaggedClaimCount",
          coalesce(fs.existence_count, 0) AS "existenceCount",
          coalesce(fs.consistency_count, 0) AS "consistencyCount",
          coalesce(fs.similarity_count, 0) AS "similarityCount",
          coalesce(cs.total_potential_gap, 0)::float8 AS "totalPotentialGap"
        FROM facilities fa
        LEFT JOIN claim_stats cs ON cs.facility_id = fa.id
        LEFT JOIN finding_stats fs ON fs.facility_id = fa.id
        ${where}
        ORDER BY ${SUMMARY_ORDER_BY[query.sortBy]} ${direction}, fa.id ASC
        LIMIT ${query.pageSize}
        OFFSET ${(query.page - 1) * query.pageSize}`,
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT count(*)::int AS total FROM facilities fa ${where}`,
    ]);

    return {
      items: rows.map((row) => ({
        facility: {
          id: row.id,
          code: row.code,
          name: row.name,
          type: row.type,
          city: row.city,
        },
        claimCount: row.claimCount,
        flaggedClaimCount: row.flaggedClaimCount,
        findingCounts: {
          EXISTENCE: row.existenceCount,
          CONSISTENCY: row.consistencyCount,
          SIMILARITY: row.similarityCount,
        },
        totalPotentialGap: row.totalPotentialGap,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
