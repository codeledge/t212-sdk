import { HttpClient, normalizeTimeValidity, unwrapOrder } from "./http";
import { isSameDay } from "date-fns";
import { fetchAllPages } from "./pagination";
import { isExchangeOpen, isWorkingScheduleOpen } from "./lib/isExchangeOpen";
import { getHistoricalOrderTimestamp } from "./lib/getHistoricalOrderTimestamp";
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
  OrderSide,
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
  private readonly http: HttpClient;

  constructor(options: T212ClientOptions) {
    this.http = new HttpClient(options);
  }

  /** Create a client instance. Alias for `new T212(options)`. */
  static create(options: T212ClientOptions): T212 {
    return new T212(options);
  }

  /** GET /equity/account/summary */
  getAccountSummary(): Promise<AccountSummary> {
    return this.http.request<AccountSummary>({
      path: "/equity/account/summary",
    });
  }

  /** GET /equity/orders — currently open/pending orders. */
  async getOpenOrders(filter?: OrdersFilter): Promise<Order[]> {
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

  getOpenOrder(id: number): Promise<Order> {
    return this.http.request<Order>({ path: `/equity/orders/${id}` });
  }

  async createMarketOrder(request: MarketOrderRequest): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "POST",
      path: "/equity/orders/market",
      body: request,
    });

    return unwrapOrder(response);
  }

  async createSellMarketOrder(request: MarketOrderRequest): Promise<Order> {
    return this.createMarketOrder({
      ...request,
      quantity: -Math.abs(request.quantity),
    });
  }

  async createBuyMarketOrder(request: MarketOrderRequest): Promise<Order> {
    return this.createMarketOrder({
      ...request,
      quantity: Math.abs(request.quantity),
    });
  }

  async createLimitOrder(request: LimitOrderRequest): Promise<Order> {
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

  async createSellLimitOrder(request: LimitOrderRequest): Promise<Order> {
    return this.createLimitOrder({
      ...request,
      quantity: -Math.abs(request.quantity),
    });
  }

  async createBuyLimitOrder(request: LimitOrderRequest): Promise<Order> {
    return this.createLimitOrder({
      ...request,
      quantity: Math.abs(request.quantity),
    });
  }

  async createStopOrder(request: StopOrderRequest): Promise<Order> {
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

  async createStopLimitOrder(request: StopLimitOrderRequest): Promise<Order> {
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

  async cancelOpenOrder(id: number): Promise<Order> {
    const response = await this.http.request<Order | { order: Order }>({
      method: "DELETE",
      path: `/equity/orders/${id}`,
    });

    return unwrapOrder(response);
  }

  async cancelOpenOrders(
    options?: { ids: number[] } | OrdersFilter,
  ): Promise<Order[]> {
    const ids =
      options && "ids" in options
        ? options.ids
        : (await this.getOpenOrders(options)).map((order) => order.id);

    return Promise.all(ids.map((id) => this.cancelOpenOrder(id)));
  }

  getClosedOrders(query?: {
    ticker?: Ticker;
    side?: OrderSide;
    timeframe?: "TODAY";
  }): Promise<HistoricalOrder[]> {
    const { timeframe, side, ...paginationQuery } = query ?? {};
    return fetchAllPages<HistoricalOrder>(
      this.http,
      "/equity/history/orders",
      paginationQuery,
      {
        ...(side
          ? {
              includeWhen: (historicalOrder) =>
                historicalOrder.order.side === side,
            }
          : {}),
        ...(timeframe === "TODAY"
          ? {
              stopWhen: (historicalOrder) =>
                !isHistoricalOrderFromToday(historicalOrder),
            }
          : {}),
      },
    );
  }

  async getInstruments(options?: {
    isExchangeOpen?: boolean;
    exchangeId?: number;
    type?: TradableInstrument["type"];
  }): Promise<TradableInstrument[]> {
    const instruments = await this.http.request<TradableInstrument[]>({
      path: "/equity/metadata/instruments",
    });

    let filteredInstruments = instruments;
    if (options?.type !== undefined) {
      filteredInstruments = filteredInstruments.filter(
        (instrument) => instrument.type === options.type,
      );
    }

    const needsExchanges =
      options?.exchangeId !== undefined ||
      options?.isExchangeOpen !== undefined;
    const exchanges = needsExchanges ? await this.getExchanges() : undefined;

    if (options?.exchangeId !== undefined) {
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

    if (options?.isExchangeOpen !== undefined) {
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

  async getInstrument(
    query: { ticker: Ticker } | { name: string } | { id: string },
  ): Promise<TradableInstrument | undefined> {
    const instruments = await this.getInstruments();
    return instruments.find((instrument) =>
      "ticker" in query
        ? instrument.ticker === query.ticker
        : "name" in query
          ? instrument.name === query.name
          : instrument.id === query.id,
    );
  }

  /** GET /equity/metadata/exchanges */
  async getExchanges(options?: { isOpen?: boolean }): Promise<Exchange[]> {
    const exchanges = await this.http.request<Exchange[]>({
      path: "/equity/metadata/exchanges",
    });

    if (options?.isOpen === undefined) return exchanges;
    return exchanges.filter(
      (exchange) => isExchangeOpen(exchange) === options.isOpen,
    );
  }

  async getExchange(
    query: { id: number } | { name: string },
  ): Promise<Exchange | undefined> {
    const exchanges = await this.getExchanges();
    return exchanges.find((exchange) =>
      "id" in query ? exchange.id === query.id : exchange.name === query.name,
    );
  }

  /** GET /equity/positions */
  getPositions(query?: PositionsQuery): Promise<Position[]> {
    return this.http.request<Position[]>({
      path: "/equity/positions",
      ...(query ? { query } : {}),
    });
  }

  async getPosition(query: { ticker: Ticker }): Promise<Position | undefined> {
    const positions = await this.getPositions(query);
    return positions.find((p) => p.instrument.ticker === query.ticker);
  }

  async closePosition(query: { ticker: Ticker }): Promise<void> {
    const position = await this.getPosition(query);
    if (!position) return undefined;
    await this.cancelOpenOrders({
      ticker: query.ticker,
      side: "SELL",
    });
    await this.createSellMarketOrder({
      ticker: query.ticker,
      quantity: position.quantity,
    });
  }

  getDividends(query?: PaginationQuery): Promise<HistoryDividendItem[]> {
    return fetchAllPages<HistoryDividendItem>(
      this.http,
      "/equity/history/dividends",
      query,
    );
  }

  getTransactions(query?: PaginationQuery): Promise<HistoryTransactionItem[]> {
    return fetchAllPages<HistoryTransactionItem>(
      this.http,
      "/equity/history/transactions",
      query,
    );
  }

  getExportReports(): Promise<Report[]> {
    return this.http.request<Report[]>({
      path: "/equity/history/exports",
    });
  }

  enqueueExportReport(params: RequestReportParams): Promise<EnqueuedReport> {
    return this.http.request<EnqueuedReport>({
      method: "POST",
      path: "/equity/history/exports",
      body: params,
    });
  }
}

function isHistoricalOrderFromToday(order: HistoricalOrder): boolean {
  const timestamp = getHistoricalOrderTimestamp(order);
  if (!timestamp) {
    return false;
  }

  return isSameDay(new Date(timestamp), new Date());
}
