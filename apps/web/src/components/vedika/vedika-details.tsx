import type { IconType } from 'react-icons';
import { LuCircleCheck, LuInbox, LuSend } from 'react-icons/lu';
import { Pill } from '@/components/claim-pills';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate, formatDateTime } from '@/lib/format';
import type { VedikaReply, VedikaSyncState } from '@/types/vedika.types';

const BYTES_PER_KB = 1024;

export const FRIENDLY_RETRY_MESSAGE =
  'Silakan coba lagi beberapa saat lagi. Jika masih gagal, hubungi tim IT.';

export function formatFileSize(sizeBytes: number): string {
  const sizeKb = sizeBytes / BYTES_PER_KB;
  return sizeKb < BYTES_PER_KB
    ? `${Math.max(1, Math.round(sizeKb))} KB`
    : `${(sizeKb / BYTES_PER_KB).toFixed(1)} MB`;
}

export const VEDIKA_SYNC_STATE_APPEARANCE: Record<
  VedikaSyncState,
  { label: string; tone: 'neutral' | 'warning' | 'success'; icon: IconType }
> = {
  LATEST: { label: 'Klaim terbaru', tone: 'neutral', icon: LuInbox },
  SENT: { label: 'Klaim terkirim', tone: 'warning', icon: LuSend },
  VERIFIED: {
    label: 'Klaim terverifikasi',
    tone: 'success',
    icon: LuCircleCheck,
  },
};

export function VedikaSyncPill({ syncState }: { syncState: VedikaSyncState }) {
  const { label, tone, icon } = VEDIKA_SYNC_STATE_APPEARANCE[syncState];
  return (
    <Pill tone={tone} icon={icon}>
      {label}
    </Pill>
  );
}

export function VedikaReplyDetails({ reply }: { reply: VedikaReply }) {
  const { sep } = reply;
  const sepRows = [
    { label: 'No. SEP', value: sep.number },
    { label: 'Tgl. SEP', value: formatDate(sep.date) },
    { label: 'No. Kartu', value: sep.participant.cardNumber },
    { label: 'Peserta', value: sep.participant.name },
    { label: 'Jenis peserta', value: sep.participant.membership },
    { label: 'Kelas hak', value: sep.participant.entitledClass },
    { label: 'Jenis rawat', value: sep.service.careType },
    { label: 'Faskes', value: sep.service.facilityName },
    {
      label: 'Diagnosis awal',
      value: sep.initialDiagnosis
        ? `${sep.initialDiagnosis.icd10Code} · ${sep.initialDiagnosis.name}`
        : '-',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Alert role="status" className="border-success/30 bg-success/10">
        <LuCircleCheck aria-hidden="true" className="text-success-ink" />
        <AlertTitle className="text-success-ink">
          Data VEDIKA lengkap
        </AlertTitle>
        <AlertDescription className="text-ink-secondary">
          Diperbarui {formatDateTime(reply.syncedAt)}.
        </AlertDescription>
      </Alert>
      <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
        {reply.checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center gap-2 px-3 py-2 text-small text-ink"
          >
            <LuCircleCheck
              aria-hidden="true"
              className="size-4 shrink-0 text-success-ink"
            />
            {check.label}
          </li>
        ))}
      </ul>
      <dl className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline text-small">
        {sepRows.map((row) => (
          <div key={row.label} className="flex gap-3 px-3 py-2">
            <dt className="w-28 shrink-0 text-ink-secondary">{row.label}</dt>
            <dd className="min-w-0 break-words text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
