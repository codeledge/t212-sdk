/**
 * Tickers encode the exchange in one of two shapes, and the API never
 * exposes the exchange directly, so this is derived empirically from
 * instrument tickers (see `scripts/exchange-suffixes.ts`):
 *
 *  - `AAPL_US_EQ` -> a `_XX` (2-4 uppercase letters) country code before `_EQ`
 *  - `ZGYd_EQ`    -> a lowercase letter suffix glued onto the symbol before `_EQ`
 *  - `TPR_EQ_US`  -> a rare reversed shape, `_EQ_XX`
 */
export function getTickerExchange(ticker: string): string {
  const reversed = ticker.match(/_EQ_([A-Z]{2,4})$/);
  if (reversed) return reversed[1]!;

  const body = ticker.replace(/_EQ$/, "");

  const countryCode = body.match(/_(?:WAR_)?([A-Z]{2,4})$/);
  if (countryCode) return countryCode[1]!;

  const letterCode = body.match(/([a-z]+)$/);
  if (letterCode) return letterCode[1]!;

  return "(none)";
}
