import type { RateLimitInfo, T212ErrorBody } from "./types";

export class T212Error extends Error {
  readonly status: number;
  readonly body: T212ErrorBody | string | null;
  readonly rateLimit: RateLimitInfo | null;

  constructor(
    message: string,
    options: {
      status: number;
      body?: T212ErrorBody | string | null;
      rateLimit?: RateLimitInfo | null;
      cause?: unknown;
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "T212Error";
    this.status = options.status;
    this.body = options.body ?? null;
    this.rateLimit = options.rateLimit ?? null;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isTimeout(): boolean {
    return this.status === 408;
  }
}

export class T212ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "T212ConfigError";
  }
}
