import { browserRequest } from "./browser";
import { getServicesBaseUrl } from "./servicesBaseUrl";
import type { CurrencyCode, OrderType, T212Environment, Ticker } from "../types";

const ORDER_INSTRUMENT_SETTINGS_PATH =
  "/rest/v1/equity/order/instruments/settings";

export interface OrderInstrumentSettingsRequest {
  ticker: Ticker;
  orderType: OrderType;
  currencyCode: CurrencyCode;
  targetPrice: number;
}

export interface OrderInstrumentSettings {
  /** Instrument ticker, e.g. "AAPL_US_EQ" */
  code: Ticker;
  /** Maximum value you can buy at the given target price */
  maxBuy: number;
  /** Maximum value for a market buy order */
  maxMarketOrderBuy: number;
  /** Maximum quantity you can sell from your current position */
  maxSell: number;
  /** Maximum quantity across all open buy orders */
  maxOpenBuy: number;
  /** Maximum quantity across all open sell orders */
  maxOpenSell: number;
  /** Whether the instrument is currently suspended from trading */
  suspended: boolean;
  /** Minimum tradeable quantity */
  minTrade: number;
}

/**
 * Fetch order instrument settings for a given ticker, order type and target
 * price from the internal Trading 212 REST API.
 *
 * @example
 * const settings = await getOrderInstrumentSettings({
 *   ticker: "AAPL_US_EQ",
 *   orderType: "LIMIT",
 *   currencyCode: "GBP",
 *   targetPrice: 200.00,
 * }, "DEMO");
 */
export async function getOrderInstrumentSettings(
  body: OrderInstrumentSettingsRequest,
  environment: T212Environment,
): Promise<OrderInstrumentSettings> {
  const url = `${getServicesBaseUrl(environment)}${ORDER_INSTRUMENT_SETTINGS_PATH}`;

  return browserRequest<OrderInstrumentSettings>(url, {
    method: "POST",
    body,
  });
}
