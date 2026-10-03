import type { ClaimDetail } from '../../domain/claims/claim-detail';
import { toDateOnly } from './date-only';
import { presentDecision } from './decision.presenter';

export function presentClaimDetail(claimDetail: ClaimDetail) {
  return {
    ...claimDetail,
    admittedAt: toDateOnly(claimDetail.admittedAt),
    dischargedAt: toDateOnly(claimDetail.dischargedAt),
    analyzedAt: claimDetail.analyzedAt?.toISOString() ?? null,
    patient: {
      ...claimDetail.patient,
      birthDate: toDateOnly(claimDetail.patient.birthDate),
    },
    documents: claimDetail.documents.map((document) => ({
      ...document,
      recordedAt: document.recordedAt.toISOString(),
    })),
    findings: claimDetail.findings.map((finding) => ({
      ...finding,
      createdAt: finding.createdAt.toISOString(),
    })),
    decisions: claimDetail.decisions.map(presentDecision),
  };
}

export type ClaimDetailResponse = ReturnType<typeof presentClaimDetail>;
