import type {
  OrderSide,
  OrderStatus,
  OrderType,
  Order,
  HistoricalOrder,
} from "../types";

export function filterOrders(
  orders: Order[],
  {
    side,
    type,
    status,
  }: { side?: OrderSide; type?: OrderType; status?: OrderStatus },
): Order[];
export function filterOrders(
  orders: HistoricalOrder[],
  {
    side,
    type,
    status,
  }: { side?: OrderSide; type?: OrderType; status?: OrderStatus },
): HistoricalOrder[];
export function filterOrders(
  orders: (Order | HistoricalOrder)[],
  {
    side,
    type,
    status,
  }: { side?: OrderSide; type?: OrderType; status?: OrderStatus } = {},
): (Order | HistoricalOrder)[] {
  return orders.filter((o) => {
    const order = isHistoricalOrder(o) ? o.order : o;
    if (side && order.side !== side) return false;
    if (type && order.type !== type) return false;
    if (status && order.status !== status) return false;
    return true;
  });
}

function isHistoricalOrder(order: Order | HistoricalOrder): order is HistoricalOrder {
  return "order" in order;
}
