import type { Position } from "../types";

export const getPositionPrice = (position: Position): number | undefined => {
  return position.averagePricePaid;
};
