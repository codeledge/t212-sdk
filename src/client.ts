import { HttpClient, normalizeTimeValidity, unwrapOrder } from "./http";
import { fetchAllPages } from "./pagination";
import { isExchangeOpen, isWorkingScheduleOpen } from "./lib/isExchangeOpen";
import type {
  AccountSummary,
  EnqueuedReport,
  Exchange,
  HistoricalOrder,
  HistoryDividendItem,
  HistoryTransactionItem,
  LimitOrderRequest,
  MarketOrderRequest,
  Order,
  OrdersFilter,
  PaginatedResponse,
  PaginationQuery,
  Position,
  PositionsQuery,
  Report,
  RequestReportParams,
  StopLimitOrderRequest,
  StopOrderRequest,
  T212ClientOptions,
  Ticker,
  TradableInstrument,
} from "./types";

export class T212 {
  readonly account: AccountResource;
  readonly openOrder: OpenOrderResource;
  readonly closedOrder: ClosedOrderResource;
  readonly instrument: InstrumentResource;
  readonly exchange: ExchangeResource;
  readonly position: PositionResource;
  readonly dividend: DividendResource;
  readonly transaction: TransactionResource;
  readonly export: ExportResource;

  private readonly http: HttpClient;

  constructor(options: T212ClientOptions) {
    this.http = new HttpClient(options);
    this.account = new AccountResource(this.http);
    this.openOrder = new OpenOrderResource(this.http);
    this.closedOrder = new ClosedOrderResource(this.http);
    this.exchange = new ExchangeResource(this.http);
    this.instrument = new InstrumentResource(this.http, this.exchange);
    this.position = new PositionResource(this.http);
    this.dividend = new DividendResource(this.http);
    this.transaction = new TransactionResource(this.http);
    this.export = new ExportResource(this.http);
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
}

class OpenOrderResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/orders — currently open/pending orders. */
  async getMany(filter?: OrdersFilter): Promise<Order[]> {
    const orders = await this.http.request<Order[]>({ path: "/equity/orders" });
    if (!filter) return orders;
    return orders.filter(
      (o) =>
        (filter.ticker === undefined || o.ticker === filter.ticker) &&
        (filter.type === undefined || o.type === filter.type) &&
        (filter.side === undefined || o.side === filter.side) &&
        (filter.status === undefined || o.status === filter.status) &&
        (filter.strategy === undefined || o.strategy === filter.strategy),
    );
  }

  getOne(id: number): Promise<Order> {
    return this.http.request<Order>({ path: `/equity/orders/${id}` });
  }

  async createMarket(request: MarketOrderRequest): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "POST",
      path: "/equity/orders/market",
      body: request,
    });

    return unwrapOrder(response);
  }

  async createLimit(request: LimitOrderRequest): Promise<Order> {
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

  async createStop(request: StopOrderRequest): Promise<Order> {
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

  async createStopLimit(request: StopLimitOrderRequest): Promise<Order> {
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

  async cancel(id: number): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "DELETE",
      path: `/equity/orders/${id}`,
    });

    return unwrapOrder(response);
  }

  async cancelMany({ ids }: { ids: number[] }): Promise<Order[]> {
    return Promise.all(ids.map((id) => this.cancel(id)));
  }
}

class ClosedOrderResource {
  constructor(private readonly http: HttpClient) {}

  getMany(query?: Pick<PaginationQuery, "ticker">): Promise<HistoricalOrder[]> {
    return fetchAllPages<HistoricalOrder>(
      this.http,
      "/equity/history/orders",
      query,
    );
  }
}

class InstrumentResource {
  constructor(
    private readonly http: HttpClient,
    private readonly exchangeResource: ExchangeResource,
  ) {}

  async getMany(options?: {
    isExchangeOpen?: boolean;
    exchangeId?: number;
  }): Promise<TradableInstrument[]> {
    const instruments = await this.http.request<TradableInstrument[]>({
      path: "/equity/metadata/instruments",
    });

    let filteredInstruments = instruments;
    const needsExchanges = options?.exchangeId || options?.isExchangeOpen;
    const exchanges = needsExchanges
      ? await this.exchangeResource.getMany()
      : undefined;

    if (options?.exchangeId) {
      const exchange = exchanges?.find(
        (item) => item.id === options.exchangeId,
      );
      const exchangeScheduleIds = new Set(
        exchange?.workingSchedules.map((schedule) => schedule.id) ?? [],
      );

      filteredInstruments = filteredInstruments.filter((instrument) =>
        exchangeScheduleIds.has(instrument.workingScheduleId),
      );
    }

    if (options?.isExchangeOpen) {
      const scheduleById = new Map(
        exchanges!
          .flatMap((exchange) => exchange.workingSchedules)
          .map((schedule) => [schedule.id, schedule] as const),
      );

      filteredInstruments = filteredInstruments.filter((instrument) => {
        const schedule = scheduleById.get(instrument.workingScheduleId);
        return (
          schedule !== undefined &&
          isWorkingScheduleOpen(schedule) === options.isExchangeOpen
        );
      });
    }

    return filteredInstruments;
  }

  async getOne(
    query: { ticker: Ticker } | { name: string } | { id: string },
  ): Promise<TradableInstrument | undefined> {
    const instruments = await this.getMany();
    return instruments.find((instrument) =>
      "ticker" in query
        ? instrument.ticker === query.ticker
        : "name" in query
          ? instrument.name === query.name
          : instrument.id === query.id,
    );
  }
}

class ExchangeResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/metadata/exchanges */
  async getMany(options?: { isOpen?: boolean }): Promise<Exchange[]> {
    const exchanges = await this.http.request<Exchange[]>({
      path: "/equity/metadata/exchanges",
    });

    if (options?.isOpen === undefined) return exchanges;
    return exchanges.filter(
      (exchange) => isExchangeOpen(exchange) === options.isOpen,
    );
  }

  async getOne(
    query: { id: number } | { name: string },
  ): Promise<Exchange | undefined> {
    const exchanges = await this.getMany();
    return exchanges.find((exchange) =>
      "id" in query ? exchange.id === query.id : exchange.name === query.name,
    );
  }
}

class PositionResource {
  constructor(private readonly http: HttpClient) {}

  /** GET /equity/positions */
  getMany(query?: PositionsQuery): Promise<Position[]> {
    return this.http.request<Position[]>({
      path: "/equity/positions",
      ...(query ? { query } : {}),
    });
  }

  async getOne(query: { ticker: Ticker }): Promise<Position | undefined> {
    const positions = await this.getMany(query);
    return positions.find((p) => p.instrument.ticker === query.ticker);
  }
}

class DividendResource {
  constructor(private readonly http: HttpClient) {}

  getMany(query?: PaginationQuery): Promise<HistoryDividendItem[]> {
    return fetchAllPages<HistoryDividendItem>(
      this.http,
      "/equity/history/dividends",
      query,
    );
  }
}

class TransactionResource {
  constructor(private readonly http: HttpClient) {}

  getMany(query?: PaginationQuery): Promise<HistoryTransactionItem[]> {
    return fetchAllPages<HistoryTransactionItem>(
      this.http,
      "/equity/history/transactions",
      query,
    );
  }
}

class ExportResource {
  constructor(private readonly http: HttpClient) {}

  getReports(): Promise<Report[]> {
    return this.http.request<Report[]>({
      path: "/equity/history/exports",
    });
  }

  enqueueReport(params: RequestReportParams): Promise<EnqueuedReport> {
    return this.http.request<EnqueuedReport>({
      method: "POST",
      path: "/equity/history/exports",
      body: params,
    });
  }
}
