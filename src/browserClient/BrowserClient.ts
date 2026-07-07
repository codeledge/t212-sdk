import { browserRequest, closeBrowser } from "./browser";
import type { BrowserRequestOptions } from "./browser";
import { getAddedCosts } from "./getAddedCosts";
import type { AddedCostsRequest, AddedCostsResponse } from "./getAddedCosts";
import { getKeyStats } from "./getKeyStats";
import type { KeyStats } from "./getKeyStats";
import { getLastCandle, type GetLastCandleOptions } from "./getLastCandle";
import { getLastTradePrices } from "./getLastTradePrices";
import type { LastTradePricesResponse } from "./getLastTradePrices";
import { getOhlc } from "./getOhlc";
import type { OhlcCandle, OhlcOptions, OhlcResponse } from "./getOhlc";
import { getOrderInstrumentSettings } from "./getOrderInstrumentSettings";
import type {
  OrderInstrumentSettings,
  OrderInstrumentSettingsRequest,
} from "./getOrderInstrumentSettings";
import { getSellAddedCosts } from "./getSellAddedCosts";
import { getTopMovers } from "./getTopMovers";
import type { TopMover } from "./getTopMovers";
import type { Candle, CandleInterval, T212Environment } from "../types";

export interface BrowserClientOptions {
  environment: T212Environment;
}

export const getBrowserClientFromEnv = (): BrowserClient => {
  return new BrowserClient({
    environment: process.env.T212_ENVIRONMENT as T212Environment,
  });
};

/**
 * Client for Trading 212's internal, Cloudflare-protected endpoints.
 *
 * These aren't part of the official Public API — requests are driven through
 * a real Chrome via Playwright (see `browser.ts`) so they clear Cloudflare.
 * Requires a one-time interactive login; see `browser.ts` for the relevant
 * env vars (`T212_CHROME_USER_DATA_DIR`, `T212_SHOW_WINDOW`, `T212_APP_ORIGIN`).
 */
export class BrowserClient {
  private readonly environment: T212Environment;

  constructor(options: BrowserClientOptions) {
    this.environment = options.environment;
  }

  /** Create a client instance. Alias for `new BrowserClient(options)`. */
  static create(options: BrowserClientOptions): BrowserClient {
    return new BrowserClient(options);
  }

  /** GET /rest/watchlists/v6/automated-lists/201 — requires a logged-in session. */
  getTopMovers(): Promise<TopMover[]> {
    return getTopMovers(this.environment);
  }

  /** Key stats (market cap, average volume, P/E, dividend yield) for a ticker. */
  getKeyStats(ticker: string): Promise<KeyStats> {
    return getKeyStats(ticker, this.environment);
  }

  /** Preview the total cost of an order, including currency conversion fees. */
  getAddedCosts(body: AddedCostsRequest): Promise<AddedCostsResponse> {
    return getAddedCosts(body, this.environment);
  }

  /** Total cost of an order as a single summed number. */
  getSellAddedCosts(body: AddedCostsRequest): Promise<number> {
    return getSellAddedCosts(body, this.environment);
  }

  /** Last-trade prices for one or more instrument tickers. */
  getLastTradePrices(
    tickers: string[],
    extended = true,
  ): Promise<LastTradePricesResponse> {
    return getLastTradePrices(tickers, extended, this.environment);
  }

  /** OHLC candles for a single instrument. */
  getOhlc(
    ticker: string,
    interval: CandleInterval = "ONE_MINUTE",
    options: OhlcOptions = {},
  ): Promise<OhlcResponse> {
    return getOhlc(ticker, interval, options, this.environment);
  }

  /** Most recent candle for a single instrument. */
  getLastCandle(
    ticker: string,
    interval: CandleInterval = "ONE_MINUTE",
    options: GetLastCandleOptions = {},
  ): Promise<Candle | undefined> {
    return getLastCandle(ticker, interval, this.environment, options);
  }

  /** Order instrument settings (max buy/sell quantities, suspension, etc). */
  getOrderInstrumentSettings(
    body: OrderInstrumentSettingsRequest,
  ): Promise<OrderInstrumentSettings> {
    return getOrderInstrumentSettings(body, this.environment);
  }

  /** Low-level escape hatch: fetch any Trading 212 JSON endpoint through the browser context. */
  request<T>(url: string, options?: BrowserRequestOptions): Promise<T> {
    return browserRequest<T>(url, options);
  }

  /** Close the shared browser. Call at the end of a script so the process exits. */
  close(): Promise<void> {
    return closeBrowser();
  }
}
