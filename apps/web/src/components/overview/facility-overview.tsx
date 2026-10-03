'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  CHART_TOOLTIP_CLASS_NAME,
  ChartLegendList,
  ChartPanel,
  DashboardSkeleton,
  StatTile,
} from '@/components/dashboard-panels';
import { FacilitySummaryGate } from '@/components/facility-summary/facility-summary';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { TEST_TYPE_DETAILS, TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { formatCompactRupiah, formatPercent, formatRupiah } from '@/lib/format';
import type { FacilitySummary } from '@/types/facility.types';

const BAR_ROW_HEIGHT = 36;
const CHART_VERTICAL_PADDING = 24;

const CLAIM_CHART_CONFIG = {
  claimCount: { label: 'Klaim', color: 'var(--color-chart-neutral)' },
  flaggedClaimCount: {
    label: 'Perlu klarifikasi',
    color: 'var(--color-warning)',
  },
} satisfies ChartConfig;

const GAP_CHART_CONFIG = {
  totalPotentialGap: {
    label: 'Potensi selisih',
    color: 'var(--color-warning-ink)',
  },
} satisfies ChartConfig;

const TEST_TYPE_COLORS = {
  EXISTENCE: 'var(--color-warning)',
  CONSISTENCY: 'var(--color-error)',
  SIMILARITY: 'var(--color-ink-secondary)',
} as const;

const FINDING_CHART_CONFIG = Object.fromEntries(
  TEST_TYPE_ORDER.map((testType) => [
    testType,
    {
      label: TEST_TYPE_DETAILS[testType].title,
      color: TEST_TYPE_COLORS[testType],
    },
  ]),
) satisfies ChartConfig;

function facilityNameLabel(
  _label: unknown,
  payload: readonly { payload?: { name?: string } }[],
): string {
  return payload[0]?.payload?.name ?? '';
}

function chartHeight(rowCount: number): number {
  return rowCount * BAR_ROW_HEIGHT + CHART_VERTICAL_PADDING;
}

export function FacilityOverviewPanel() {
  return (
    <FacilitySummaryGate loadingFallback={<DashboardSkeleton tileCount={4} />}>
      {(facilitySummaries) => (
        <FacilityOverview facilitySummaries={facilitySummaries} />
      )}
    </FacilitySummaryGate>
  );
}

function FacilityOverview({
  facilitySummaries,
}: {
  facilitySummaries: FacilitySummary[];
}) {
  const claimCount = facilitySummaries.reduce(
    (total, summary) => total + summary.claimCount,
    0,
  );
  const flaggedClaimCount = facilitySummaries.reduce(
    (total, summary) => total + summary.flaggedClaimCount,
    0,
  );
  const totalPotentialGap = facilitySummaries.reduce(
    (total, summary) => total + summary.totalPotentialGap,
    0,
  );
  const chartData = facilitySummaries
    .map((summary) => ({
      code: summary.facility.code,
      name: summary.facility.name,
      claimCount: summary.claimCount,
      flaggedClaimCount: summary.flaggedClaimCount,
      totalPotentialGap: summary.totalPotentialGap,
      ...summary.findingCounts,
    }))
    .sort(
      (first, second) => second.totalPotentialGap - first.totalPotentialGap,
    );
  const highestRiskFacility = facilitySummaries.reduce<
    FacilitySummary | undefined
  >(
    (highest, summary) =>
      !highest || summary.totalPotentialGap > highest.totalPotentialGap
        ? summary
        : highest,
    undefined,
  );
  const height = chartHeight(chartData.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Faskes"
          value={facilitySummaries.length.toLocaleString('id-ID')}
          hint={`${claimCount.toLocaleString('id-ID')} klaim diajukan`}
        />
        <StatTile
          label="Rasio klaim bertanda"
          value={formatPercent(claimCount ? flaggedClaimCount / claimCount : 0)}
          hint={`${flaggedClaimCount.toLocaleString('id-ID')} perlu klarifikasi`}
        />
        <StatTile
          label="Potensi selisih"
          value={formatRupiah(totalPotentialGap)}
          hint="Total seluruh faskes"
        />
        <StatTile
          label="Selisih terbesar"
          value={highestRiskFacility?.facility.code ?? '—'}
          hint={highestRiskFacility?.facility.name}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Klaim dan tanda per faskes"
          description="Jumlah klaim yang diajukan dibanding klaim yang perlu klarifikasi."
        >
          <ChartContainer
            config={CLAIM_CHART_CONFIG}
            className="aspect-auto w-full"
            style={{ height }}
          >
            <BarChart data={chartData} layout="vertical" barGap={2}>
              <CartesianGrid
                horizontal={false}
                stroke="var(--color-hairline)"
              />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="code"
                tickLine={false}
                axisLine={false}
                width={88}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--color-subtle)' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={facilityNameLabel}
                    className={CHART_TOOLTIP_CLASS_NAME}
                  />
                }
              />
              <Bar
                dataKey="claimCount"
                fill="var(--color-claimCount)"
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
              <Bar
                dataKey="flaggedClaimCount"
                fill="var(--color-flaggedClaimCount)"
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
            </BarChart>
          </ChartContainer>
          <ChartLegendList
            items={[
              {
                label: CLAIM_CHART_CONFIG.claimCount.label,
                color: CLAIM_CHART_CONFIG.claimCount.color,
              },
              {
                label: CLAIM_CHART_CONFIG.flaggedClaimCount.label,
                color: CLAIM_CHART_CONFIG.flaggedClaimCount.color,
              },
            ]}
          />
        </ChartPanel>

        <ChartPanel
          title="Potensi selisih per faskes"
          description="Rupiah yang dapat dikoreksi jika diagnosis tanpa bukti dikeluarkan."
        >
          <ChartContainer
            config={GAP_CHART_CONFIG}
            className="aspect-auto w-full"
            style={{ height }}
          >
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                horizontal={false}
                stroke="var(--color-hairline)"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactRupiah}
              />
              <YAxis
                type="category"
                dataKey="code"
                tickLine={false}
                axisLine={false}
                width={88}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--color-subtle)' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={facilityNameLabel}
                    className={CHART_TOOLTIP_CLASS_NAME}
                    formatter={(value) => (
                      <span className="flex w-full justify-between gap-4">
                        <span className="text-ink-secondary">
                          Potensi selisih
                        </span>
                        <span className="font-medium text-ink tabular-nums">
                          {formatRupiah(Number(value))}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="totalPotentialGap"
                fill="var(--color-totalPotentialGap)"
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
            </BarChart>
          </ChartContainer>
        </ChartPanel>

        <ChartPanel
          title="Tanda per jenis uji"
          description="Jumlah tanda dari setiap uji, per faskes."
          className="lg:col-span-2"
        >
          <ChartContainer
            config={FINDING_CHART_CONFIG}
            className="aspect-auto h-64 w-full"
          >
            <BarChart data={chartData} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
              <XAxis
                dataKey="code"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                cursor={{ fill: 'var(--color-subtle)' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={facilityNameLabel}
                    className={CHART_TOOLTIP_CLASS_NAME}
                  />
                }
              />
              {TEST_TYPE_ORDER.map((testType, testIndex) => (
                <Bar
                  key={testType}
                  dataKey={testType}
                  stackId="findings"
                  fill={`var(--color-${testType})`}
                  radius={
                    testIndex === TEST_TYPE_ORDER.length - 1
                      ? [4, 4, 0, 0]
                      : undefined
                  }
                />
              ))}
            </BarChart>
          </ChartContainer>
          <ChartLegendList
            items={TEST_TYPE_ORDER.map((testType) => ({
              label: TEST_TYPE_DETAILS[testType].title,
              color: TEST_TYPE_COLORS[testType],
            }))}
          />
        </ChartPanel>
      </div>
    </div>
  );
}
