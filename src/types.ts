/** Trading environment. */
export type T212Environment = "demo" | "live";

/** ISO 4217 currency code. */
export type CurrencyCode = string;

/** Instrument ticker, e.g. `AAPL_US_EQ`. */
export type Ticker = string;

export type OrderSide = "BUY" | "SELL";

export type OrderStatus =
  | "LOCAL"
  | "UNCONFIRMED"
  | "CONFIRMED"
  | "NEW"
  | "CANCELLING"
  | "CANCELLED"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "REJECTED"
  | "REPLACING"
  | "REPLACED";

export type OrderType = "LIMIT" | "STOP" | "MARKET" | "STOP_LIMIT";

export type OrderStrategy = "QUANTITY" | "VALUE";

export type OrderInitiatedFrom =
  | "API"
  | "IOS"
  | "ANDROID"
  | "WEB"
  | "SYSTEM"
  | "AUTOINVEST"
  | "INSTRUMENT_AUTOINVEST";

/** Active time for limit/stop orders when placing via the API. */
export type TimeValidity = "DAY" | "GTC" | "GOOD_TILL_CANCEL";

/** Time in force returned on order objects. */
export type TimeInForce = "DAY" | "GOOD_TILL_CANCEL";

export type InstrumentType =
  | "CRYPTOCURRENCY"
  | "ETF"
  | "FOREX"
  | "FUTURES"
  | "INDEX"
  | "STOCK"
  | "WARRANT"
  | "CRYPTO"
  | "CVR"
  | "CORPACT";

export type FillType =
  | "TRADE"
  | "STOCK_SPLIT"
  | "STOCK_DISTRIBUTION"
  | "FOP"
  | "FOP_CORRECTION"
  | "CUSTOM_STOCK_DISTRIBUTION"
  | "EQUITY_RIGHTS"
  | "SCRIP_STOCK_DIVIDENDS"
  | "STOCK_DIVIDENDS"
  | "STOCK_ACQUISITION"
  | "CASH_AND_STOCK_ACQUISITION"
  | "SPIN_OFF";

export type TradingMethod = "TOTV" | "OTC";

export type TaxName =
  | "COMMISSION_TURNOVER"
  | "CURRENCY_CONVERSION_FEE"
  | "FINRA_FEE"
  | "FRENCH_TRANSACTION_TAX"
  | "PTM_LEVY"
  | "STAMP_DUTY"
  | "STAMP_DUTY_RESERVE_TAX"
  | "TRANSACTION_FEE";

export type TransactionType = "WITHDRAW" | "DEPOSIT" | "FEE" | "TRANSFER";

export type ReportStatus =
  | "Queued"
  | "Processing"
  | "Running"
  | "Canceled"
  | "Failed"
  | "Finished";

export type DividendCashAction = "REINVEST" | "TO_ACCOUNT_CASH";

export type PieStatus = "AHEAD" | "ON_TRACK" | "BEHIND";

export type TimeEventType =
  | "OPEN"
  | "CLOSE"
  | "BREAK_START"
  | "BREAK_END"
  | "PRE_MARKET_OPEN"
  | "AFTER_HOURS_OPEN"
  | "AFTER_HOURS_CLOSE"
  | "OVERNIGHT_OPEN";

export interface Instrument {
  ticker: Ticker;
  name: string;
  isin: string;
  currency: CurrencyCode;
}

export interface TradableInstrument {
  ticker: Ticker;
  name: string;
  shortName: string;
  isin: string;
  currencyCode: CurrencyCode;
  type: InstrumentType;
  addedOn: string;
  maxOpenQuantity: number;
  minTradeQuantity?: number;
  extendedHours?: boolean;
  workingScheduleId: number;
  /** Legacy field name used by older API responses. */
  id?: string;
}

export interface TimeEvent {
  date: string;
  type: TimeEventType;
}

export interface WorkingSchedule {
  id: number;
  timeEvents: TimeEvent[];
}

export interface Exchange {
  id: number;
  name: string;
  workingSchedules: WorkingSchedule[];
}

export interface Cash {
  availableToTrade: number;
  inPies: number;
  reservedForOrders: number;
}

export interface Investments {
  currentValue: number;
  realizedProfitLoss: number;
  totalCost: number;
  unrealizedProfitLoss: number;
}

export interface AccountSummary {
  id: number;
  currency: CurrencyCode;
  totalValue: number;
  cash: Cash;
  investments: Investments;
}

/** Legacy account info endpoint (`/equity/account/info`). */
export interface LegacyAccountInfo {
  id: number;
  currencyCode: CurrencyCode;
}

/** Legacy cash endpoint (`/equity/account/cash`). */
export interface LegacyAccountCash {
  free: number;
  total: number;
  ppl: number;
  result: number;
  invested: number;
  pieCash: number;
  blocked: boolean | null;
}

export interface Order {
  id: number;
  ticker: Ticker;
  status: OrderStatus;
  type: OrderType;
  quantity?: number;
  side?: OrderSide;
  strategy?: OrderStrategy;
  currency?: CurrencyCode;
  createdAt?: string;
  extendedHours?: boolean;
  filledQuantity?: number;
  filledValue?: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  timeInForce?: TimeInForce;
  value?: number;
  initiatedFrom?: OrderInitiatedFrom;
  instrument?: Instrument;

  /** Legacy fields from older API responses. */
  creationTime?: string;
  dateExecuted?: string | null;
  dateModified?: string;
  executor?: string;
  fillCost?: number | null;
  fillId?: number;
  fillPrice?: number;
  fillResult?: string | null;
  fillType?: string;
  orderedQuantity?: number;
  orderedValue?: number | null;
  parentOrder?: number;
  taxes?: Tax[];
  timeValidity?: string | null;
}

