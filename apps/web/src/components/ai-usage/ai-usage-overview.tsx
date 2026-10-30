'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
import { formatRupiah } from '@/lib/format';
import { isForbiddenError } from '@/services/auth.service';
import { fetchAiUsageSummary } from '@/services/ai-usage.service';
import { formatEstimatedCost, formatTokens } from './ai-usage-format';
import { AiUsageEmpty, AiUsageForbidden } from './ai-usage-states';

const DAILY_CHART_CONFIG = {
  inputTokens: { label: 'Token input', color: 'var(--color-chart-neutral)' },
  outputTokens: {
    label: 'Token output',
    color: 'var(--color-ink-secondary)',
  },
} satisfies ChartConfig;

type DailySeries = keyof typeof DAILY_CHART_CONFIG;
const DAILY_SERIES = Object.keys(DAILY_CHART_CONFIG) as DailySeries[];

const dayFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Token totals, estimated cost, and daily usage, aggregated by the API. */
export function AiUsageOverview() {
  const summaryQuery = useQuery({
    queryKey: ['ai-usage', 'summary'],
    queryFn: fetchAiUsageSummary,
  });

  if (summaryQuery.isPending) return <DashboardSkeleton tileCount={4} />;
  if (summaryQuery.isError) {
    return isForbiddenError(summaryQuery.error) ? (
      <AiUsageForbidden />
    ) : (
      <LoadError
        title="Penggunaan AI gagal dimuat"
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  const { pricing, totals, averageCostPerClaim, daily } = summaryQuery.data;
  if (totals.documentCount === 0) return <AiUsageEmpty />;

  const priceHint = pricing
    ? `Harga ${formatRupiah(pricing.inputPerMillionTokens)} input · ${formatRupiah(pricing.outputPerMillionTokens)} output per 1 juta token`
    : 'Harga token belum diatur di server';
  const dailyData = daily.map((day) => ({
    ...day,
    day: dayFormatter.format(new Date(day.date)),
  }));
  const windowTotals = daily.reduce(
    (sum, day) => ({
      inputTokens: sum.inputTokens + day.inputTokens,
      outputTokens: sum.outputTokens + day.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <StatTileGrid>
        <StatTile
          label="Estimasi biaya"
          value={formatEstimatedCost(totals.estimatedCost)}
          hint={priceHint}
        />
        <StatTile
          label="Token AI"
          value={formatTokens(totals.inputTokens + totals.outputTokens)}
          hint={`${formatTokens(totals.inputTokens)} input · ${formatTokens(totals.outputTokens)} output`}
        />
        <StatTile
          label="Dokumen dibaca AI"
          value={formatTokens(totals.documentCount)}
          hint={`dari ${formatTokens(totals.claimCount)} klaim`}
        />
        <StatTile
          label="Rata-rata per klaim"
          value={formatEstimatedCost(averageCostPerClaim)}
          hint={`${formatTokens(Math.round((totals.inputTokens + totals.outputTokens) / totals.claimCount))} token per klaim`}
        />
      </StatTileGrid>

      <ChartPanel
        title="Token per hari"
        description="Token yang dipakai AI untuk membaca dokumen dalam 30 hari terakhir, waktu Jakarta."
      >
        <ChartContainer
          config={DAILY_CHART_CONFIG}
          className="aspect-auto h-64 w-full"
        >
          <BarChart data={dailyData} margin={{ left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(value: number) => formatTokens(value)}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--color-subtle)' }}
              content={
                <ChartTooltipContent className={CHART_TOOLTIP_CLASS_NAME} />
              }
            />
            {DAILY_SERIES.map((series, seriesIndex) => (
              <Bar
                key={series}
                dataKey={series}
                stackId="tokens"
                fill={`var(--color-${series})`}
                radius={
                  seriesIndex === DAILY_SERIES.length - 1
                    ? [4, 4, 0, 0]
                    : undefined
                }
              />
            ))}
          </BarChart>
        </ChartContainer>
        <ChartLegendList
          items={DAILY_SERIES.map((series) => ({
            ...DAILY_CHART_CONFIG[series],
            value: formatTokens(windowTotals[series]),
          }))}
        />
      </ChartPanel>
    </div>
  );
}
