import type { T212Environment } from "../types";
import { resolveTrading212Origin } from "./urlGuards";

const SERVICES_BASE_URL: Record<T212Environment, string> = {
  DEMO: "https://demo.services.trading212.com",
  LIVE: "https://live.services.trading212.com",
};

/**
 * Base URL for Trading 212's internal `*.services.trading212.com` endpoints.
 * Override globally via `T212_SERVICES_BASE_URL`; otherwise resolved from
 * `environment` — never hardcoded to demo regardless of the client's
 * configured environment.
 */
export function getServicesBaseUrl(environment: T212Environment): string {
  const override = process.env.T212_SERVICES_BASE_URL;
  if (!override) {
    return SERVICES_BASE_URL[environment];
  }

  return resolveTrading212Origin(override, "T212_SERVICES_BASE_URL");
}
