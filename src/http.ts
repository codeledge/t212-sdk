import { T212Error } from "./errors";
import { RateLimiter } from "./rate-limiter";
import type {
  Order,
  PaginatedResponse,
  PaginationQuery,
  PositionsQuery,
  RateLimitInfo,
  T212ClientOptions,
  T212Environment,
  T212ErrorBody,
} from "./types";

const BASE_URLS: Record<T212Environment, string> = {
  DEMO: "https://demo.trading212.com",
  LIVE: "https://live.trading212.com",
};

export type HttpMethod = "GET" | "POST" | "DELETE";

export interface HttpRequestOptions {
  method?: HttpMethod;
  path: string;
  query?: PaginationQuery | PositionsQuery;
  body?: unknown;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly basePath: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeout: number;
  private readonly rateLimiter = new RateLimiter();

  constructor(options: T212ClientOptions) {
    if (!options.apiKey || !options.apiSecret) {
      throw new Error("apiKey and apiSecret are required");
    }

    this.baseUrl = BASE_URLS[options.environment];
    this.basePath = options.basePath ?? "/api/v0";
    this.fetchImpl = options.fetch ?? fetch;
    this.timeout = options.timeout ?? 30_000;

    const credentials = `${options.apiKey}:${options.apiSecret}`;
    this.authHeader = `Basic ${encodeBase64(credentials)}`;
  }

  request<T>(options: HttpRequestOptions): Promise<T> {
    const minIntervalMs = endpointMinIntervalMs(
      options.path,
      options.method ?? "GET",
    );

    return this.rateLimiter.schedule(() =>
      this.executeRequest<T>(options, 3, minIntervalMs),
    );
  }

  /** Follow `nextPagePath` values returned by paginated list endpoints. */
  requestPaginatedPath<T>(nextPagePath: string): Promise<PaginatedResponse<T>> {
    const normalizedPath = nextPagePath.startsWith(this.basePath)
      ? nextPagePath.slice(this.basePath.length)
      : nextPagePath.replace(/^\/api\/v0/, "");

    return this.request<PaginatedResponse<T>>({
      path: normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`,
    });
  }

  private async executeRequest<T>(
    options: HttpRequestOptions,
    retries = 3,
    minIntervalMs = 0,
  ): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
        signal: controller.signal,
      });

      const rateLimit = parseRateLimitHeaders(response.headers);
      const text = await response.text();
      const body = text ? parseJson(text) : null;

      if (response.status === 429 && retries > 0) {
        this.rateLimiter.noteRateLimited(response.headers);
        await this.rateLimiter.waitUntilAllowed();
        return this.executeRequest<T>(options, retries - 1, minIntervalMs);
      }

      // Record pacing for every response — including errors — so that failed
      // requests (e.g. a rejected limit order) don't bypass the per-endpoint
      // minimum spacing and let a retry loop hammer the API into a 429.
      this.rateLimiter.noteResponse(response.headers);
      this.rateLimiter.noteMinimumInterval(minIntervalMs);

      if (!response.ok) {
        throw new T212Error(getErrorMessage(response.status, body), {
          status: response.status,
          body,
          rateLimit,
        });
      }

      return body as T;
    } catch (error) {
      if (error instanceof T212Error) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new T212Error("Request timed out", {
          status: 408,
          cause: error,
        });
      }

      throw new T212Error(
        error instanceof Error ? error.message : "Unknown request error",
        {
          status: 0,
          cause: error,
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(
    path: string,
    query?: PaginationQuery | PositionsQuery,
  ): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${this.basePath}${normalizedPath}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }
}

function encodeBase64(value: string): string {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }

  throw new Error("Base64 encoding is not available in this runtime");
}

function parseJson(text: string): T212ErrorBody | string {
  try {
    return JSON.parse(text) as T212ErrorBody;
  } catch {
    return text;
  }
}

function getErrorMessage(
  status: number,
  body: T212ErrorBody | string | null,
): string {
  if (typeof body === "string" && body.length > 0) {
    return body;
  }

  if (body && typeof body === "object") {
    if (typeof body.message === "string") {
      return body.message;
    }
    if (typeof body.error === "string") {
      return body.error;
    }
  }

  switch (status) {
    case 401:
      return "Unauthorized — check your API key and secret";
    case 403:
      return "Forbidden — your API key may lack the required scope";
    case 408:
      return "Request timeout";
    case 429:
      return "Rate limit exceeded";
    default:
      return `Request failed with status ${status}`;
  }
}

/** Documented Trading 212 minimum spacing — endpoints differ, not one global pace. */
function endpointMinIntervalMs(path: string, method: HttpMethod): number {
  if (method === "POST" && /\/equity\/orders\/market$/.test(path)) {
    return 1_200;
  }

  if (
    method === "POST" &&
    /\/equity\/orders\/(limit|stop|stop_limit)$/.test(path)
  ) {
    return 2_000;
  }

  if (method === "DELETE" && /\/equity\/orders\/\d+/.test(path)) {
    return 1_200;
  }

  if (path === "/equity/positions") {
    return 1_000;
  }

  if (path === "/equity/orders" || /\/equity\/orders\/\d+$/.test(path)) {
    return 1_000;
  }

  if (path === "/equity/account/summary") {
    return 5_000;
  }

  return 0;
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("x-ratelimit-limit");
  if (!limit) {
    return null;
  }

  return {
    limit: Number(limit),
    period: Number(headers.get("x-ratelimit-period") ?? 0),
    remaining: Number(headers.get("x-ratelimit-remaining") ?? 0),
    reset: Number(headers.get("x-ratelimit-reset") ?? 0),
    used: Number(headers.get("x-ratelimit-used") ?? 0),
  };
}

export function normalizeTimeValidity(
  timeValidity: "DAY" | "GTC" | "GOOD_TILL_CANCEL",
): "DAY" | "GOOD_TILL_CANCEL" {
  return timeValidity === "GTC" ? "GOOD_TILL_CANCEL" : timeValidity;
}

export function unwrapOrder(response: Order | { order: Order }): Order {
  if (
    typeof response === "object" &&
    response !== null &&
    "order" in response &&
    response.order
  ) {
    return response.order;
  }

  return response as Order;
}
