const tokenFormatter = new Intl.NumberFormat('id-ID');
const smallRupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatTokens(count: number): string {
  return tokenFormatter.format(count);
}

/**
 * An estimate, so it is prefixed with "≈". Amounts below Rp100 keep two
 * decimals because one document usually costs only a few rupiah.
 */
export function formatEstimatedCost(amount: number | null): string {
  if (amount === null) return '–';
  const formatter = amount < 100 ? smallRupiahFormatter : rupiahFormatter;
  return `≈ ${formatter.format(amount)}`;
}
