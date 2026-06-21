/** Platform default currency — Ghana Cedis */
export const DEFAULT_CURRENCY = "GHS";
export const CURRENCY_SYMBOL = "GH₵";

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = safe.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${CURRENCY_SYMBOL} ${formatted}`;
}
