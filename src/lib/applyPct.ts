import BigNumber from "bignumber.js";

/** `price * (1 + pct)`, rounded to 2 decimals. Use negative `pct` to subtract. */
export function applyPct({
  price,
  pct,
}: {
  price: number;
  pct: number;
}): number {
  return new BigNumber(price)
    .multipliedBy(1 + pct)
    .decimalPlaces(2)
    .toNumber();
}
