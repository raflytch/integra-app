import { DomainError } from '../shared/domain-error';
import { MAX_VEDIKA_ATTACHMENT_BYTES } from './vedika-attachment';

export class VedikaAttachmentTooLargeError extends DomainError {
  readonly code = 'VEDIKA_ATTACHMENT_TOO_LARGE';
  readonly details = { maxSizeBytes: MAX_VEDIKA_ATTACHMENT_BYTES };

  constructor(sizeBytes: number) {
    super(
      `A VEDIKA attachment of ${sizeBytes} bytes exceeds ${MAX_VEDIKA_ATTACHMENT_BYTES} bytes`,
    );
  }
}
