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
  StatTileGrid,
} from '@/components/dashboard-panels';
import { LoadError } from '@/components/load-error';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CLAIM_STATUS_LABELS } from '@/lib/claim-labels';
import { formatMonth, formatPercent, formatRupiah } from '@/lib/format';
import { fetchClaimStatistics } from '@/services/claim.service';
import type { ClaimStatus } from '@/types/claim.types';

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
  notAnalyzed: {
    label: 'Belum dianalisis AI',
    color: 'var(--color-chart-neutral)',
  },
  clean: { label: 'Tidak ada tanda', color: 'var(--color-success)' },
  flagged: { label: 'Perlu klarifikasi', color: 'var(--color-warning)' },
} satisfies ChartConfig;

type MonthlySeries = keyof typeof MONTHLY_CHART_CONFIG;
const MONTHLY_SERIES = Object.keys(MONTHLY_CHART_CONFIG) as MonthlySeries[];

const STATUS_CHART_CONFIG = Object.fromEntries(
  STATUS_ORDER.map((status) => [
    status,
    { label: CLAIM_STATUS_LABELS[status], color: STATUS_COLORS[status] },
  ]),
) satisfies ChartConfig;

/** Aggregates from the API, so this page never downloads the whole queue. */
export function ClaimOverview() {
  const statisticsQuery = useQuery({
    queryKey: ['claims', 'statistics'],
    queryFn: fetchClaimStatistics,
  });

  if (statisticsQuery.isPending) return <DashboardSkeleton tileCount={4} />;
  if (statisticsQuery.isError) {
    return (
      <LoadError
        title="Ringkasan klaim gagal dimuat"
        onRetry={() => statisticsQuery.refetch()}
      />
    );
  }
  if (statisticsQuery.data.totalCount === 0) {
    return (
      <p className="text-small text-ink-secondary">
        Belum ada klaim. Grafik muncul setelah data klaim dimuat.
      </p>
    );
  }

  const {
    totalCount,
    analyzedCount: analyzedClaimCount,
    flaggedCount: flaggedClaimCount,
    totalPotentialGap,
    statusCounts,
    monthlyCounts,
  } = statisticsQuery.data;
  const pendingClaimCount = statusCounts.PENDING;
  const monthlyData = monthlyCounts.map(({ month, ...counts }) => ({
    month: formatMonth(`${month}-01`),
    ...counts,
  }));
  const statusData = STATUS_ORDER.map((status) => ({
    status,
    count: statusCounts[status],
  }));

  return (
    <div className="flex flex-col gap-4">
      <StatTileGrid>
        <StatTile
          label="Menunggu keputusan"
          value={pendingClaimCount.toLocaleString('id-ID')}
          hint={`dari ${totalCount.toLocaleString('id-ID')} klaim rawat inap`}
        />
        <StatTile
          label="Dianalisis AI"
          value={formatPercent(analyzedClaimCount / totalCount)}
          hint={`${analyzedClaimCount.toLocaleString('id-ID')} klaim sudah dibaca AI`}
        />
        <StatTile
          label="Perlu klarifikasi"
          value={flaggedClaimCount.toLocaleString('id-ID')}
          hint={
            analyzedClaimCount > 0
              ? `${formatPercent(flaggedClaimCount / analyzedClaimCount)} dari klaim yang dianalisis`
              : 'Belum ada klaim yang dianalisis'
          }
        />
        <StatTile
          label="Potensi selisih"
          value={formatRupiah(totalPotentialGap)}
          hint="Jika diagnosis tanpa bukti dikeluarkan"
        />
      </StatTileGrid>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel
          title="Klaim per bulan rawat inap"
          description="Jumlah klaim menurut bulan masuk dan hasil analisis AI."
          className="xl:col-span-2"
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
              {MONTHLY_SERIES.map((series, seriesIndex) => (
                <Bar
                  key={series}
                  dataKey={series}
                  stackId="claims"
                  fill={`var(--color-${series})`}
                  radius={
                    seriesIndex === MONTHLY_SERIES.length - 1
                      ? [4, 4, 0, 0]
                      : undefined
                  }
                />
              ))}
            </BarChart>
          </ChartContainer>
          <ChartLegendList
            items={MONTHLY_SERIES.map((series) => MONTHLY_CHART_CONFIG[series])}
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
