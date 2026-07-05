import { browserRequest } from "./browser";
import { getServicesBaseUrl } from "./servicesBaseUrl";
import type { CandleInterval, SessionType, T212Environment } from "../types";

const OHLC_PATH = "/charting/v1/ohlc";

/**
 * Positional tuple returned by the charting API:
 * [timestamp, open, high, low, close, volume, session]
 */
export type OhlcCandle = [
  /** Unix timestamp (seconds) of the candle open */
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  session: SessionType,
];

export interface OhlcResponse {
  candles: OhlcCandle[];
  /** A deviation/reference candle in the same tuple format, or null */
  deviationCandle: OhlcCandle | null;
  /** Unix timestamp (seconds) of the start of the regular daily session */
  dailySessionStart: number;
}

export interface OhlcOptions {
  /** Number of candles to return. Defaults to 500. */
  size?: number;
  /** Include extended-hours data. Defaults to true. */
  extHours?: boolean;
  from?: number; // Unix timestamp (seconds) of the start of the data
}

/**
 * Fetch OHLC candles for a single instrument from the Trading 212 charting API.
 *
 * @example
 * const candles = await getOhlc("AAPL_US_EQ", "ONE_MINUTE", { size: 500 }, "DEMO");
 */
export async function getOhlc(
  ticker: string,
  interval: CandleInterval,
  { size = 1, extHours = true, from }: OhlcOptions,
  environment: T212Environment,
): Promise<OhlcResponse> {
  const url = new URL(
    `${getServicesBaseUrl(environment)}${OHLC_PATH}/${interval}`,
  );
  url.searchParams.set("ticker", ticker);
  url.searchParams.set("size", String(size));
  url.searchParams.set("extHours", String(extHours));
  if (from) {
    url.searchParams.set("from", String(from));
  }

  return browserRequest<OhlcResponse>(url.toString());
}
