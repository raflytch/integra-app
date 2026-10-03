import { Injectable } from '@nestjs/common';
import type {
  ClaimDetail,
  ClaimStatus,
  FindingCitation,
} from '../../../../domain/claims/claim-detail';
import type {
  ClaimQueuePage,
  ClaimQueueQuery,
  ClaimQueueSortKey,
  ClaimStatistics,
  MonthlyClaimCounts,
  SortDirection,
} from '../../../../domain/claims/claim-queue-item';
import { ClaimRepository } from '../../../../domain/claims/claim.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { countFindingsByTestType } from './finding-counts';
import { DECISION_FIELDS } from './prisma-decision.repository';

const CITATION_KINDS = new Set<FindingCitation['kind']>([
  'MISSING_EVIDENCE',
  'QUOTE',
  'IDENTICAL_TEXT',
]);

function isFindingCitation(value: unknown): value is FindingCitation {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false;
  }
  return CITATION_KINDS.has(value.kind as FindingCitation['kind']);
}

function toFindingCitations(storedCitations: unknown): FindingCitation[] {
  return Array.isArray(storedCitations)
    ? storedCitations.filter(isFindingCitation)
    : [];
}

const QUEUE_ITEM_FIELDS = {
  id: true,
  claimNo: true,
  status: true,
  admittedAt: true,
  dischargedAt: true,
  inacbgCode: true,
  severityLevel: true,
  tariffAmount: true,
  potentialGap: true,
  priorityScore: true,
  analyzedAt: true,
  facility: { select: { id: true, name: true, type: true } },
  diagnoses: {
    where: { isPrimary: true },
    select: { icd10Code: true, name: true },
    take: 1,
  },
  findings: { select: { testType: true } },
  _count: { select: { documents: true } },
} satisfies Prisma.ClaimSelect;

const QUEUE_ORDER_BY: Record<
  ClaimQueueSortKey,
  (direction: SortDirection) => Prisma.ClaimOrderByWithRelationInput
> = {
  priority: (direction) => ({ priorityScore: direction }),
  claimNo: (direction) => ({ claimNo: direction }),
  facility: (direction) => ({ facility: { name: direction } }),
  admittedAt: (direction) => ({ admittedAt: direction }),
  findings: (direction) => ({ findings: { _count: direction } }),
  potentialGap: (direction) => ({ potentialGap: direction }),
  status: (direction) => ({ status: direction }),
  analyzedAt: (direction) => ({
    analyzedAt: { sort: direction, nulls: 'last' },
  }),
};

/** Ties follow the default queue order; the id keeps pages from overlapping. */
const QUEUE_TIEBREAKERS: Prisma.ClaimOrderByWithRelationInput[] = [
  { priorityScore: 'desc' },
  { potentialGap: 'desc' },
  { id: 'asc' },
];

function toQueueWhere(query: ClaimQueueQuery): Prisma.ClaimWhereInput {
  const conditions: Prisma.ClaimWhereInput[] = [];
  if (query.analysis) {
    conditions.push({
      analyzedAt: query.analysis === 'ANALYZED' ? { not: null } : null,
    });
  }
  if (query.signal) {
    conditions.push({
      analyzedAt: { not: null },
      findings: query.signal === 'FLAGGED' ? { some: {} } : { none: {} },
    });
  }
  const search = query.search?.trim();
  if (search) {
    const contains = { contains: search, mode: 'insensitive' as const };
    conditions.push({
      OR: [
        { claimNo: contains },
        { inacbgCode: contains },
        { facility: { name: contains } },
        {
          diagnoses: {
            some: {
              isPrimary: true,
              OR: [{ name: contains }, { icd10Code: contains }],
            },
          },
        },
      ],
    });
  }
  return {
    status: query.status,
    facilityId: query.facilityId,
    AND: conditions,
  };
}

