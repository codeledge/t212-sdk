import { T212_FX_FEE_RATE } from "../consts";

export function calcFxFee({
  price,
  quantity,
}: {
  price: number;
  quantity: number;
}): number {
  return Math.round(price * quantity * T212_FX_FEE_RATE * 100) / 100;
}
