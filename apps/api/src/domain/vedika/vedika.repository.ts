import type {
  NewVedikaAttachment,
  VedikaAttachment,
  VedikaAttachmentFile,
} from './vedika-attachment';
import type { VedikaClaimPage, VedikaClaimQuery } from './vedika-claim-summary';
import type { VedikaReply } from './vedika-reply';

export abstract class VedikaRepository {
  abstract findClaimPage(query: VedikaClaimQuery): Promise<VedikaClaimPage>;
  abstract findClaimSyncedAt(claimId: string): Promise<Date | null>;
  abstract findClaimResponse(claimId: string): Promise<VedikaReply | null>;
  abstract addAttachment(
    newAttachment: NewVedikaAttachment,
  ): Promise<VedikaAttachment>;
  abstract listAttachments(claimId: string): Promise<VedikaAttachment[]>;
  abstract findAttachmentFile(
    claimId: string,
    attachmentId: string,
  ): Promise<VedikaAttachmentFile | null>;
  abstract syncAllClaims(
    syncedAt: Date,
  ): Promise<{ refreshedClaimCount: number; verifiedClaimCount: number }>;
}
