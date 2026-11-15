import type { VedikaAttachmentFile } from '../../domain/vedika/vedika-attachment';
import { VedikaAttachmentNotFoundError } from '../../domain/vedika/vedika-attachment-not-found.error';
import type { VedikaRepository } from '../../domain/vedika/vedika.repository';

export class DownloadVedikaAttachmentUseCase {
  constructor(private readonly vedikaRepository: VedikaRepository) {}

  async execute(
    claimId: string,
    attachmentId: string,
  ): Promise<VedikaAttachmentFile> {
    const file = await this.vedikaRepository.findAttachmentFile(
      claimId,
      attachmentId,
    );
    if (!file) throw new VedikaAttachmentNotFoundError(attachmentId);
    return file;
  }
}
