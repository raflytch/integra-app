'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_TOOLTIP_CLASS_NAME,
  ChartLegendList,
  ChartPanel,
  DashboardSkeleton,
  StatTile,
} from '@/components/dashboard-panels';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CLAIM_STATUS_LABELS } from '@/lib/claim-labels';
import { formatMonth, formatPercent, formatRupiah } from '@/lib/format';
import { fetchClaimQueue } from '@/services/claim.service';
import type { ClaimQueueItem, ClaimStatus } from '@/types/claim.types';

const STATUS_ORDER: ClaimStatus[] = [
  'PENDING',
  'CLARIFICATION_REQUESTED',
  'ESCALATED',
  'APPROVED',
];

const STATUS_COLORS: Record<ClaimStatus, string> = {
  PENDING: 'var(--color-chart-neutral)',
  CLARIFICATION_REQUESTED: 'var(--color-warning)',
  ESCALATED: 'var(--color-error)',
  APPROVED: 'var(--color-success)',
};

const MONTHLY_CHART_CONFIG = {
  clean: { label: 'Tanpa tanda', color: 'var(--color-chart-neutral)' },
  flagged: { label: 'Perlu klarifikasi', color: 'var(--color-warning)' },
} satisfies ChartConfig;

const STATUS_CHART_CONFIG = Object.fromEntries(
  STATUS_ORDER.map((status) => [
    status,
    { label: CLAIM_STATUS_LABELS[status], color: STATUS_COLORS[status] },
  ]),
) satisfies ChartConfig;

function isFlagged(claim: ClaimQueueItem): boolean {
  return Object.values(claim.findingCounts).some((count) => count > 0);
}

function summarizeByAdmissionMonth(claims: ClaimQueueItem[]) {
  const monthlyCounts = new Map<string, { clean: number; flagged: number }>();
  for (const claim of claims) {
    const monthKey = claim.admittedAt.slice(0, 7);
    const counts = monthlyCounts.get(monthKey) ?? { clean: 0, flagged: 0 };
    if (isFlagged(claim)) counts.flagged += 1;
    else counts.clean += 1;
    monthlyCounts.set(monthKey, counts);
  }
  return [...monthlyCounts]
    .sort(([firstMonth], [secondMonth]) =>
      firstMonth.localeCompare(secondMonth),
    )
    .map(([monthKey, counts]) => ({
      month: formatMonth(`${monthKey}-01`),
      ...counts,
    }));
}

export function ClaimQueueOverview() {
  const allClaimsQuery = useQuery({
    queryKey: ['claims', 'queue', 'ALL'],
    queryFn: () => fetchClaimQueue(),
  });

  if (allClaimsQuery.isPending) return <DashboardSkeleton tileCount={4} />;
  if (allClaimsQuery.isError || allClaimsQuery.data.length === 0) return null;

  const claims = allClaimsQuery.data;
  const flaggedClaimCount = claims.filter(isFlagged).length;
  const pendingClaimCount = claims.filter(
    (claim) => claim.status === 'PENDING',
  ).length;
  const totalPotentialGap = claims.reduce(
    (gapTotal, claim) => gapTotal + claim.potentialGap,
    0,
  );
  const monthlyData = summarizeByAdmissionMonth(claims);
  const statusData = STATUS_ORDER.map((status) => ({
    status,
    count: claims.filter((claim) => claim.status === status).length,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total klaim"
          value={claims.length.toLocaleString('id-ID')}
          hint="Seluruh klaim rawat inap"
        />
        <StatTile
          label="Menunggu keputusan"
          value={pendingClaimCount.toLocaleString('id-ID')}
          hint={`${formatPercent(pendingClaimCount / claims.length)} dari antrean`}
        />
        <StatTile
          label="Perlu klarifikasi"
          value={flaggedClaimCount.toLocaleString('id-ID')}
          hint={`${formatPercent(flaggedClaimCount / claims.length)} klaim memiliki tanda`}
        />
        <StatTile
          label="Potensi selisih"
          value={formatRupiah(totalPotentialGap)}
          hint="Jika diagnosis tanpa bukti dikeluarkan"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel
          title="Klaim per bulan rawat inap"
          description="Jumlah klaim menurut bulan masuk, dipisah antara yang bertanda dan tidak."
          className="lg:col-span-2"
        >
          <ChartContainer
            config={MONTHLY_CHART_CONFIG}
            className="aspect-auto h-64 w-full"
          >
            <BarChart data={monthlyData} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                cursor={{ fill: 'var(--color-subtle)' }}
                content={
                  <ChartTooltipContent className={CHART_TOOLTIP_CLASS_NAME} />
                }
              />
              <Bar dataKey="clean" stackId="claims" fill="var(--color-clean)" />
              <Bar
                dataKey="flagged"
                stackId="claims"
                fill="var(--color-flagged)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
          <ChartLegendList
            items={[
              {
                label: MONTHLY_CHART_CONFIG.clean.label,
                color: MONTHLY_CHART_CONFIG.clean.color,
              },
              {
                label: MONTHLY_CHART_CONFIG.flagged.label,
                color: MONTHLY_CHART_CONFIG.flagged.color,
              },
            ]}
          />
        </ChartPanel>

        <ChartPanel
          title="Status keputusan"
          description="Sebaran keputusan verifikator atas seluruh klaim."
        >
          <ChartContainer
            config={STATUS_CHART_CONFIG}
            className="aspect-square h-52 w-full"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="status"
                    hideLabel
                    className={CHART_TOOLTIP_CLASS_NAME}
                  />
                }
              />
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="status"
                innerRadius="58%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="var(--color-surface)"
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ChartLegendList
            items={statusData.map((entry) => ({
              label: CLAIM_STATUS_LABELS[entry.status],
              color: STATUS_COLORS[entry.status],
              value: entry.count.toLocaleString('id-ID'),
            }))}
          />
        </ChartPanel>
      </div>
    </div>
  );
}
