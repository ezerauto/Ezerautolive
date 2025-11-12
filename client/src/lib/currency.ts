// Exchange rate: 1 USD = 26.298 HNL (Honduran Lempira)
// Updated: November 12, 2025
export const USD_TO_HNL_RATE = 26.298;

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatHNL(amount: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function usdToHnl(usdAmount: number): number {
  return usdAmount * USD_TO_HNL_RATE;
}

export function formatDualCurrency(usdAmount: number): {
  usd: string;
  hnl: string;
  usdRaw: number;
  hnlRaw: number;
} {
  const hnlAmount = usdToHnl(usdAmount);
  return {
    usd: formatUSD(usdAmount),
    hnl: formatHNL(hnlAmount),
    usdRaw: usdAmount,
    hnlRaw: hnlAmount,
  };
}
