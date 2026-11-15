'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchVedikaStatus } from '@/services/vedika.service';
import { VedikaAttachmentPreview } from './vedika-attachment-preview';
import { FRIENDLY_RETRY_MESSAGE, VedikaReplyDetails } from './vedika-details';

export const CLAIM_DETAILS_PAGE_PATH = '/claim-details';

function VedikaStatusBody({ claimId }: { claimId: string }) {
  const statusQuery = useQuery({
    queryKey: ['claims', claimId, 'vedika'],
    queryFn: () => fetchVedikaStatus(claimId),
  });

  if (statusQuery.isPending) {
    return <Skeleton className="h-24 rounded-lg bg-subtle" />;
  }
  if (statusQuery.isError) {
    return (
      <p role="alert" className="text-small text-error-ink">
        Data VEDIKA gagal dimuat. {FRIENDLY_RETRY_MESSAGE}
      </p>
    );
  }

  const { attachments, reply } = statusQuery.data;
  const hasWaitingAttachment = attachments.some(
    (attachment) => !attachment.syncedAt,
  );
  const needsRefresh = !reply || hasWaitingAttachment;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-small font-semibold text-ink">Dokumen</h3>
        {attachments.length > 0 ? (
          <VedikaAttachmentPreview
            claimId={claimId}
            attachments={attachments}
          />
        ) : (
          <p className="text-small text-ink-secondary">
            Belum ada dokumen klarifikasi untuk klaim ini.
          </p>
        )}
      </section>
      {needsRefresh && (
        <p className="text-small text-ink-secondary">
          Data terbaru belum ditarik. Tarik dari halaman{' '}
          <Link
            href={CLAIM_DETAILS_PAGE_PATH}
            className="font-medium text-primary-hover hover:underline"
          >
            Rincian Klaim
          </Link>
          .
        </p>
      )}
      {reply && (
        <section className="flex flex-col gap-2">
          <h3 className="text-small font-semibold text-ink">Rincian SEP</h3>
          <VedikaReplyDetails reply={reply} />
        </section>
      )}
    </div>
  );
}

export function VedikaStatusDialog({
  claimId,
  claimNo,
  trigger,
}: {
  claimId: string;
  claimNo: string;
  trigger: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-32px)] overflow-y-auto rounded-xl border-hairline bg-surface sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-body font-semibold tracking-display text-ink">
            Data VEDIKA · {claimNo}
          </DialogTitle>
          <DialogDescription className="text-caption text-ink-secondary">
            Simulasi: file disimpan di INTEGRA, balasan VEDIKA berupa data
            statis.
          </DialogDescription>
        </DialogHeader>
        {isOpen && <VedikaStatusBody claimId={claimId} />}
      </DialogContent>
    </Dialog>
  );
}
