import BigNumber from "bignumber.js";

/** Shares needed to spend `value` at `price`, rounded up to 2 decimals. */
export function calcShares({
  value,
  price,
}: {
  value: number;
  price: number;
}): number {
  return new BigNumber(value)
    .dividedBy(price)
    .decimalPlaces(2, BigNumber.ROUND_CEIL)
    .toNumber();
}
