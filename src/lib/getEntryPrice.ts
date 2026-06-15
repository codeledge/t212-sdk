import type { Order, Position } from "../types";
import { getOrderPrice } from "./getOrderPrice";
import { getPositionPrice } from "./getPositionPrice";

export const getEntryPrice = (entry: Order | Position): number | undefined => {
  if ("type" in entry) return getOrderPrice(entry);
  return getPositionPrice(entry);
};
