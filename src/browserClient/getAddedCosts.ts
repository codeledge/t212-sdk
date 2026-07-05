import { browserRequest } from "./browser";
import { getServicesBaseUrl } from "./servicesBaseUrl";
import type { T212Environment } from "../types";

const ADDED_COSTS_PATH = "/rest/v2/public/added-costs";

export interface AddedCostsRequest {
  instrumentCode: string;
  quantity: number;
  orderType: "LIMIT" | "STOP" | "STOP_LIMIT" | "MARKET";
  currencyCode: string;
  limitPrice?: number;
  stopPrice?: number;
  timeValidity?: "DAY" | "GOOD_TILL_CANCEL";
  enabledExtendedMarketHours?: boolean;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

export interface AddedCostsResponse {
  orderQuantity: number;
  orderValue: number;
  sharesValue: number;
  total: number;
  exchangeRate: ExchangeRate;
  costs: Record<string, number>;
}

/**
 * Preview the total cost of a limit order, including currency conversion fees.
 *
 * @example
 * const costs = await getAddedCosts({
 *   instrumentCode: "AAPL_US_EQ",
 *   quantity: 1,
 *   orderType: "LIMIT",
 *   currencyCode: "GBP",
 *   limitPrice: 295.22,
 *   timeValidity: "GOOD_TILL_CANCEL",
 *   enabledExtendedMarketHours: true,
 * }, "DEMO");
 * console.log(costs.total, costs.costs);
 */
export async function getAddedCosts(
  body: AddedCostsRequest,
  environment: T212Environment,
): Promise<AddedCostsResponse> {
  const url = `${getServicesBaseUrl(environment)}${ADDED_COSTS_PATH}`;

  return browserRequest<AddedCostsResponse>(url, {
    method: "POST",
    body,
  });
}
