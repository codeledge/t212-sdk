import type { Order } from "../types";

export const getOrderPrice = (order: Order): number | undefined => {
  return order.limitPrice ?? order.stopPrice ?? undefined; // undefined for market
};
