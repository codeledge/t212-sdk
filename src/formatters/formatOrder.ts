import { calcFxFee } from "../lib/calcFxFee";
import { getOrderPrice } from "../lib/getOrderPrice";
import { round } from "../lib/round";
import type { AddedCostsResponse } from "../rest/added-costs";
import type { Order, Position } from "../types";

function orderSide(order: Order): string {
  if (order.side) {
    return order.side === "BUY" ? "B" : "S";
  }

  if (order.quantity !== undefined) {
    return order.quantity < 0 ? "S" : "B";
  }

  return "?";
}

function orderQuantity(order: Order): number {
  return Math.abs(order.quantity ?? order.orderedQuantity ?? 0);
}

function formatOrderPrice(order: Order): string {
  return (getOrderPrice(order)?.toFixed(2) ?? "-").padEnd(8);
}

export function formatOrder(
  order: Order,
  position?: Position,
  costs?: AddedCostsResponse,
): string {
  let line = `${orderSide(order).padEnd(2)} ${formatOrderPrice(order)} ${orderQuantity(order)}`;

  const isSell =
    order.side === "SELL" ||
    (order.quantity !== undefined && order.quantity < 0);

  if (isSell && position && costs && order.limitPrice != null) {
    const qty = costs.orderQuantity;
    const rate = costs.exchangeRate.rate;
    const priceIncrease = round(order.limitPrice - position.averagePricePaid);

    const increase = round(priceIncrease * qty);

    const sellFee = calcFxFee({
      price: order.limitPrice,
      quantity: qty,
    });

    const buyFee = calcFxFee({
      price: position.averagePricePaid,
      quantity: qty,
    });

    const net = round(increase - sellFee - buyFee);

    const netGBP = round(net * rate);
    line += `x${priceIncrease}=${increase} -${sellFee} (Sell) -${buyFee} (Buy)= ${net} => ${netGBP}GBP`;
  }

  return line;
}
