import { T212_FX_FEE_RATE } from "../consts";
import { round } from "./round";

export function calcFxFee({
  price,
  quantity,
}: {
  price: number;
  quantity: number;
}): number {
  return round(price * quantity * T212_FX_FEE_RATE);
}
