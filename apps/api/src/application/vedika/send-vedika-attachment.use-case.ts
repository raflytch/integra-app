import { ClaimNotFoundError } from '../../domain/claims/claim-not-found.error';
import type { ClaimRepository } from '../../domain/claims/claim.repository';
import {
  MAX_VEDIKA_ATTACHMENT_BYTES,
  type NewVedikaAttachment,
  type VedikaAttachment,
} from '../../domain/vedika/vedika-attachment';
import { VedikaAttachmentTooLargeError } from '../../domain/vedika/vedika-attachment-too-large.error';
import type { VedikaRepository } from '../../domain/vedika/vedika.repository';

export class SendVedikaAttachmentUseCase {
  constructor(
    private readonly claimRepository: ClaimRepository,
    private readonly vedikaRepository: VedikaRepository,
  ) {}

  async execute(newAttachment: NewVedikaAttachment): Promise<VedikaAttachment> {
    const sizeBytes = newAttachment.content.byteLength;
    if (sizeBytes > MAX_VEDIKA_ATTACHMENT_BYTES)
      throw new VedikaAttachmentTooLargeError(sizeBytes);

    const claimExists = await this.claimRepository.exists(
      newAttachment.claimId,
    );
    if (!claimExists) throw new ClaimNotFoundError(newAttachment.claimId);

    return this.vedikaRepository.addAttachment({
      ...newAttachment,
      fileName: newAttachment.fileName.trim(),
    });
  }
}
