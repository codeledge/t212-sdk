import { getOhlc } from "./getOhlc";
import type { OhlcCandle } from "./getOhlc";
import type { CandleInterval, T212Environment } from "../types";

/** Most recent candle for a single instrument. */
export async function getLastCandle(
  ticker: string,
  interval: CandleInterval,
  environment: T212Environment,
): Promise<OhlcCandle | undefined> {
  const response = await getOhlc(ticker, interval, { size: 1 }, environment);
  return response?.candles?.[0];
}
