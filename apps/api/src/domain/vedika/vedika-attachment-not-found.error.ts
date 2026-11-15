import { DomainError } from '../shared/domain-error';

export class VedikaAttachmentNotFoundError extends DomainError {
  readonly code = 'VEDIKA_ATTACHMENT_NOT_FOUND';

  constructor(attachmentId: string) {
    super(`VEDIKA attachment ${attachmentId} was not found`);
  }
}
