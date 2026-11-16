'use client';

import { useState } from 'react';
import {
  LuCircleCheck,
  LuClock,
  LuExternalLink,
  LuPaperclip,
} from 'react-icons/lu';
import { Pill } from '@/components/claim-pills';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { buildVedikaAttachmentUrl } from '@/services/vedika.service';
import type { VedikaAttachment } from '@/types/vedika.types';
import { formatFileSize } from './vedika-details';
import { VedikaPdfPreview } from './vedika-pdf-preview';

const PDF_MIME_TYPE = 'application/pdf';

export function VedikaAttachmentPreview({
  claimId,
  attachments,
}: {
  claimId: string;
  attachments: VedikaAttachment[];
}) {
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(
    attachments[0].id,
  );
  const selectedAttachment =
    attachments.find((attachment) => attachment.id === selectedAttachmentId) ??
    attachments[0];
  const fileUrl = buildVedikaAttachmentUrl(claimId, selectedAttachment.id);
  const isPdf = selectedAttachment.mimeType === PDF_MIME_TYPE;

  return (
    <div className="flex flex-col gap-3">
      {attachments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <Button
              key={attachment.id}
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={attachment.id === selectedAttachment.id}
              className={cn(
                'max-w-full',
                attachment.id === selectedAttachment.id &&
                  'border-primary bg-primary-wash',
              )}
              onClick={() => setSelectedAttachmentId(attachment.id)}
            >
              <LuPaperclip aria-hidden="true" />
              <span className="truncate">{attachment.fileName}</span>
            </Button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-small font-medium break-all text-ink">
            {selectedAttachment.fileName}
          </span>
          <span className="text-caption text-ink-secondary">
            {formatFileSize(selectedAttachment.sizeBytes)} ·{' '}
            {selectedAttachment.uploadedBy.name} ·{' '}
            {formatDateTime(selectedAttachment.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedAttachment.syncedAt ? (
            <Pill tone="success" icon={LuCircleCheck}>
              Diterima VEDIKA
            </Pill>
          ) : (
            <Pill tone="warning" icon={LuClock}>
              Menunggu refresh
            </Pill>
          )}
          <Button asChild size="sm" variant="outline">
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <LuExternalLink aria-hidden="true" />
              Buka
            </a>
          </Button>
        </div>
      </div>
      {isPdf ? (
        <VedikaPdfPreview
          claimId={claimId}
          attachmentId={selectedAttachment.id}
          fileName={selectedAttachment.fileName}
        />
      ) : (
        <p className="rounded-lg border border-hairline bg-canvas px-3 py-6 text-center text-small text-ink-secondary">
          Pratinjau hanya untuk PDF. Buka file untuk melihat isinya.
        </p>
      )}
    </div>
  );
}
