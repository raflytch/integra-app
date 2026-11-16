'use client';

import { useMutation } from '@tanstack/react-query';
import { LuScanLine } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { scanVedikaSep } from '@/services/vedika.service';
import type { VedikaReply } from '@/types/vedika.types';
import {
  FRIENDLY_RETRY_MESSAGE,
  SepFieldList,
  VedikaReplyDetails,
} from './vedika-details';

const MIN_SCAN_MS = 1500;
const PLACEHOLDER_LINE_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-2/5'];

function ScanningPreview() {
  return (
    <div
      role="status"
      aria-label="Memindai PDF SEP"
      className="relative overflow-hidden rounded-lg border border-hairline bg-canvas px-4 py-3"
    >
      <div className="flex flex-col gap-2">
        {PLACEHOLDER_LINE_WIDTHS.map((width, index) => (
          <span key={index} className={`h-2 rounded-full bg-subtle ${width}`} />
        ))}
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_8px_2px] shadow-primary/40 motion-safe:animate-sep-scan"
      />
    </div>
  );
}

export function VedikaSepSection({
  claimId,
  reply,
  canScan,
}: {
  claimId: string;
  reply: VedikaReply;
  canScan: boolean;
}) {
  const scanMutation = useMutation({
    mutationFn: async () => {
      const [scannedSep] = await Promise.all([
        scanVedikaSep(claimId),
        new Promise((resolve) => setTimeout(resolve, MIN_SCAN_MS)),
      ]);
      return scannedSep;
    },
  });
  const scannedSep = scanMutation.data;

  function renderSepFields() {
    if (!canScan) return undefined;
    if (scanMutation.isPending) return <ScanningPreview />;
    if (scanMutation.isError) {
      return (
        <p role="alert" className="text-small text-error-ink">
          PDF SEP gagal dipindai. {FRIENDLY_RETRY_MESSAGE}
        </p>
      );
    }
    if (!scannedSep) {
      return (
        <p className="rounded-lg border border-dashed border-hairline px-3 py-4 text-small text-ink-secondary">
          Klik Pindai PDF untuk membaca rincian SEP dari berkas klaim.
        </p>
      );
    }
    if (scannedSep.fields.length === 0) {
      return (
        <p className="text-small text-ink-secondary">
          Halaman SEP tidak ditemukan di PDF klaim ini.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <p className="text-caption text-ink-secondary">
          Terbaca {scannedSep.fields.length} isian dari {scannedSep.fileName}.
        </p>
        <SepFieldList fields={scannedSep.fields} />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-small font-semibold text-ink">Rincian SEP</h3>
        {canScan && (
          <Button
            variant="outline"
            size="sm"
            disabled={scanMutation.isPending}
            onClick={() => scanMutation.mutate()}
          >
            <LuScanLine aria-hidden="true" />
            {scanMutation.isPending
              ? 'Memindai…'
              : scannedSep
                ? 'Pindai ulang'
                : 'Pindai PDF'}
          </Button>
        )}
      </div>
      <VedikaReplyDetails reply={reply} sepFields={renderSepFields()} />
    </section>
  );
}
