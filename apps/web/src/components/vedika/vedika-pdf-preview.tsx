'use client';

import { useQuery } from '@tanstack/react-query';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchVedikaAttachmentFile } from '@/services/vedika.service';

// Pages are drawn with pdf.js instead of the browser's built-in viewer, which
// Chrome and Edge on Windows often replace with an "Open" placeholder.
async function loadPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  return pdfjs.getDocument({ data }).promise;
}

function PdfPage({
  document,
  pageNumber,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    let cancelled = false;
    let renderTask: ReturnType<
      Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']
    > | null = null;

    void document.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = container.clientWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

      renderTask = page.render({
        canvas,
        viewport,
        transform:
          pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      renderTask.promise.catch(() => undefined);
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  return (
    <div className="w-full overflow-hidden rounded-md border border-hairline bg-surface">
      <canvas
        ref={canvasRef}
        aria-label={`Halaman ${pageNumber}`}
        className="block h-auto w-full"
      />
    </div>
  );
}

export function VedikaPdfPreview({
  claimId,
  attachmentId,
  fileName,
}: {
  claimId: string;
  attachmentId: string;
  fileName: string;
}) {
  const fileQuery = useQuery({
    queryKey: ['vedika', claimId, 'attachments', attachmentId, 'file'],
    queryFn: () => fetchVedikaAttachmentFile(claimId, attachmentId),
    staleTime: Infinity,
  });
  const [pdf, setPdf] = useState<{
    attachmentId: string;
    document: PDFDocumentProxy | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!fileQuery.data) return;
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;

    // pdf.js transfers the buffer to its worker, so hand it a copy and keep
    // the cached bytes usable when the user switches back to this file.
    loadPdfDocument(fileQuery.data.slice(0))
      .then((document) => {
        loaded = document;
        if (cancelled) void document.destroy();
        else setPdf({ attachmentId, document, failed: false });
      })
      .catch(() => {
        if (!cancelled) setPdf({ attachmentId, document: null, failed: true });
      });

    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [attachmentId, fileQuery.data]);

  const current = pdf?.attachmentId === attachmentId ? pdf : null;

  if (fileQuery.isError || current?.failed) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-6 text-center">
        <p className="text-small text-ink-secondary">
          Pratinjau {fileName} tidak dapat dimuat.
        </p>
        {fileQuery.isError && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void fileQuery.refetch()}
          >
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (!current?.document) {
    return <Skeleton className="h-[60vh] w-full rounded-lg bg-subtle" />;
  }

  const { document } = current;
  return (
    <div
      role="document"
      aria-label={`Pratinjau ${fileName}`}
      tabIndex={0}
      className="flex h-[60vh] w-full flex-col gap-3 overflow-y-auto rounded-lg border border-hairline bg-canvas p-3"
    >
      {Array.from({ length: document.numPages }, (_, index) => (
        <PdfPage key={index} document={document} pageNumber={index + 1} />
      ))}
    </div>
  );
}
