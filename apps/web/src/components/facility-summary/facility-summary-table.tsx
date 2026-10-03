import { FacilityTypePill, Pill } from '@/components/claim-pills';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TEST_TYPE_DETAILS, TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { formatRupiah } from '@/lib/format';
import type { FacilitySummary } from '@/types/facility.types';

function CountPill({ count }: { count: number }) {
  return (
    <Pill tone={count > 0 ? 'warning' : 'neutral'} className="tabular-nums">
      {count}
    </Pill>
  );
}

export function FacilitySummaryTable({
  facilitySummaries,
}: {
  facilitySummaries: FacilitySummary[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Faskes</TableHead>
            <TableHead className="text-right">Klaim</TableHead>
            <TableHead className="text-right">Perlu klarifikasi</TableHead>
            {TEST_TYPE_ORDER.map((testType) => (
              <TableHead key={testType} className="text-right">
                {TEST_TYPE_DETAILS[testType].title}
              </TableHead>
            ))}
            <TableHead className="text-right">Potensi selisih</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facilitySummaries.map((summary) => (
            <TableRow key={summary.facility.id}>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium text-ink">
                    {summary.facility.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <FacilityTypePill facilityType={summary.facility.type} />
                    <span className="font-mono text-caption text-ink-secondary">
                      {summary.facility.code} · {summary.facility.city}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right text-ink tabular-nums">
                {summary.claimCount}
              </TableCell>
              <TableCell className="text-right">
                <CountPill count={summary.flaggedClaimCount} />
              </TableCell>
              {TEST_TYPE_ORDER.map((testType) => (
                <TableCell key={testType} className="text-right">
                  <CountPill count={summary.findingCounts[testType]} />
                </TableCell>
              ))}
              <TableCell className="text-right font-medium text-ink tabular-nums">
                {formatRupiah(summary.totalPotentialGap)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
