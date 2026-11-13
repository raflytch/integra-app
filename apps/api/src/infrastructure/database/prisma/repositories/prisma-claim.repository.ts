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
import { assessClaim } from '../../../../domain/claims/claim-verification';
import {
  codingOutlierKey,
  type FacilityCodingRate,
  findCodingOutliers,
  type SimilarPattern,
  type SimilarPatternClaim,
} from '../../../../domain/claims/similar-pattern';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { countFindingsByTestType } from './finding-counts';
import { DECISION_FIELDS, toDecision } from './prisma-decision.repository';

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
  careType: true,
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
  _count: { select: { documents: true, diagnoses: true } },
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
    careType: query.careType,
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

    const codingOutliers = findCodingOutliers(await this.findCodingRates());

    const items = claims.map(({ diagnoses, findings, _count, ...claim }) => ({
      ...claim,
      tariffAmount: claim.tariffAmount.toNumber(),
      potentialGap: claim.potentialGap.toNumber(),
      primaryDiagnosis: diagnoses[0] ?? null,
      findingCounts: countFindingsByTestType(findings),
      documentCount: _count.documents,
      extractedDocumentCount:
        extractedDocumentCountByClaimId.get(claim.id) ?? 0,
      hasSimilarPattern:
        _count.diagnoses > 1 &&
        diagnoses[0] !== undefined &&
        codingOutliers.has(
          codingOutlierKey(claim.facility.id, diagnoses[0].icd10Code),
        ),
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
        procedures: {
          select: { id: true, icd9cmCode: true, name: true },
          orderBy: { icd9cmCode: 'asc' },
        },
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
      careType: claim.careType,
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
      procedures: claim.procedures,
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
      decisions: claim.decisions.map(toDecision),
      verification: assessClaim(claim.findings, claim.analyzedAt),
      similarPattern: await this.findSimilarPattern(
        claim.id,
        claim.facilityId,
        claim.diagnoses,
      ),
    };
  }

  private findCodingRates(): Promise<FacilityCodingRate[]> {
    return this.prisma.$queryRaw<FacilityCodingRate[]>`
      SELECT
        claims.facility_id AS "facilityId",
        primary_diagnosis.icd10_code AS "primaryIcd10Code",
        count(*)::int AS "caseCount",
        count(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM claim_diagnoses secondary_diagnosis
            WHERE secondary_diagnosis.claim_id = claims.id
              AND NOT secondary_diagnosis.is_primary
          )
        )::int AS "secondaryCaseCount"
      FROM claims
      JOIN claim_diagnoses primary_diagnosis
        ON primary_diagnosis.claim_id = claims.id
        AND primary_diagnosis.is_primary
      GROUP BY claims.facility_id, primary_diagnosis.icd10_code
    `;
  }

  private async findSimilarPattern(
    claimId: string,
    facilityId: string,
    diagnoses: { icd10Code: string; isPrimary: boolean }[],
  ): Promise<SimilarPattern | null> {
    const primaryDiagnosis = diagnoses.find((diagnosis) => diagnosis.isPrimary);
    if (!primaryDiagnosis || diagnoses.length < 2) return null;
    const codingOutlier = findCodingOutliers(await this.findCodingRates()).get(
      codingOutlierKey(facilityId, primaryDiagnosis.icd10Code),
    );
    if (!codingOutlier) return null;
    const claims = await this.prisma.$queryRaw<SimilarPatternClaim[]>`
      WITH diagnosis_sets AS (
        SELECT claim_id, string_agg(icd10_code, ',' ORDER BY icd10_code) AS codes
        FROM claim_diagnoses
        GROUP BY claim_id
      ),
      procedure_sets AS (
        SELECT claims.id AS claim_id,
          coalesce(string_agg(claim_procedures.icd9cm_code, ',' ORDER BY claim_procedures.icd9cm_code), '') AS codes
        FROM claims
        LEFT JOIN claim_procedures ON claim_procedures.claim_id = claims.id
        GROUP BY claims.id
      )
      SELECT
        peer.id,
        peer.claim_no AS "claimNo",
        peer.admitted_at AS "admittedAt",
        peer.status::text AS status
      FROM claims peer
      JOIN diagnosis_sets peer_set ON peer_set.claim_id = peer.id
      JOIN diagnosis_sets target_set ON target_set.claim_id = ${claimId}::uuid
      JOIN procedure_sets peer_procedures ON peer_procedures.claim_id = peer.id
      JOIN procedure_sets target_procedures ON target_procedures.claim_id = ${claimId}::uuid
      WHERE peer.id <> ${claimId}::uuid
        AND peer.facility_id = ${facilityId}::uuid
        AND peer_set.codes = target_set.codes
        AND peer_procedures.codes = target_procedures.codes
      ORDER BY peer.admitted_at, peer.claim_no
    `;
    return { ...codingOutlier, claims };
  }
}
