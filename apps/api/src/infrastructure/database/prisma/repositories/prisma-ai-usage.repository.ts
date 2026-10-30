import { Injectable } from '@nestjs/common';
import type {
  AiUsageDay,
  AiUsageTotals,
  ClaimAiUsagePage,
  ClaimAiUsageQuery,
  ClaimAiUsageSortKey,
} from '../../../../domain/ai-usage/ai-usage';
import { AiUsageRepository } from '../../../../domain/ai-usage/ai-usage.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

interface ClaimAiUsageRow {
  claimId: string;
  claimNo: string;
  facilityName: string;
  documentCount: number;
  inputTokens: number;
  outputTokens: number;
  models: string[];
  lastExtractedAt: Date;
}

/** Whitelisted ORDER BY targets; never interpolate a client value into SQL. */
const CLAIM_USAGE_ORDER_BY: Record<ClaimAiUsageSortKey, Prisma.Sql> = {
  claimNo: Prisma.sql`c.claim_no`,
  documentCount: Prisma.sql`"documentCount"`,
  inputTokens: Prisma.sql`"inputTokens"`,
  outputTokens: Prisma.sql`"outputTokens"`,
  lastExtractedAt: Prisma.sql`"lastExtractedAt"`,
};

/** Only extractions that recorded their tokens count as usage. */
const RECORDED_USAGE = Prisma.sql`d.extraction_input_tokens IS NOT NULL`;

function toClaimUsageWhere(query: ClaimAiUsageQuery): Prisma.Sql {
  const search = query.search?.trim();
  if (!search) return Prisma.empty;
  const pattern = `%${search.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  return Prisma.sql`WHERE c.claim_no ILIKE ${pattern} OR fa.name ILIKE ${pattern}`;
}

@Injectable()
export class PrismaAiUsageRepository extends AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findTotals(): Promise<AiUsageTotals> {
    const [totals] = await this.prisma.$queryRaw<[AiUsageTotals]>`
      SELECT
        count(*)::int AS "documentCount",
        count(DISTINCT d.claim_id)::int AS "claimCount",
        coalesce(sum(d.extraction_input_tokens), 0)::int AS "inputTokens",
        coalesce(sum(d.extraction_output_tokens), 0)::int AS "outputTokens"
      FROM clinical_documents d
      WHERE ${RECORDED_USAGE}`;
    return totals;
  }

  findDailyUsage(since: Date): Promise<AiUsageDay[]> {
    return this.prisma.$queryRaw<AiUsageDay[]>`
      SELECT
        to_char(d.extracted_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS "date",
        count(*)::int AS "documentCount",
        sum(d.extraction_input_tokens)::int AS "inputTokens",
        sum(d.extraction_output_tokens)::int AS "outputTokens"
      FROM clinical_documents d
      WHERE ${RECORDED_USAGE} AND d.extracted_at >= ${since}
      GROUP BY 1
      ORDER BY 1`;
  }

  async findClaimUsagePage(
    query: ClaimAiUsageQuery,
  ): Promise<ClaimAiUsagePage> {
    const where = toClaimUsageWhere(query);
    const direction =
      query.sortDirection === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const usageByClaim = Prisma.sql`
      SELECT
        d.claim_id,
        count(*)::int AS document_count,
        sum(d.extraction_input_tokens)::int AS input_tokens,
        sum(d.extraction_output_tokens)::int AS output_tokens,
        array_agg(DISTINCT d.extracted_model ORDER BY d.extracted_model)
          FILTER (WHERE d.extracted_model IS NOT NULL) AS models,
        max(d.extracted_at) AS last_extracted_at
      FROM clinical_documents d
      WHERE ${RECORDED_USAGE}
      GROUP BY d.claim_id`;
    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<ClaimAiUsageRow[]>`
        WITH usage AS (${usageByClaim})
        SELECT
          c.id AS "claimId",
          c.claim_no AS "claimNo",
          fa.name AS "facilityName",
          u.document_count AS "documentCount",
          u.input_tokens AS "inputTokens",
          u.output_tokens AS "outputTokens",
          coalesce(u.models, '{}') AS "models",
          u.last_extracted_at AS "lastExtractedAt"
        FROM usage u
        JOIN claims c ON c.id = u.claim_id
        JOIN facilities fa ON fa.id = c.facility_id
        ${where}
        ORDER BY ${CLAIM_USAGE_ORDER_BY[query.sortBy]} ${direction} NULLS LAST, c.id ASC
        LIMIT ${query.pageSize}
        OFFSET ${(query.page - 1) * query.pageSize}`,
      this.prisma.$queryRaw<[{ total: number }]>`
        WITH usage AS (${usageByClaim})
        SELECT count(*)::int AS total
        FROM usage u
        JOIN claims c ON c.id = u.claim_id
        JOIN facilities fa ON fa.id = c.facility_id
        ${where}`,
    ]);

    return {
      items: rows.map(({ lastExtractedAt, ...row }) => ({
        ...row,
        lastExtractedAt: lastExtractedAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
