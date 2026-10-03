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

const HEAD_CLASS_NAME = 'text-xs text-quiet-gray';

export function FacilitySummaryTable({
  facilitySummaries,
}: {
  facilitySummaries: FacilitySummary[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-linen-border bg-eggshell-canvas">
      <Table>
        <TableHeader>
          <TableRow className="border-linen-border hover:bg-transparent">
            <TableHead className={`pl-4 ${HEAD_CLASS_NAME}`}>Faskes</TableHead>
            <TableHead className={`text-right ${HEAD_CLASS_NAME}`}>
              Klaim
            </TableHead>
            <TableHead className={`text-right ${HEAD_CLASS_NAME}`}>
              Perlu klarifikasi
            </TableHead>
            {TEST_TYPE_ORDER.map((testType) => (
              <TableHead
                key={testType}
                className={`text-right ${HEAD_CLASS_NAME}`}
              >
                {TEST_TYPE_DETAILS[testType].title}
              </TableHead>
            ))}
            <TableHead className={`pr-4 text-right ${HEAD_CLASS_NAME}`}>
              Potensi selisih
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facilitySummaries.map((summary) => (
            <TableRow
              key={summary.facility.id}
              className="border-linen-border hover:bg-cloud-surface"
            >
              <TableCell className="pl-4">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium text-graphite">
                    {summary.facility.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <FacilityTypePill facilityType={summary.facility.type} />
                    <span className="text-xs text-quiet-gray">
                      {summary.facility.code} · {summary.facility.city}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right text-sm text-graphite">
                {summary.claimCount}
              </TableCell>
              <TableCell className="text-right">
                <Pill tone={summary.flaggedClaimCount > 0 ? 'brand' : 'muted'}>
                  {summary.flaggedClaimCount}
                </Pill>
              </TableCell>
              {TEST_TYPE_ORDER.map((testType) => (
                <TableCell key={testType} className="text-right">
                  <Pill
                    tone={
                      summary.findingCounts[testType] > 0 ? 'brand' : 'muted'
                    }
                  >
                    {summary.findingCounts[testType]}
                  </Pill>
                </TableCell>
              ))}
              <TableCell className="pr-4 text-right text-sm font-semibold text-integra-deep">
                {formatRupiah(summary.totalPotentialGap)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
