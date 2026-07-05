import { getOrderQuantity } from "../lib/getOrderQuantity";
import type { Order } from "../types";

export function formatOrderQty(
  order: Order,
  options: { cellWidth?: number } = {},
): string {
  let qty = getOrderQuantity(order);
  let formattedQty = qty.toString();
  if (options.cellWidth) {
    formattedQty = formattedQty.padEnd(options.cellWidth);
  }

  return `×${formattedQty}`;
}
