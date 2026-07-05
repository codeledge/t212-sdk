import { sum } from "deverything";
import { getAddedCosts } from "./getAddedCosts";
import type { AddedCostsRequest } from "./getAddedCosts";
import type { T212Environment } from "../types";

/** Total cost of an order as a single summed number. */
export async function getSellAddedCosts(
  body: AddedCostsRequest,
  environment: T212Environment,
): Promise<number> {
  const costs = await getAddedCosts(body, environment);
  return sum(Object.values(costs.costs));
}
