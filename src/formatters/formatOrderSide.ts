import type { Order } from "../types";

export function formatOrderSide(
  order: Order,
  options: { cellWidth?: number } = {},
): string {
  let side = "?";
  if (order.side) {
    side = order.side === "BUY" ? "B" : "S";
  }

  if (options.cellWidth) {
    side = side.padEnd(options.cellWidth);
  }

  return side;
}
