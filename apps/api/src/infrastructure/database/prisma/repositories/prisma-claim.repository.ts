import { Injectable } from '@nestjs/common';
import type {
  ClaimDetail,
  FindingCitation,
} from '../../../../domain/claims/claim-detail';
import type {
  ClaimQueueFilter,
  ClaimQueueItem,
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

  async findQueue(filter: ClaimQueueFilter): Promise<ClaimQueueItem[]> {
    const claims = await this.prisma.claim.findMany({
      where: { status: filter.status },
      orderBy: [{ priorityScore: 'desc' }, { potentialGap: 'desc' }],
      select: {
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
      },
    });
    const extractedDocumentCounts = await this.prisma.clinicalDocument.groupBy({
      by: ['claimId'],
      where: {
        claim: { status: filter.status },
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

    return claims.map(({ diagnoses, findings, _count, ...claim }) => ({
      ...claim,
      tariffAmount: claim.tariffAmount.toNumber(),
      potentialGap: claim.potentialGap.toNumber(),
      primaryDiagnosis: diagnoses[0] ?? null,
      findingCounts: countFindingsByTestType(findings),
      documentCount: _count.documents,
      extractedDocumentCount:
        extractedDocumentCountByClaimId.get(claim.id) ?? 0,
    }));
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
