import { getOrderPrice } from "../lib/getOrderPrice";
import type { Order } from "../types";

export function formatOrderPrice(
  order: Order,
  options: { cellWidth?: number; showCurrency?: boolean } = {},
): string {
  let price = getOrderPrice(order);

  let formattedPrice = price
    ? options.showCurrency && order.instrument?.currency
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: order.instrument.currency,
          currencyDisplay: "narrowSymbol",
        }).format(price)
      : price.toString()
    : "-";

  if (options.cellWidth) {
    formattedPrice = formattedPrice.padEnd(options.cellWidth);
  }
  return formattedPrice;
}