export interface Tax {
  name: TaxName | string;
  quantity: number;
  currency: CurrencyCode;
  chargedAt: string;
}

export interface FillWalletImpact {
  currency: CurrencyCode;
  netValue: number;
  fxRate: number;
  realisedProfitLoss?: number;
  taxes: Tax[];
}

export interface Fill {
  id: number;
  quantity: number;
  price: number;
  type: FillType | string;
  tradingMethod: TradingMethod | null;
  filledAt: string;
  walletImpact: FillWalletImpact;
}

export interface HistoricalOrder {
  order: Order;
  fill?: Fill;
}

export interface PositionWalletImpact {
  currency: CurrencyCode;
  totalCost: number;
  currentValue: number;
  unrealizedProfitLoss: number;
  fxImpact: number;
}

export interface Position {
  instrument: Instrument;
  quantity: number;
  quantityAvailableForTrading: number;
  quantityInPies: number;
  currentPrice: number;
  averagePricePaid: number;
  createdAt: string;
  walletImpact: PositionWalletImpact;
}

export interface HistoryDividendItem {
  ticker: Ticker;
  tickerCurrency: CurrencyCode;
  currency: CurrencyCode;
  amount: number;
  amountInEuro?: number;
  grossAmountPerShare: number;
  quantity: number;
  paidOn: string;
  reference: string;
  type: string;
  instrument?: Instrument;
}

export interface HistoryTransactionItem {
  reference: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  dateTime: string;
}

export interface ReportDataIncluded {
  includeOrders?: boolean;
  includeTransactions?: boolean;
  includeDividends?: boolean;
  includeInterest?: boolean;
}

export interface Report {
  reportId: number;
  status: ReportStatus;
  downloadLink?: string;
  timeFrom?: string;
  timeTo?: string;
  dataIncluded?: ReportDataIncluded;
}

export interface EnqueuedReport {
  reportId: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPagePath: string | null;
}

export interface RateLimitInfo {
  limit: number;
  period: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface MarketOrderRequest {
  ticker: Ticker;
  /** Positive for buy, negative for sell. */
  quantity: number;
  extendedHours?: boolean;
}

export interface LimitOrderRequest {
  ticker: Ticker;
  quantity: number;
  limitPrice: number;
  timeValidity: TimeValidity;
}

export interface StopOrderRequest {
  ticker: Ticker;
  quantity: number;
  stopPrice: number;
  timeValidity: TimeValidity;
}

export interface StopLimitOrderRequest {
  ticker: Ticker;
  quantity: number;
  stopPrice: number;
  limitPrice: number;
  timeValidity: TimeValidity;
}

export interface PositionsQuery {
  ticker?: Ticker;
}

export interface PaginationQuery {
  limit?: number;
  cursor?: string | number;
  ticker?: Ticker;
}

export interface RequestReportParams {
  timeFrom: string;
  timeTo: string;
  dataIncluded?: ReportDataIncluded;
}

export interface PieInstrumentShares {
  [ticker: string]: number;
}

export interface PieRequest {
  name: string;
  icon: string;
  instrumentShares: PieInstrumentShares;
  goal?: number;
  endDate?: string;
  dividendCashAction?: DividendCashAction;
}

export interface PieSettings {
  id: number;
  name: string;
  icon: string;
  goal?: number;
  endDate?: string;
  creationDate?: string;
  dividendCashAction?: DividendCashAction;
  initialInvestment?: number;
  instrumentShares?: PieInstrumentShares;
  publicUrl?: string;
}

export interface PieResult {
  id: number;
  cash?: number;
  progress?: number;
  status?: PieStatus;
  result?: InvestmentResult;
  dividendDetails?: DividendDetails;
}

export interface InvestmentResult {
  priceAvgValue?: number;
  priceAvgInvestedValue?: number;
  priceAvgResult?: number;
  priceAvgResultCoef?: number;
}

export interface DividendDetails {
  gained?: number;
  inCash?: number;
  reinvested?: number;
}

export interface PieDetailed extends PieSettings {
  instruments?: PieInstrumentResult[];
}

export interface PieInstrumentResult {
  ticker: Ticker;
  currentShare?: number;
  expectedShare?: number;
  ownedQuantity?: number;
  result?: InvestmentResult;
  issues?: InstrumentIssue[];
}

export interface InstrumentIssue {
  name: string;
  severity: "IRREVERSIBLE" | "REVERSIBLE" | "INFORMATIVE";
}

export interface DuplicatePieRequest {
  name: string;
  icon: string;
}

export interface T212ClientOptions {
  apiKey: string;
  apiSecret: string;
  /** @default "demo" */
  environment?: T212Environment;
  /** Custom fetch implementation. Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds. @default 30000 */
  timeout?: number;
  /** API base path. @default "/api/v0" */
  basePath?: string;
}

export interface T212ErrorBody {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export type CandleInterval =
  | "ONE_MINUTE"
  | "FIVE_MINUTES"
  | "TEN_MINUTES"
  | "FIFTEEN_MINUTES"
  | "THIRTY_MINUTES"
  | "ONE_HOUR"
  | "FOUR_HOURS"
  | "ONE_DAY"
  | "ONE_WEEK"
  | "ONE_MONTH";

export type SessionType = "regular" | "pre" | "after";

export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  range: number;
  rangePct: number;
  sessionType?: SessionType;
  interval?: CandleInterval;
}
