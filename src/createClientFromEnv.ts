import { T212 } from "./client";
import type { T212Environment } from "./types";

export function createClientFromEnv(): T212 {
  const apiKey = process.env.T212_API_KEY;
  const apiSecret = process.env.T212_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing T212_API_KEY or T212_API_SECRET. Copy .env.example to .env and fill in your credentials.",
    );
  }

  const environment: T212Environment =
    process.env.T212_ENVIRONMENT === "live" ? "live" : "demo";

  return new T212({ apiKey, apiSecret, environment });
}
