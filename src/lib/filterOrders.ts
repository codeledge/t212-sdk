import type { Order, OrderSide, OrderType } from "../types";

export function filterOrders(
  orders: Order[],
  { side, type }: { side?: OrderSide; type?: OrderType } = {},
): Order[] {
  return orders.filter((o) => {
    if (side && o.side !== side) return false;
    if (type && o.type !== type) return false;
    return true;
  });
}
