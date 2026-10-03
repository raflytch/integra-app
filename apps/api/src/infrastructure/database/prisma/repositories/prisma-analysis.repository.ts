import { Injectable } from '@nestjs/common';
import { AnalysisRepository } from '../../../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  EvidenceRule,
  FindingSignal,
  NewFinding,
} from '../../../../domain/analysis/claim-evidence';
import type { TestType } from '../../../../domain/claims/claim-detail';
import { PrismaService } from '../prisma.service';
import { parseClinicalExtraction } from './clinical-extraction.parser';

@Injectable()
export class PrismaAnalysisRepository extends AnalysisRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findClaimsForAnalysis(): Promise<ClaimEvidence[]> {
    const claims = await this.prisma.claim.findMany({
      select: {
        id: true,
        inacbgCode: true,
        severityLevel: true,
        tariffAmount: true,
        diagnoses: {
          select: { id: true, icd10Code: true, name: true, isPrimary: true },
        },
        documents: { select: { id: true, extracted: true } },
      },
    });
    return claims.map(({ id, tariffAmount, documents, ...claim }) => ({
      ...claim,
      claimId: id,
      tariffAmount: tariffAmount.toNumber(),
      documents: documents.map((document) => ({
        id: document.id,
        extracted: parseClinicalExtraction(document.extracted),
      })),
    }));
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
