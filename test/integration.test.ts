import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Order } from "../src/index";
import { T212, T212Error } from "../src/index";
import {
  createTestClient,
  getMissingEnvVars,
  getTestTicker,
} from "./helpers";

const hasCredentials = getMissingEnvVars().length === 0;
const describeIntegration = hasCredentials ? describe : describe.skip;

describeIntegration("t212 integration (demo only)", () => {
  let client: T212;
  const ticker = getTestTicker();

  let placedOrderId: number | undefined;

  beforeAll(() => {
    client = createTestClient();
  });

  afterAll(async () => {
    if (placedOrderId === undefined) {
      return;
    }

    try {
      await client.orders.cancel(placedOrderId);
    } catch (error) {
      if (
        error instanceof T212Error &&
        (error.status === 404 || error.status === 400)
      ) {
        return;
      }

      throw error;
    }
  });

  describe("read operations", () => {
    it("gets account summary", async () => {
      const summary = await client.account.getSummary();

      expect(summary.id).toBeTypeOf("number");
      expect(summary.currency).toBeTruthy();
      expect(summary.cash.availableToTrade).toBeTypeOf("number");
      expect(summary.investments.currentValue).toBeTypeOf("number");
    });

    it("gets legacy account info", async () => {
      const info = await client.account.getInfo();

      expect(info.id).toBeTypeOf("number");
      expect(info.currencyCode).toBeTruthy();
    });

    it("gets legacy account cash", async () => {
      const cash = await client.account.getCash();

      expect(cash.free).toBeTypeOf("number");
      expect(cash.total).toBeTypeOf("number");
    });

    it("lists instruments and finds the test ticker", async () => {
      const instruments = await client.instruments.list();

      expect(instruments.length).toBeGreaterThan(0);

      const instrument = await client.instruments.findByTicker(ticker);
      expect(instrument?.ticker).toBe(ticker);
    });

    it("lists exchanges", async () => {
      const exchanges = await client.instruments.exchanges();

      expect(exchanges.length).toBeGreaterThan(0);
      expect(exchanges[0]?.id).toBeTypeOf("number");
      expect(exchanges[0]?.name).toBeTruthy();
    });

    it("lists open positions", async () => {
      const positions = await client.positions.list();

      expect(Array.isArray(positions)).toBe(true);
    });

    it("lists pending orders", async () => {
      const orders = await client.orders.list();

      expect(Array.isArray(orders)).toBe(true);
    });

    it("reads paginated order history", async () => {
      const page = await client.history.orders({ limit: 5 });

      expect(Array.isArray(page.items)).toBe(true);
      expect(
        page.nextPagePath === null || typeof page.nextPagePath === "string",
      ).toBe(true);
    });

    it("reads paginated dividend history", async () => {
      const page = await client.history.dividends({ limit: 5 });

      expect(Array.isArray(page.items)).toBe(true);
    });

    it("reads paginated transaction history", async () => {
      const page = await client.history.transactions({ limit: 5 });

      expect(Array.isArray(page.items)).toBe(true);
    });

    it("lists export reports", async () => {
      const reports = await client.history.exports.list();

      expect(Array.isArray(reports)).toBe(true);
    });
  });

  describe("write operations", () => {
    it("places a far OTM limit order, reads it, then cancels it", async () => {
      const order = await client.orders.placeLimit({
        ticker,
        quantity: 0.01,
        limitPrice: 0.01,
        timeValidity: "DAY",
      });

      placedOrderId = order.id;

      expect(order.id).toBeTypeOf("number");
      expect(order.ticker).toBe(ticker);
      expect(order.type).toBe("LIMIT");

      const fetched = await client.orders.get(order.id);
      expect(fetched.id).toBe(order.id);

      const openOrders = await client.orders.list();
      expect(openOrders.some((item: Order) => item.id === order.id)).toBe(true);

      const cancelled = await client.orders.cancel(order.id);
      expect(cancelled.id).toBe(order.id);

      placedOrderId = undefined;
    });
  });
});

describe("integration env guard", () => {
  it("skips live credentials when env vars are missing", () => {
    if (hasCredentials) {
      expect(getMissingEnvVars()).toEqual([]);
      return;
    }

    expect(getMissingEnvVars()).toContain("T212_API_KEY");
    expect(getMissingEnvVars()).toContain("T212_API_SECRET");
  });
});
