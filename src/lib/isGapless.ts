import type { Candle, CandleInterval } from "../types";

const INTERVAL_MINUTES: Partial<Record<CandleInterval, number>> = {
  ONE_MINUTE: 1,
  FIVE_MINUTES: 5,
  TEN_MINUTES: 10,
  FIFTEEN_MINUTES: 15,
  THIRTY_MINUTES: 30,
  ONE_HOUR: 60,
  FOUR_HOURS: 240,
};

/**
 * True if every candle is exactly one `interval` after the previous one.
 * Not supported for `ONE_DAY`/`ONE_WEEK`/`ONE_MONTH`, since those don't map
 * to a fixed number of minutes (weekends, month lengths, etc).
 */
export function isGapless(candles: Candle[], interval: CandleInterval): boolean {
  const intervalMinutes = INTERVAL_MINUTES[interval];
  if (intervalMinutes === undefined) {
    throw new Error(`isGapless does not support the "${interval}" interval.`);
  }

  const byTime = [...candles].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  for (let i = 1; i < byTime.length; i++) {
    const diffMinutes =
      (byTime[i]!.date.getTime() - byTime[i - 1]!.date.getTime()) / 60_000;
    if (diffMinutes !== intervalMinutes) {
      return false;
    }
  }
  return true;
}
