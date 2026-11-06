'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { LuCalendarDays, LuHospital, LuUser } from 'react-icons/lu';
import {
  ClaimStatusPill,
  FacilityTypePill,
  NeedsClarificationPill,
  PriorityPill,
  SeverityPill,
} from '@/components/claim-pills';
import { PatientDataToggle } from '@/components/patient-data-toggle';
import { usePatientDataVisibility } from '@/hooks/use-patient-data-visibility';
import { GENDER_LABELS } from '@/lib/claim-labels';
import {
  calculateAgeInYears,
  countDaysBetween,
  formatDate,
  formatRupiah,
} from '@/lib/format';
import { maskIdentifier, maskPersonName } from '@/lib/pii';
import type { ClaimDetail } from '@/types/claim.types';

function SummaryItem({
  icon: Icon,
  label,
  value,
  detail,
  action,
}: {
  icon: IconType;
  label: string;
  value: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-caption text-ink-secondary">
        <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        {label}
      </dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
      <dd className="truncate text-caption text-ink-secondary">{detail}</dd>
      {action && <dd className="-ml-2 pt-1">{action}</dd>}
    </div>
  );
}

export function ClaimSummary({ claim }: { claim: ClaimDetail }) {
  const { isPatientDataVisible } = usePatientDataVisibility();
  const primaryDiagnosis = claim.diagnoses.find(
    (diagnosis) => diagnosis.isPrimary,
  );
  const needsClarification = claim.findings.length > 0;
  const unsupportedDiagnosisCount = claim.findings.filter(
    (finding) => finding.testType === 'EXISTENCE',
  ).length;
  const lengthOfStayDays = countDaysBetween(
    claim.admittedAt,
    claim.dischargedAt,
  );
  const patientAge = calculateAgeInYears(
    claim.patient.birthDate,
    claim.admittedAt,
  );

  return (
    <section
      aria-label="Ringkasan klaim"
      className="flex flex-col gap-6 rounded-xl border border-hairline bg-surface shadow-xs p-6 lg:flex-row lg:items-start lg:justify-between"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-caption text-ink-secondary">
            {claim.claimNo}
          </span>
          <ClaimStatusPill status={claim.status} />
          {needsClarification && <NeedsClarificationPill />}
          <PriorityPill priorityScore={claim.priorityScore} />
          <FacilityTypePill facilityType={claim.facility.type} />
        </div>
        <h1 className="font-display text-section font-semibold tracking-display text-ink">
          {primaryDiagnosis?.name ?? claim.inacbgCode}
        </h1>
        <dl className="grid divide-y divide-hairline rounded-xl border border-hairline bg-surface text-small sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryItem
            icon={LuHospital}
            label="Faskes"
            value={claim.facility.name}
            detail={`${claim.facility.code} · ${claim.facility.city}`}
          />
          <SummaryItem
            icon={LuUser}
            label="Pasien"
            value={
              isPatientDataVisible
                ? claim.patient.name
                : maskPersonName(claim.patient.name)
            }
            detail={`${
              isPatientDataVisible
                ? claim.patient.medicalRecordNo
                : maskIdentifier(claim.patient.medicalRecordNo)
            } · ${GENDER_LABELS[claim.patient.gender]} · ${patientAge} tahun`}
            action={<PatientDataToggle />}
          />
          <SummaryItem
            icon={LuCalendarDays}
            label="Rawat inap"
            value={`${formatDate(claim.admittedAt)} – ${formatDate(claim.dischargedAt)}`}
            detail={`${lengthOfStayDays} hari`}
          />
        </dl>
      </div>
      <div className="flex shrink-0 flex-col gap-4 rounded-lg border border-hairline bg-canvas p-4 lg:w-72">
        <div className="flex flex-col gap-1">
          <p className="text-caption text-ink-secondary">
            Potensi selisih tarif
          </p>
          <p className="font-display text-subhead font-semibold tracking-display text-ink tabular-nums">
            {formatRupiah(claim.potentialGap)}
          </p>
          <p className="text-caption text-ink-secondary">
            {unsupportedDiagnosisCount > 0
              ? `Dari ${unsupportedDiagnosisCount} diagnosis tanpa bukti. Tarif setelah koreksi ${formatRupiah(claim.tariffAmount - claim.potentialGap)}.`
              : 'Belum ada diagnosis tanpa bukti.'}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-small">
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-secondary">Tarif klaim</dt>
            <dd className="font-medium text-ink">
              {formatRupiah(claim.tariffAmount)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-secondary">INA-CBG</dt>
            <dd className="font-mono text-caption font-medium text-ink">
              {claim.inacbgCode}
            </dd>
            <dd>
              <SeverityPill severityLevel={claim.severityLevel} />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
