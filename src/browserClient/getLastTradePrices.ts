import { browserRequest } from "./browser";
import { getServicesBaseUrl } from "./servicesBaseUrl";
import type { T212Environment } from "../types";

const LAST_TRADE_PATH = "/instrumentarium/v1/prices/last-trade";

export interface LastTradePrice {
  /** Instrument ticker, e.g. "AAPL_US_EQ" */
  ticker: string;
  /** Best ask price */
  ask: number;
  /** Best bid price */
  bid: number;
  /** Last traded price */
  last: number;
  /** Timestamp of the quote (Unix ms) */
  timestamp?: number;
  /** Extended fields returned when extended=true */
  open?: number;
  close?: number;
  high?: number;
  low?: number;
  volume?: number;
  [key: string]: unknown;
}

export type LastTradePricesResponse = Record<string, LastTradePrice>;

/**
 * Fetch last-trade prices for one or more instrument tickers.
 *
 * @example
 * const prices = await getLastTradePrices(["AAPL_US_EQ", "NVDA_US_EQ"], true, "DEMO");
 * console.log(prices["AAPL_US_EQ"].ask);
 */
export async function getLastTradePrices(
  tickers: string[],
  extended: boolean,
  environment: T212Environment,
): Promise<LastTradePricesResponse> {
  const url = `${getServicesBaseUrl(environment)}${LAST_TRADE_PATH}`;

  return browserRequest<LastTradePricesResponse>(url, {
    method: "POST",
    body: { tickers, extended },
  });
}
