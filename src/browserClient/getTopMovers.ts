import { browserRequest } from "./browser";
import { getServicesBaseUrl } from "./servicesBaseUrl";
import type { T212Environment } from "../types";

/** ID of the "Top movers" automated list on T212's platform. */
const TOP_MOVERS_LIST_ID = 201;
const TOP_MOVERS_PATH = `/rest/watchlists/v6/automated-lists/${TOP_MOVERS_LIST_ID}`;

interface WatchlistPrice {
  sell: number;
  buy: number;
  /** Unix ms */
  timestamp: number;
  /** "R" = regular, "P" = pre-market, "A" = after-hours, "O" = off-hours */
  session: string;
}

/**
 * T212's reference price for daily change calculation.
 * Corresponds to the previous trading day's closing price.
 */
interface WatchlistDeviation {
  price: number;
  /** Unix ms of the previous close */
  timestamp: number;
}

export interface WatchlistInstrumentData {
  price?: WatchlistPrice;
  extendedHoursPrice?: WatchlistPrice;
  /** Previous day's close — used to compute daily change %. */
  deviation?: WatchlistDeviation;
}

interface InstrumentSet {
  id: number;
  lastUpdatedTimestamp: number;
  instruments: string[];
}

interface WatchlistMetadata {
  id: number;
  localizationKey: string;
  icon: string;
  readableCaption: string;
  readableDescription: string;
  contentsLocked: boolean;
  metadataLocked: boolean;
}

interface AutomatedListResponse {
  data: {
    id: number;
    metadata: WatchlistMetadata;
    instrumentSet: InstrumentSet;
  };
  computedData: Record<string, WatchlistInstrumentData>;
}

export interface TopMover {
  ticker: string;
  /** Current (regular-hours) bid/ask prices. */
  price: WatchlistPrice | undefined;
  /** Pre/after-market price when available. */
  extendedHoursPrice: WatchlistPrice | undefined;
  /** Previous day's close — the baseline for dailyChangePct. */
  previousClose: WatchlistDeviation | undefined;
  /**
   * Percentage change from previous close to current sell price.
   * `(sell - previousClose) / previousClose * 100`
   */
  dailyChangePct: number | undefined;
}

/** GET /rest/watchlists/v6/automated-lists/201 — requires a logged-in session. */
export async function getTopMovers(
  environment: T212Environment,
): Promise<TopMover[]> {
  const url = `${getServicesBaseUrl(environment)}${TOP_MOVERS_PATH}`;

  const body = await browserRequest<AutomatedListResponse>(url);
  const { instruments } = body.data.instrumentSet;

  return instruments.map((ticker) => {
    const data = body.computedData[ticker];
    const sell = data?.price?.sell;
    const prevClose = data?.deviation?.price;
    const dailyChangePct =
      sell !== undefined && prevClose !== undefined && prevClose !== 0
        ? ((sell - prevClose) / prevClose) * 100
        : undefined;

    return {
      ticker,
      price: data?.price,
      extendedHoursPrice: data?.extendedHoursPrice,
      previousClose: data?.deviation,
      dailyChangePct,
    };
  });
}
