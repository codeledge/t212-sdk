import type { HistoricalOrder } from "../types";

export function getHistoricalOrderTimestamp(
  order: HistoricalOrder,
): string | undefined {
  return (
    order.fill?.filledAt ??
    order.order.dateExecuted ??
    order.order.createdAt ??
    order.order.creationTime
  );
}
