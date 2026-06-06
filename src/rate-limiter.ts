const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private tail: Promise<void> = Promise.resolve();
  private nextAllowedAt = 0;

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      await this.waitUntilAllowed();
      return task();
    };

    const result = this.tail.then(run, run);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  noteResponse(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    const period = headers.get("x-ratelimit-period");
    const limit = headers.get("x-ratelimit-limit");

    if (remaining === "0") {
      this.deferUntil(reset, period);
      return;
    }

    if (limit && period) {
      const intervalMs = (Number(period) * 1000) / Number(limit);
      this.nextAllowedAt = Math.max(
        this.nextAllowedAt,
        Date.now() + intervalMs,
      );
    }
  }

  noteRateLimited(headers: Headers): void {
    this.deferUntil(
      headers.get("x-ratelimit-reset"),
      headers.get("x-ratelimit-period"),
    );
  }

  async waitUntilAllowed(): Promise<void> {
    const delay = this.nextAllowedAt - Date.now();
    if (delay > 0) {
      await sleep(delay);
    }
  }

  private deferUntil(
    resetHeader: string | null,
    periodHeader: string | null,
  ): void {
    if (resetHeader) {
      this.nextAllowedAt = Math.max(
        this.nextAllowedAt,
        Number(resetHeader) * 1000,
      );
      return;
    }

    const periodMs = Number(periodHeader ?? 5) * 1000;
    this.nextAllowedAt = Math.max(this.nextAllowedAt, Date.now() + periodMs);
  }
}
