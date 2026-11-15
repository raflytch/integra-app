import type { VedikaAttachment } from '../../domain/vedika/vedika-attachment';
import type {
  VedikaBulkRefreshResult,
  VedikaClaimPage,
} from '../../domain/vedika/vedika-claim-summary';
import type { VedikaStatus } from '../../domain/vedika/vedika-reply';
import { toDateOnly } from './date-only';

export function presentVedikaAttachment(attachment: VedikaAttachment) {
  return {
    ...attachment,
    createdAt: attachment.createdAt.toISOString(),
    syncedAt: attachment.syncedAt?.toISOString() ?? null,
  };
}

export function presentVedikaStatus({ attachments, reply }: VedikaStatus) {
  return {
    attachments: attachments.map(presentVedikaAttachment),
    reply: reply && {
      ...reply,
      syncedAt: reply.syncedAt.toISOString(),
      sep: {
        ...reply.sep,
        date: toDateOnly(reply.sep.date),
        participant: {
          ...reply.sep.participant,
          birthDate: toDateOnly(reply.sep.participant.birthDate),
        },
      },
    },
  };
}

export function presentVedikaClaimPage(claimPage: VedikaClaimPage) {
  return {
    ...claimPage,
    items: claimPage.items.map((item) => ({
      ...item,
      admittedAt: toDateOnly(item.admittedAt),
      syncedAt: item.syncedAt?.toISOString() ?? null,
    })),
  };
}

export function presentVedikaBulkRefresh(result: VedikaBulkRefreshResult) {
  return { ...result, syncedAt: result.syncedAt.toISOString() };
}

export type VedikaBulkRefreshResponse = ReturnType<
  typeof presentVedikaBulkRefresh
>;

export type VedikaClaimPageResponse = ReturnType<typeof presentVedikaClaimPage>;
export type VedikaAttachmentResponse = ReturnType<
  typeof presentVedikaAttachment
>;
export type VedikaStatusResponse = ReturnType<typeof presentVedikaStatus>;
