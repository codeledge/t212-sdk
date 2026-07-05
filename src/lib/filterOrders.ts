import type {
  HistoricalOrder,
  OrderSide,
  OrderStatus,
  OrderType,
} from "../types";

export function filterOrders(
  orders: HistoricalOrder[],
  {
    side,
    type,
    status,
  }: { side?: OrderSide; type?: OrderType; status?: OrderStatus } = {},
): HistoricalOrder[] {
  return orders.filter((o) => {
    if (side && o.order.side !== side) return false;
    if (type && o.order.type !== type) return false;
    if (status && o.order.status !== status) return false;
    return true;
  });
}
