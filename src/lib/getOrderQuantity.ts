import type { Order } from "../types";

export const getOrderQuantity = (order: Order): number => {
  return Math.abs(order.quantity ?? order.orderedQuantity ?? 0);
};
