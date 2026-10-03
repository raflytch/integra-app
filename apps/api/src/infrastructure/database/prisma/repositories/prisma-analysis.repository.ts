import { Injectable } from '@nestjs/common';
import { AnalysisRepository } from '../../../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  DocumentToExtract,
  EvidenceRule,
  FindingSignal,
  NewFinding,
  SimilarityCandidate,
} from '../../../../domain/analysis/claim-evidence';
import type { ClinicalExtraction } from '../../../../domain/analysis/clinical-extraction';
import type { TestType } from '../../../../domain/claims/claim-detail';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { parseClinicalExtraction } from './clinical-extraction.parser';

const CLAIM_EVIDENCE_FIELDS = {
  id: true,
  claimNo: true,
  patientId: true,
  admittedAt: true,
  dischargedAt: true,
  inacbgCode: true,
  severityLevel: true,
  tariffAmount: true,
  diagnoses: {
    select: { id: true, icd10Code: true, name: true, isPrimary: true },
  },
  documents: {
    orderBy: { recordedAt: 'asc' },
    select: {
      id: true,
      type: true,
      recordedAt: true,
      content: true,
      extracted: true,
    },
  },
} satisfies Prisma.ClaimSelect;

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
    documents: documents.map(({ extracted, ...document }) => ({
      ...document,
      extracted: parseClinicalExtraction(extracted),
    })),
  };
}

@Injectable()
export class PrismaAnalysisRepository extends AnalysisRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findClaimEvidence(claimId: string): Promise<ClaimEvidence | null> {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      select: CLAIM_EVIDENCE_FIELDS,
    });
    return claim && toClaimEvidence(claim);
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

  async findSimilarityCandidates(
    claim: ClaimEvidence,
  ): Promise<SimilarityCandidate[]> {
    const primaryCodes = claim.diagnoses
      .filter((diagnosis) => diagnosis.isPrimary)
      .map((diagnosis) => diagnosis.icd10Code);
    if (primaryCodes.length === 0) return [];
    const candidates = await this.prisma.claim.findMany({
      where: {
        id: { not: claim.claimId },
        patientId: { not: claim.patientId },
        diagnoses: {
          some: { isPrimary: true, icd10Code: { in: primaryCodes } },
        },
      },
      orderBy: { claimNo: 'asc' },
      select: {
        id: true,
        claimNo: true,
        patientId: true,
        documents: {
          orderBy: [{ type: 'asc' }, { recordedAt: 'asc' }],
          select: { id: true, type: true, content: true },
        },
      },
    });
    return candidates.map(({ id, ...candidate }) => ({
      ...candidate,
      claimId: id,
    }));
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
    scores: {
      potentialGap: number;
      priorityScore: number;
      analyzedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.claim.update({ where: { id: claimId }, data: scores });
  }
}
