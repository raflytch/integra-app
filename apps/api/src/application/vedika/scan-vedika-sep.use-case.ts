import {
  readSepFields,
  type ScannedSepField,
} from '../../domain/vedika/sep-pdf-reader';
import type { VedikaRepository } from '../../domain/vedika/vedika.repository';

const PDF_MIME_TYPE = 'application/pdf';

export interface ScannedSep {
  fileName: string | null;
  fields: ScannedSepField[];
}

export class ScanVedikaSepUseCase {
  constructor(private readonly vedikaRepository: VedikaRepository) {}

  async execute(claimId: string): Promise<ScannedSep> {
    const attachments = await this.vedikaRepository.listAttachments(claimId);
    for (const attachment of attachments) {
      if (attachment.mimeType !== PDF_MIME_TYPE) continue;
      const file = await this.vedikaRepository.findAttachmentFile(
        claimId,
        attachment.id,
      );
      const fields = file ? readSepFields(file.content) : [];
      if (fields.length > 0) return { fileName: attachment.fileName, fields };
    }
    return { fileName: null, fields: [] };
  }
}
