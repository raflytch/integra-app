import type { ClaimDetail } from '../../domain/claims/claim-detail';
import { lengthOfStayDays } from '../../domain/claims/length-of-stay';
import { toDateOnly } from './date-only';
import { presentDecision } from './decision.presenter';

export function presentClaimDetail(claimDetail: ClaimDetail) {
  return {
    ...claimDetail,
    admittedAt: toDateOnly(claimDetail.admittedAt),
    dischargedAt: toDateOnly(claimDetail.dischargedAt),
    lengthOfStayDays: lengthOfStayDays(
      claimDetail.careType,
      claimDetail.admittedAt,
      claimDetail.dischargedAt,
    ),
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
    similarPattern: claimDetail.similarPattern && {
      ...claimDetail.similarPattern,
      claims: claimDetail.similarPattern.claims.map((similarClaim) => ({
        ...similarClaim,
        admittedAt: toDateOnly(similarClaim.admittedAt),
      })),
    },
  };
}

export type ClaimDetailResponse = ReturnType<typeof presentClaimDetail>;
