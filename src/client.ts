import {
  HttpClient,
  normalizeTimeValidity,
  unwrapOrder,
} from "./http";
import {
  fetchAllPages,
  iterateAllItems,
  iteratePages,
} from "./pagination";
import type {
  AccountSummary,
  DuplicatePieRequest,
  EnqueuedReport,
  Exchange,
  HistoricalOrder,
  HistoryDividendItem,
  HistoryTransactionItem,
  LegacyAccountCash,
  LegacyAccountInfo,
  LimitOrderRequest,
  MarketOrderRequest,
  Order,
  PaginatedResponse,
  PaginationQuery,
  PieDetailed,
  PieRequest,
  PieSettings,
  Position,
  PositionsQuery,
  Report,
  RequestReportParams,
  StopLimitOrderRequest,
  StopOrderRequest,
  T212ClientOptions,
  TradableInstrument,
} from "./types";

export class T212 {
  readonly account: AccountResource;
  readonly orders: OrdersResource;
  readonly instruments: InstrumentsResource;
  readonly positions: PositionsResource;
  readonly history: HistoryResource;
  readonly pies: PiesResource;

  private readonly http: HttpClient;

  constructor(options: T212ClientOptions) {
    this.http = new HttpClient(options);
    this.account = new AccountResource(this.http);
    this.orders = new OrdersResource(this.http);
    this.instruments = new InstrumentsResource(this.http);
    this.positions = new PositionsResource(this.http);
    this.history = new HistoryResource(this.http);
    this.pies = new PiesResource(this.http);
  }

  /** Create a client instance. Alias for `new T212(options)`. */
  static create(options: T212ClientOptions): T212 {
    return new T212(options);
  }
}

class AccountResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/account/summary */
  getSummary(): Promise<AccountSummary> {
    return this.http.request<AccountSummary>({
      path: "/equity/account/summary",
    });
  }

  /**
   * Legacy endpoint retained for compatibility with older integrations.
   * GET /equity/account/info
   */
  getInfo(): Promise<LegacyAccountInfo> {
    return this.http.request<LegacyAccountInfo>({
      path: "/equity/account/info",
    });
  }

  /**
   * Legacy endpoint retained for compatibility with older integrations.
   * GET /equity/account/cash
   */
  getCash(): Promise<LegacyAccountCash> {
    return this.http.request<LegacyAccountCash>({
      path: "/equity/account/cash",
    });
  }
}

class OrdersResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/orders */
  list(): Promise<Order[]> {
    return this.http.request<Order[]>({ path: "/equity/orders" });
  }

  /** GET /equity/orders/{id} */
  get(id: number): Promise<Order> {
    return this.http.request<Order>({ path: `/equity/orders/${id}` });
  }

  /** POST /equity/orders/market */
  async placeMarket(request: MarketOrderRequest): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "POST",
      path: "/equity/orders/market",
      body: request,
    });

    return unwrapOrder(response);
  }

  /** POST /equity/orders/limit */
  async placeLimit(request: LimitOrderRequest): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "POST",
      path: "/equity/orders/limit",
      body: {
        ...request,
        timeValidity: normalizeTimeValidity(request.timeValidity),
      },
    });

    return unwrapOrder(response);
  }

  /** POST /equity/orders/stop */
  async placeStop(request: StopOrderRequest): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "POST",
      path: "/equity/orders/stop",
      body: {
        ...request,
        timeValidity: normalizeTimeValidity(request.timeValidity),
      },
    });

    return unwrapOrder(response);
  }

  /** POST /equity/orders/stop_limit */
  async placeStopLimit(request: StopLimitOrderRequest): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "POST",
      path: "/equity/orders/stop_limit",
      body: {
        ...request,
        timeValidity: normalizeTimeValidity(request.timeValidity),
      },
    });

    return unwrapOrder(response);
  }

  /** DELETE /equity/orders/{id} */
  async cancel(id: number): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "DELETE",
      path: `/equity/orders/${id}`,
    });

    return unwrapOrder(response);
  }
}

class InstrumentsResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/metadata/instruments */
  list(): Promise<TradableInstrument[]> {
    return this.http.request<TradableInstrument[]>({
      path: "/equity/metadata/instruments",
    });
  }

  /** GET /equity/metadata/exchanges */
  exchanges(): Promise<Exchange[]> {
    return this.http.request<Exchange[]>({
      path: "/equity/metadata/exchanges",
    });
  }

  async findByTicker(ticker: string): Promise<TradableInstrument | undefined> {
    const instruments = await this.list();
    return instruments.find((instrument) => instrument.ticker === ticker);
  }
}

class PositionsResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/positions */
  list(query?: PositionsQuery): Promise<Position[]> {
    return this.http.request<Position[]>({
      path: "/equity/positions",
      ...(query ? { query } : {}),
    });
  }
}

class HistoryResource {
  readonly exports: HistoryExportsResource;

  constructor(private readonly http: HttpClient) {
    this.exports = new HistoryExportsResource(http);
  }

  /** GET /equity/history/orders */
  orders(query?: PaginationQuery): Promise<PaginatedResponse<HistoricalOrder>> {
    return this.http.request<PaginatedResponse<HistoricalOrder>>({
      path: "/equity/history/orders",
      ...(query ? { query } : {}),
    });
  }

  /** Fetch every historical order page. */
  ordersAll(query?: PaginationQuery): Promise<HistoricalOrder[]> {
    return fetchAllPages<HistoricalOrder>(
      this.http,
      "/equity/history/orders",
      query,
    );
  }

  /** Iterate paginated historical order responses. */
  ordersPages(query?: PaginationQuery) {
    return iteratePages<HistoricalOrder>(
      this.http,
      "/equity/history/orders",
      query,
    );
  }

  /** Iterate every historical order item across all pages. */
  ordersItems(query?: PaginationQuery) {
    return iterateAllItems<HistoricalOrder>(
      this.http,
      "/equity/history/orders",
      query,
    );
  }

  /** GET /equity/history/dividends */
  dividends(
    query?: PaginationQuery,
  ): Promise<PaginatedResponse<HistoryDividendItem>> {
    return this.http.request<PaginatedResponse<HistoryDividendItem>>({
      path: "/equity/history/dividends",
      ...(query ? { query } : {}),
    });
  }

  dividendsAll(query?: PaginationQuery): Promise<HistoryDividendItem[]> {
    return fetchAllPages<HistoryDividendItem>(
      this.http,
      "/equity/history/dividends",
      query,
    );
  }

  dividendsItems(query?: PaginationQuery) {
    return iterateAllItems<HistoryDividendItem>(
      this.http,
      "/equity/history/dividends",
      query,
    );
  }

  /** GET /equity/history/transactions */
  transactions(
    query?: PaginationQuery,
  ): Promise<PaginatedResponse<HistoryTransactionItem>> {
    return this.http.request<PaginatedResponse<HistoryTransactionItem>>({
      path: "/equity/history/transactions",
      ...(query ? { query } : {}),
    });
  }

  transactionsAll(query?: PaginationQuery): Promise<HistoryTransactionItem[]> {
    return fetchAllPages<HistoryTransactionItem>(
      this.http,
      "/equity/history/transactions",
      query,
    );
  }

  transactionsItems(query?: PaginationQuery) {
    return iterateAllItems<HistoryTransactionItem>(
      this.http,
      "/equity/history/transactions",
      query,
    );
  }
}

class HistoryExportsResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/history/exports */
  list(): Promise<Report[]> {
    return this.http.request<Report[]>({
      path: "/equity/history/exports",
    });
  }

  /** POST /equity/history/exports */
  request(params: RequestReportParams): Promise<EnqueuedReport> {
    return this.http.request<EnqueuedReport>({
      method: "POST",
      path: "/equity/history/exports",
      body: params,
    });
  }
}

/** @deprecated Pies API is deprecated by Trading 212. */
class PiesResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/pies */
  list(): Promise<PieSettings[]> {
    return this.http.request<PieSettings[]>({ path: "/equity/pies" });
  }

  /** GET /equity/pies/{id} */
  get(id: number): Promise<PieDetailed> {
    return this.http.request<PieDetailed>({ path: `/equity/pies/${id}` });
  }

  /** POST /equity/pies */
  create(request: PieRequest): Promise<PieSettings> {
    return this.http.request<PieSettings>({
      method: "POST",
      path: "/equity/pies",
      body: request,
    });
  }

  /** POST /equity/pies/{id} */
  update(id: number, request: PieRequest): Promise<PieSettings> {
    return this.http.request<PieSettings>({
      method: "POST",
      path: `/equity/pies/${id}`,
      body: request,
    });
  }

  /** DELETE /equity/pies/{id} */
  delete(id: number): Promise<void> {
    return this.http.request<void>({
      method: "DELETE",
      path: `/equity/pies/${id}`,
    });
  }

  /** POST /equity/pies/{id}/duplicate */
  duplicate(id: number, request: DuplicatePieRequest): Promise<PieSettings> {
    return this.http.request<PieSettings>({
      method: "POST",
      path: `/equity/pies/${id}/duplicate`,
      body: request,
    });
  }
}
