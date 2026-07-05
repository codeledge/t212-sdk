import { formatPercentage, formatNumber } from "deverything";
import type { AddedCostsResponse } from "../browserClient/getAddedCosts";
import type { Order, Position } from "../types";
import { formatOrderPrice } from "./formatOrderPrice";
import { formatOrderQty } from "./formatOrderQty";
import { formatOrderSide } from "./formatOrderSide";
import BigNumber from "bignumber.js";

export function formatOrder(
  order: Order,
  options: {
    cellWidth?: number;
    position?: Position;
    costs?: AddedCostsResponse;
    showCurrency?: boolean;
  } = {},
): string {
  let line = `${formatOrderSide(order, options)} ${formatOrderQty(order, options)} ${formatOrderPrice(order, options)}`;

  if (options.position && order.limitPrice != null) {
    const priceDelta = new BigNumber(order.limitPrice).minus(
      options.position.averagePricePaid,
    );

    line +=
      ` ${formatNumber(priceDelta.decimalPlaces(2).toNumber(), { sign: true })}` +
      ` (${formatPercentage(
        priceDelta.dividedBy(options.position.averagePricePaid).toNumber(),
        { digits: 2 },
      )})`;
  }

  return line;
}
