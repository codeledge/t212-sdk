import type { OhlcCandle } from "../rest/ohlc";
import type { Candle } from "../types";

export function parseCandle(candle: OhlcCandle): Candle {
  const [ts, open, high, low, close, volume, session] = candle;
  return {
    date: new Date(ts * 1000),
    open,
    high,
    low,
    close,
    volume,
    range: high - low,
    rangePct: (high - low) / close,
    sessionType: session,
  };
}
