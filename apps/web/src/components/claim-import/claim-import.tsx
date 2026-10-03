'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { LuCircleCheck, LuFileUp, LuSparkles } from 'react-icons/lu';
import { AiAdjustedPill, Pill } from '@/components/claim-pills';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  describeImportError,
  importClaims,
  previewClaimImport,
  readImportNeedsAi,
} from '@/services/import.service';
import type { ClaimImportResult } from '@/types/import.types';
import { ImportFilePicker, MAX_IMPORT_FILE_BYTES } from './import-file-picker';
import { ImportPreviewTable } from './import-preview-table';

interface SelectedFile {
  name: string;
  content: string;
}

function ImportError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert className="border-hairline bg-surface">
      <AlertTitle className="text-ink">{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3 text-ink-secondary">
        {message}
        <Button size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PreviewSkeleton({ isAiRunning }: { isAiRunning: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-6 shadow-xs"
    >
      <p className="text-small text-ink-secondary">
        {isAiRunning
          ? 'AI sedang menyesuaikan file ke format INTEGRA. Ini bisa memakan beberapa menit.'
          : 'Membaca file…'}
      </p>
      <Skeleton className="h-9 w-72 bg-subtle" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-10 bg-subtle" />
      ))}
    </div>
  );
}

function ImportResultCard({
  result,
  onReset,
}: {
  result: ClaimImportResult;
  onReset: () => void;
}) {
  return (
    <section
      aria-labelledby="import-result-heading"
      className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-subtle text-success-ink">
          <LuCircleCheck aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2
            id="import-result-heading"
            className="text-body font-semibold tracking-display text-ink"
          >
            {result.importedCount.toLocaleString('id-ID')} klaim berhasil
            diimpor
          </h2>
          <p className="text-small text-ink-secondary">
            Klaim baru masuk Antrean Klaim dengan status Menunggu keputusan dan
            belum dianalisis AI.
          </p>
        </div>
      </div>
      {result.skipped.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-hairline bg-canvas px-4 py-3">
          <p className="text-small font-medium text-ink">
            {result.skipped.length} klaim tidak diimpor
          </p>
          <ul className="flex flex-col gap-0.5 text-small text-ink-secondary">
            {result.skipped.map((skippedClaim) => (
              <li key={skippedClaim.claimNo}>
                <span className="font-mono">{skippedClaim.claimNo}</span>:{' '}
                {skippedClaim.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/claims">Buka Antrean Klaim</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          Impor file lain
        </Button>
      </div>
    </section>
  );
}

export function ClaimImport() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pendingAiCalls, setPendingAiCalls] = useState<number | null>(null);

  const previewMutation = useMutation({
    mutationFn: (input: SelectedFile & { allowAi: boolean }) =>
      previewClaimImport({
        fileName: input.name,
        content: input.content,
        allowAi: input.allowAi,
      }),
    onError: (error) => {
      const estimatedAiCalls = readImportNeedsAi(error);
      if (estimatedAiCalls !== null) setPendingAiCalls(estimatedAiCalls);
    },
  });

  const importMutation = useMutation({
    mutationFn: importClaims,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims'] }),
        queryClient.invalidateQueries({ queryKey: ['facilities'] }),
      ]),
  });

  const preview = previewMutation.data;
  const validClaims =
    preview?.claims.flatMap((row) =>
      row.status === 'VALID' && row.claim ? [row.claim] : [],
    ) ?? [];
  const needsAi =
    previewMutation.isError &&
    readImportNeedsAi(previewMutation.error) !== null;

  function reset() {
    setSelectedFile(null);
    setFileError(null);
    setPendingAiCalls(null);
    previewMutation.reset();
    importMutation.reset();
  }

  async function handleFileSelected(file: File) {
    reset();
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setFileError('Ukuran file melebihi 2 MB.');
      return;
    }
    const nextFile = { name: file.name, content: await file.text() };
    if (!nextFile.content.trim()) {
      setFileError('File kosong.');
      return;
    }
    setSelectedFile(nextFile);
    previewMutation.mutate({ ...nextFile, allowAi: false });
  }

  function runAiPreview() {
    if (!selectedFile) return;
    setPendingAiCalls(null);
    previewMutation.mutate({ ...selectedFile, allowAi: true });
  }

  if (importMutation.isSuccess) {
    return <ImportResultCard result={importMutation.data} onReset={reset} />;
  }

  const isAiRunning =
    previewMutation.isPending && previewMutation.variables?.allowAi === true;

  return (
    <div className="flex flex-col gap-6">
      <ImportFilePicker
        fileName={selectedFile?.name ?? null}
        error={fileError}
        disabled={previewMutation.isPending || importMutation.isPending}
        onFileSelected={handleFileSelected}
      />

      {previewMutation.isPending && (
        <PreviewSkeleton isAiRunning={isAiRunning} />
      )}

      {previewMutation.isError && !needsAi && selectedFile && (
        <ImportError
          title="File gagal dibaca"
          message={describeImportError(previewMutation.error)}
          onRetry={() =>
            previewMutation.mutate(
              previewMutation.variables ?? {
                ...selectedFile,
                allowAi: false,
              },
            )
          }
        />
      )}

      {needsAi && pendingAiCalls === null && (
        <Alert className="border-hairline bg-surface">
          <AlertTitle className="text-ink">
            File belum sesuai format INTEGRA
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3 text-ink-secondary">
            AI dapat menyesuaikannya ke format baku sebelum Anda memeriksa
            pratinjau.
            <Button
              size="sm"
              onClick={() =>
                setPendingAiCalls(readImportNeedsAi(previewMutation.error))
              }
            >
              <LuSparkles aria-hidden="true" />
              Sesuaikan dengan AI
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {preview && (
        <section
          aria-labelledby="import-preview-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="import-preview-heading"
                  className="text-body font-semibold tracking-display text-ink"
                >
                  2. Pratinjau
                </h2>
                {preview.source === 'AI_NORMALIZED' && <AiAdjustedPill />}
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="success">{preview.summary.valid} valid</Pill>
                <Pill tone="error">{preview.summary.invalid} tidak valid</Pill>
                <Pill tone="warning">{preview.summary.duplicate} duplikat</Pill>
              </div>
            </div>
            <Button
              size="lg"
              disabled={validClaims.length === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate(validClaims)}
            >
              <LuFileUp aria-hidden="true" />
              {importMutation.isPending
                ? 'Mengimpor…'
                : `Impor ${validClaims.length.toLocaleString('id-ID')} klaim valid`}
            </Button>
          </div>
          {importMutation.isError && (
            <ImportError
              title="Impor gagal"
              message={describeImportError(importMutation.error)}
              onRetry={() => importMutation.mutate(validClaims)}
            />
          )}
          {preview.claims.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-surface px-6 py-10 text-center shadow-xs">
              <p className="text-small text-ink-secondary">
                Tidak ada klaim yang ditemukan di file ini.
              </p>
            </div>
          ) : (
            <ImportPreviewTable rows={preview.claims} />
          )}
        </section>
      )}

      <ConfirmDialog
        open={pendingAiCalls !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAiCalls(null);
        }}
        icon={LuSparkles}
        title="Sesuaikan file dengan AI?"
        description={`File belum sesuai format INTEGRA. AI akan menyesuaikannya (sekitar ${pendingAiCalls ?? 0} panggilan AI). Lanjutkan?`}
        confirmLabel="Ya, sesuaikan"
        onConfirm={runAiPreview}
      />
    </div>
  );
}