@Injectable()
export class PrismaClaimRepository extends ClaimRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async exists(claimId: string): Promise<boolean> {
    const matchingClaimCount = await this.prisma.claim.count({
      where: { id: claimId },
    });
    return matchingClaimCount > 0;
  }

  async findQueuePage(query: ClaimQueueQuery): Promise<ClaimQueuePage> {
    const where = toQueueWhere(query);
    const [total, claims] = await this.prisma.$transaction([
      this.prisma.claim.count({ where }),
      this.prisma.claim.findMany({
        where,
        orderBy: [
          QUEUE_ORDER_BY[query.sortBy](query.sortDirection),
          ...QUEUE_TIEBREAKERS,
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: QUEUE_ITEM_FIELDS,
      }),
    ]);
    const extractedDocumentCounts = await this.prisma.clinicalDocument.groupBy({
      by: ['claimId'],
      where: {
        claimId: { in: claims.map((claim) => claim.id) },
        NOT: { extracted: { equals: Prisma.DbNull } },
      },
      _count: { _all: true },
    });
    const extractedDocumentCountByClaimId = new Map(
      extractedDocumentCounts.map((group) => [
        group.claimId,
        group._count._all,
      ]),
    );

    const items = claims.map(({ diagnoses, findings, _count, ...claim }) => ({
      ...claim,
      tariffAmount: claim.tariffAmount.toNumber(),
      potentialGap: claim.potentialGap.toNumber(),
      primaryDiagnosis: diagnoses[0] ?? null,
      findingCounts: countFindingsByTestType(findings),
      documentCount: _count.documents,
      extractedDocumentCount:
        extractedDocumentCountByClaimId.get(claim.id) ?? 0,
    }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getStatistics(): Promise<ClaimStatistics> {
    const [
      totalCount,
      analyzedCount,
      flaggedCount,
      gapSum,
      statusGroups,
      monthlyCounts,
    ] = await Promise.all([
      this.prisma.claim.count(),
      this.prisma.claim.count({ where: { analyzedAt: { not: null } } }),
      this.prisma.claim.count({ where: { findings: { some: {} } } }),
      this.prisma.claim.aggregate({ _sum: { potentialGap: true } }),
      this.prisma.claim.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.$queryRaw<MonthlyClaimCounts[]>`
        SELECT
          to_char(c.admitted_at, 'YYYY-MM') AS "month",
          count(*) FILTER (WHERE c.analyzed_at IS NULL)::int AS "notAnalyzed",
          count(*) FILTER (
            WHERE c.analyzed_at IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM findings f WHERE f.claim_id = c.id)
          )::int AS "clean",
          count(*) FILTER (
            WHERE c.analyzed_at IS NOT NULL
              AND EXISTS (SELECT 1 FROM findings f WHERE f.claim_id = c.id)
          )::int AS "flagged"
        FROM claims c
        GROUP BY 1
        ORDER BY 1`,
    ]);

    const statusCounts: Record<ClaimStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      CLARIFICATION_REQUESTED: 0,
      ESCALATED: 0,
    };
    statusGroups.forEach((group) => {
      statusCounts[group.status] = group._count._all;
    });
    return {
      totalCount,
      analyzedCount,
      flaggedCount,
      totalPotentialGap: gapSum._sum.potentialGap?.toNumber() ?? 0,
      statusCounts,
      monthlyCounts,
    };
  }

  async findDetailById(claimId: string): Promise<ClaimDetail | null> {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        facility: true,
        patient: true,
        diagnoses: {
          select: { id: true, icd10Code: true, name: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { icd10Code: 'asc' }],
        },
        documents: {
          select: {
            id: true,
            type: true,
            recordedAt: true,
            content: true,
            extracted: true,
          },
          orderBy: { recordedAt: 'asc' },
        },
        findings: {
          orderBy: [{ testType: 'asc' }, { strength: 'desc' }],
          include: {
            relatedClaim: {
              select: {
                id: true,
                claimNo: true,
                facility: { select: { name: true } },
              },
            },
          },
        },
        decisions: {
          select: DECISION_FIELDS,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!claim) return null;

    return {
      id: claim.id,
      claimNo: claim.claimNo,
      status: claim.status,
      admittedAt: claim.admittedAt,
      dischargedAt: claim.dischargedAt,
      inacbgCode: claim.inacbgCode,
      severityLevel: claim.severityLevel,
      tariffAmount: claim.tariffAmount.toNumber(),
      potentialGap: claim.potentialGap.toNumber(),
      priorityScore: claim.priorityScore,
      analyzedAt: claim.analyzedAt,
      facility: claim.facility,
      patient: claim.patient,
      diagnoses: claim.diagnoses,
      documents: claim.documents.map(({ extracted, ...document }) => ({
        ...document,
        isExtracted: extracted !== null,
      })),
      findings: claim.findings.map((finding) => ({
        id: finding.id,
        testType: finding.testType,
        strength: finding.strength,
        summary: finding.summary,
        citations: toFindingCitations(finding.citations),
        documentId: finding.documentId,
        relatedDocumentId: finding.relatedDocumentId,
        diagnosisId: finding.diagnosisId,
        relatedClaim: finding.relatedClaim && {
          id: finding.relatedClaim.id,
          claimNo: finding.relatedClaim.claimNo,
          facilityName: finding.relatedClaim.facility.name,
        },
        similarity: finding.similarity,
        tariffGap: finding.tariffGap?.toNumber() ?? null,
        createdAt: finding.createdAt,
      })),
      decisions: claim.decisions,
    };
  }
}
