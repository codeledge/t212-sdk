import { getPositionPrice } from "../lib/getPositionPrice";
import type { Position } from "../types";

export function formatPosition(p: Position): string {
  return `*  ${getPositionPrice(p)?.toFixed(2).padEnd(8)} ${p.quantity}`;
}
