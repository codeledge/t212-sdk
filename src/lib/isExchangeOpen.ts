import type { Exchange, TimeEvent, TimeEventType, WorkingSchedule } from "../types";

const OPEN_EVENT_TYPES = new Set<TimeEventType>(["OPEN", "BREAK_END"]);

/**
 * True if `timeEvents` puts a schedule within regular trading hours at `at`,
 * i.e. the most recent time event at or before `at` is `OPEN` or
 * `BREAK_END`.
 *
 * This is intentionally not a stateful open/close toggle: real data never
 * emits a plain `CLOSE` event for regular sessions — days instead flow
 * `OPEN` -> `AFTER_HOURS_OPEN` -> `OVERNIGHT_OPEN` -> `PRE_MARKET_OPEN` with
 * only `AFTER_HOURS_CLOSE` marking the end of the trading week. Looking at
 * just the latest event type avoids having to enumerate every non-regular
 * event as a "closing" transition.
 */
function isOpenAt(timeEvents: TimeEvent[], at: Date): boolean {
  const events = timeEvents
    .map((event) => ({ type: event.type, date: new Date(event.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let lastType: TimeEventType | undefined;
  for (const event of events) {
    if (event.date.getTime() > at.getTime()) break;
    lastType = event.type;
  }

  return lastType !== undefined && OPEN_EVENT_TYPES.has(lastType);
}

/** True if this specific working schedule is within regular trading hours at `at`. */
export function isWorkingScheduleOpen(
  schedule: WorkingSchedule,
  at: Date = new Date(),
): boolean {
  return isOpenAt(schedule.timeEvents, at);
}

/** True if the exchange (across all of its working schedules) is within regular trading hours at `at`. */
export function isExchangeOpen(
  exchange: Exchange,
  at: Date = new Date(),
): boolean {
  return isOpenAt(
    exchange.workingSchedules.flatMap((schedule) => schedule.timeEvents),
    at,
  );
}
