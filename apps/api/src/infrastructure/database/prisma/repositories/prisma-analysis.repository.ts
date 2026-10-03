import { Injectable } from '@nestjs/common';
import { AnalysisRepository } from '../../../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  DocumentToExtract,
  EvidenceRule,
  FindingSignal,
  NewFinding,
} from '../../../../domain/analysis/claim-evidence';
import type { ClinicalExtraction } from '../../../../domain/analysis/clinical-extraction';
import type { TestType } from '../../../../domain/claims/claim-detail';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { parseClinicalExtraction } from './clinical-extraction.parser';

const CLAIM_EVIDENCE_FIELDS = {
  id: true,
  inacbgCode: true,
  severityLevel: true,
  tariffAmount: true,
  diagnoses: {
    select: { id: true, icd10Code: true, name: true, isPrimary: true },
  },
  documents: { select: { id: true, extracted: true } },
} satisfies Prisma.ClaimSelect;

const AWAITING_EXTRACTION = {
  documents: { some: { extracted: { equals: Prisma.DbNull } } },
} satisfies Prisma.ClaimWhereInput;

function toClaimEvidence({
  id,
  tariffAmount,
  documents,
  ...claim
}: Prisma.ClaimGetPayload<{
  select: typeof CLAIM_EVIDENCE_FIELDS;
}>): ClaimEvidence {
  return {
    ...claim,
    claimId: id,
    tariffAmount: tariffAmount.toNumber(),
    documents: documents.map((document) => ({
      id: document.id,
      extracted: parseClinicalExtraction(document.extracted),
    })),
  };
}

@Injectable()
export class PrismaAnalysisRepository extends AnalysisRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findClaimsForAnalysis(): Promise<ClaimEvidence[]> {
    const claims = await this.prisma.claim.findMany({
      select: CLAIM_EVIDENCE_FIELDS,
    });
    return claims.map(toClaimEvidence);
  }

  async findClaimEvidence(claimId: string): Promise<ClaimEvidence | null> {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      select: CLAIM_EVIDENCE_FIELDS,
    });
    return claim && toClaimEvidence(claim);
  }

  async findClaimIdsAwaitingExtraction(limit: number): Promise<string[]> {
    const claims = await this.prisma.claim.findMany({
      where: AWAITING_EXTRACTION,
      orderBy: [{ status: 'asc' }, { admittedAt: 'desc' }],
      take: limit,
      select: { id: true },
    });
    return claims.map((claim) => claim.id);
  }

  countClaimsAwaitingExtraction(): Promise<number> {
    return this.prisma.claim.count({ where: AWAITING_EXTRACTION });
  }

  findDocumentsToExtract(claimId: string): Promise<DocumentToExtract[]> {
    return this.prisma.clinicalDocument.findMany({
      where: { claimId, extracted: { equals: Prisma.DbNull } },
      orderBy: { recordedAt: 'asc' },
      select: { id: true, type: true, content: true },
    });
  }

  async saveExtraction(
    documentId: string,
    extraction: ClinicalExtraction,
  ): Promise<void> {
    await this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: { extracted: extraction as unknown as Prisma.InputJsonObject },
    });
  }

  findEvidenceRules(icd10Codes: string[]): Promise<EvidenceRule[]> {
    return this.prisma.evidenceRule.findMany({
      where: { icd10Code: { in: icd10Codes } },
      select: {
        icd10Code: true,
        evidenceType: true,
        expected: true,
        guidelineRef: true,
      },
    });
  }

  async replaceFindings(
    claimId: string,
    testType: TestType,
    findings: NewFinding[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.finding.deleteMany({ where: { claimId, testType } }),
      this.prisma.finding.createMany({
        data: findings.map((finding) => ({ ...finding, claimId })),
      }),
    ]);
  }

  async findFindingSignals(claimId: string): Promise<FindingSignal[]> {
    const findings = await this.prisma.finding.findMany({
      where: { claimId },
      select: { testType: true, strength: true, tariffGap: true },
    });
    return findings.map((finding) => ({
      ...finding,
      tariffGap: finding.tariffGap?.toNumber() ?? null,
    }));
  }

  async saveClaimScores(
    claimId: string,
    scores: { potentialGap: number; priorityScore: number },
  ): Promise<void> {
    await this.prisma.claim.update({ where: { id: claimId }, data: scores });
  }
}
