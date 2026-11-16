import { Injectable } from '@nestjs/common';
import { AnalysisRepository } from '../../../../domain/analysis/analysis.repository';
import { toIcd10Category } from '../../../../domain/analysis/claim-evidence';
import type {
  ClaimEvidence,
  DocumentToExtract,
  EvidenceRule,
  FindingSignal,
  NewFinding,
  SimilarityCandidate,
} from '../../../../domain/analysis/claim-evidence';
import type {
  ClinicalExtraction,
  ExtractionSource,
} from '../../../../domain/analysis/clinical-extraction';
import type {
  EvidenceStatus,
  TestType,
} from '../../../../domain/claims/claim-detail';
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
    source: ExtractionSource,
  ): Promise<void> {
    await this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: {
        extracted: extraction as unknown as Prisma.InputJsonObject,
        extractedModel: source.model,
        extractionPromptVersion: source.promptVersion,
        extractionInputTokens: source.inputTokens,
        extractionOutputTokens: source.outputTokens,
        extractedAt: new Date(),
      },
    });
  }

  findEvidenceRules(icd10Codes: string[]): Promise<EvidenceRule[]> {
    return this.prisma.evidenceRule.findMany({
      where: {
        icd10Code: {
          in: [...icd10Codes, ...icd10Codes.map(toIcd10Category)],
        },
      },
      select: {
        icd10Code: true,
        disease: true,
        primaryIcd10Prefixes: true,
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

  async findSimilarityGroups(): Promise<SimilarityCandidate[][]> {
    const claims = await this.prisma.claim.findMany({
      orderBy: { claimNo: 'asc' },
      select: {
        id: true,
        claimNo: true,
        patientId: true,
        diagnoses: { where: { isPrimary: true }, select: { icd10Code: true } },
        documents: {
          orderBy: [{ type: 'asc' }, { recordedAt: 'asc' }],
          select: { id: true, type: true, content: true },
        },
      },
    });
    const groups = new Map<string, SimilarityCandidate[]>();
    for (const { id, diagnoses, ...claim } of claims) {
      const primaryCode = diagnoses[0]?.icd10Code;
      if (!primaryCode) continue;
      groups.set(primaryCode, [
        ...(groups.get(primaryCode) ?? []),
        { ...claim, claimId: id },
      ]);
    }
    return [...groups.values()];
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

  async saveDiagnosisEvidenceStatuses(
    claimId: string,
    statuses: { diagnosisId: string; status: EvidenceStatus }[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.claimDiagnosis.updateMany({
        where: { claimId },
        data: { evidenceStatus: null },
      }),
      ...statuses.map(({ diagnosisId, status }) =>
        this.prisma.claimDiagnosis.update({
          where: { id: diagnosisId },
          data: { evidenceStatus: status },
        }),
      ),
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
      requiredEvidenceCount: number;
      foundEvidenceCount: number;
      comparedClaimCount: number;
      maxSimilarity: number;
      similarityMean: number | null;
      similarityThreshold: number | null;
    },
  ): Promise<void> {
    await this.prisma.claim.update({ where: { id: claimId }, data: scores });
  }
}
