import { T212 } from "../src/index";

const REQUIRED_ENV = ["T212_API_KEY", "T212_API_SECRET"] as const;

export function getMissingEnvVars(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

export function createTestClient(): T212 {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (process.env.T212_ENVIRONMENT === "LIVE") {
    console.warn(
      "[t212 tests] T212_ENVIRONMENT=LIVE is ignored — integration tests always use DEMO",
    );
  }

  return new T212({
    apiKey: process.env.T212_API_KEY!,
    apiSecret: process.env.T212_API_SECRET!,
    environment: "DEMO",
  });
}

export function getTestTicker(): string {
  return process.env.T212_TEST_TICKER ?? "AAPL_US_EQ";
}
