'use client';

import { useId, useRef } from 'react';
import { LuDownload, LuFileUp } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
export const IMPORT_TEMPLATE_PATH = '/templates/integra-claim-import.json';

export function ImportFilePicker({
  fileName,
  error,
  disabled,
  onFileSelected,
}: {
  fileName: string | null;
  error: string | null;
  disabled: boolean;
  onFileSelected: (file: File) => void;
}) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-6 shadow-xs"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={`${inputId}-heading`}
          className="text-body font-semibold tracking-display text-ink"
        >
          1. Pilih file
        </h2>
        <p className="text-small text-ink-secondary">
          File .json, .csv, atau .txt berukuran maksimal 2 MB dan berisi paling
          banyak 200 klaim.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".json,.csv,.txt,application/json,text/csv,text/plain"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelected(file);
            // Clearing the value lets the same file be chosen again after a fix.
            event.target.value = '';
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={disabled}
            aria-describedby={error ? `${helpId} ${errorId}` : helpId}
            onClick={() => inputRef.current?.click()}
          >
            <LuFileUp aria-hidden="true" />
            {fileName ? 'Pilih file lain' : 'Pilih file'}
          </Button>
          <p id={helpId} className="text-small text-ink-secondary">
            {fileName ? (
              <>
                File terpilih:{' '}
                <span className="font-medium text-ink">{fileName}</span>
              </>
            ) : (
              'Belum ada file dipilih.'
            )}
          </p>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-small text-error-ink">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-canvas px-4 py-3">
        <p className="text-small text-ink">
          <span className="font-medium">Format baku INTEGRA</span> (
          <code className="rounded-sm bg-subtle px-1 font-mono text-caption">
            integra-claims/v1
          </code>
          ) langsung dibaca tanpa AI. Setiap klaim memuat nomor klaim, faskes,
          pasien, tanggal masuk dan pulang, INA-CBG, severity, tarif, diagnosis
          (tepat satu utama), dan dokumen klinis.
        </p>
        <p className="text-small text-ink-secondary">
          File dengan bentuk lain disesuaikan oleh AI setelah Anda setujui. AI
          hanya menyusun ulang; isi dokumen harus ada di file asli dan data yang
          tidak ada tidak akan ditebak.
        </p>
        <a
          href={IMPORT_TEMPLATE_PATH}
          download
          className="inline-flex w-fit items-center gap-1.5 text-small font-medium text-primary-hover hover:underline"
        >
          <LuDownload aria-hidden="true" className="size-4" />
          Unduh contoh format
        </a>
      </div>
    </section>
  );
}
