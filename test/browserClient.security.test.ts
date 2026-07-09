import { describe, expect, it } from "bun:test";
import { getServicesBaseUrl } from "../src/browserClient/servicesBaseUrl";
import {
  isTrustedTrading212Url,
  resolveLoopbackCdpUrl,
  resolveTrading212Origin,
  resolveTrading212RequestUrl,
} from "../src/browserClient/urlGuards";

describe("browser client URL guards", () => {
  it("accepts Trading 212 request URLs", () => {
    expect(
      resolveTrading212RequestUrl(
        "https://demo.services.trading212.com/charting/v1/ohlc/ONE_MINUTE?ticker=AAPL_US_EQ",
      ),
    ).toBe(
      "https://demo.services.trading212.com/charting/v1/ohlc/ONE_MINUTE?ticker=AAPL_US_EQ",
    );
  });

  it("rejects non-Trading 212 request URLs", () => {
    expect(() =>
      resolveTrading212RequestUrl("https://example.com/charting/v1/ohlc"),
    ).toThrow("Browser request URL must target a trading212.com host");
  });

  it("rejects non-https browser request URLs", () => {
    expect(() =>
      resolveTrading212RequestUrl("http://app.trading212.com/rest/v1/foo"),
    ).toThrow("Browser request URL must use https");
  });

  it("accepts Trading 212 origins with no extra path components", () => {
    expect(
      resolveTrading212Origin(
        "https://live.services.trading212.com",
        "T212_SERVICES_BASE_URL",
      ),
    ).toBe("https://live.services.trading212.com");
  });

  it("rejects origin overrides with paths", () => {
    expect(() =>
      resolveTrading212Origin(
        "https://app.trading212.com/internal",
        "T212_APP_ORIGIN",
      ),
    ).toThrow("T212_APP_ORIGIN must not include a path, query, or fragment");
  });

  it("allows only loopback CDP URLs", () => {
    expect(resolveLoopbackCdpUrl("http://localhost:9222")).toBe(
      "http://localhost:9222/",
    );
    expect(resolveLoopbackCdpUrl("ws://127.0.0.1:9222/devtools/browser/abc")).toBe(
      "ws://127.0.0.1:9222/devtools/browser/abc",
    );
    expect(() => resolveLoopbackCdpUrl("http://example.com:9222")).toThrow(
      "T212_CDP_URL must target localhost or another loopback host",
    );
  });

  it("recognizes trusted Trading 212 page URLs", () => {
    expect(isTrustedTrading212Url("https://app.trading212.com")).toBe(true);
    expect(isTrustedTrading212Url("https://eviltrading212.com")).toBe(false);
    expect(isTrustedTrading212Url("about:blank")).toBe(false);
  });
});

describe("services base URL override", () => {
  it("uses the environment default when no override is set", () => {
    const previous = process.env.T212_SERVICES_BASE_URL;
    delete process.env.T212_SERVICES_BASE_URL;

    try {
      expect(getServicesBaseUrl("DEMO")).toBe(
        "https://demo.services.trading212.com",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.T212_SERVICES_BASE_URL;
      } else {
        process.env.T212_SERVICES_BASE_URL = previous;
      }
    }
  });

  it("rejects non-Trading 212 overrides", () => {
    const previous = process.env.T212_SERVICES_BASE_URL;
    process.env.T212_SERVICES_BASE_URL = "https://example.com";

    try {
      expect(() => getServicesBaseUrl("LIVE")).toThrow(
        "T212_SERVICES_BASE_URL must target a trading212.com host",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.T212_SERVICES_BASE_URL;
      } else {
        process.env.T212_SERVICES_BASE_URL = previous;
      }
    }
  });
});
