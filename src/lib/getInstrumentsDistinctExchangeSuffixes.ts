import type { TradableInstrument } from "../types";
import { getTickerExchange } from "./getTickerExchange";

export function getInstrumentsDistinctExchangeSuffixes(
  instruments: TradableInstrument[],
): string[] {
  return Array.from(
    new Set(instruments.map((i) => getTickerExchange(i.ticker))),
  );
}
