import { browserRequest } from "./browser";
import { getServicesBaseUrl } from "./servicesBaseUrl";
import type { T212Environment } from "../types";

type KeyStatType = "currency" | "number" | "percent";

interface KeyStatValue {
  value: number;
  type: KeyStatType;
  compact?: boolean;
  currency?: string;
}

interface KeyStatRow {
  title: string;
  value: KeyStatValue;
}

interface KeyStatsResponse {
  rows: KeyStatRow[];
  hasMore: boolean;
}

export interface KeyStats {
  marketCap: number | undefined;
  averageVolume: number | undefined;
  peRatio: number | undefined;
  dividendYield: number | undefined;
}

/** Key stats (market cap, average volume, P/E, dividend yield) for a ticker. */
export async function getKeyStats(
  ticker: string,
  environment: T212Environment,
): Promise<KeyStats> {
  const url = `${getServicesBaseUrl(environment)}/rest/company-details/v3/key-stats?ticker=${encodeURIComponent(ticker)}`;

  const body = await browserRequest<KeyStatsResponse>(url);

  if (!body.rows) {
    console.error(
      `[key-stats] unexpected response for ${ticker}:`,
      JSON.stringify(body, null, 2),
    );
    return {
      marketCap: undefined,
      averageVolume: undefined,
      peRatio: undefined,
      dividendYield: undefined,
    };
  }

  const find = (title: string) =>
    body.rows.find((r) => r.title === title)?.value.value;

  return {
    marketCap: find("companies.market-cap"),
    averageVolume: find("companies.average-volume"),
    peRatio: find("companies.pe-ratio"),
    dividendYield: find("companies.dividend-yield"),
  };
}
