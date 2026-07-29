import { getOhlc } from "./getOhlc";
import type { OhlcCandle, OhlcOptions } from "./getOhlc";
import type { Candle, CandleInterval, T212Environment } from "../types";
import { differenceInSeconds, fromUnixTime } from "date-fns";
import { parseCandle } from "../parsers/parseCandle";
import { last } from "deverything";

const INTERVAL_SECONDS: Record<CandleInterval, number> = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 5 * 60,
  TEN_MINUTES: 10 * 60,
  FIFTEEN_MINUTES: 15 * 60,
  THIRTY_MINUTES: 30 * 60,
  ONE_HOUR: 60 * 60,
  FOUR_HOURS: 4 * 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
};

export interface GetLastCandleOptions extends OhlcOptions {
  ensureLastInterval?: boolean;
}

/** Most recent candle for a single instrument. */
export async function getLastCandle(
  ticker: string,
  interval: CandleInterval,
  environment: T212Environment,
  { extHours = true, ensureLastInterval = false }: GetLastCandleOptions = {},
): Promise<Candle | undefined> {
  const response = await getOhlc(
    ticker,
    interval,
    { size: 1, extHours },
    environment,
  );

  const ohlc = last(response?.candles);
  if (!ohlc) return undefined;
  const candle = parseCandle(ohlc);
  if (!ensureLastInterval) return candle;
  const lastCandleAgeSeconds = differenceInSeconds(
    Date.now(),
    candle.date.getTime(),
  );
  if (lastCandleAgeSeconds > INTERVAL_SECONDS[interval]) return undefined;
  return candle;
}
