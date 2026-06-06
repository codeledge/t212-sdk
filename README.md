# t212

Fully typed TypeScript SDK for the [Trading 212 Public API](https://docs.trading212.com/api).

Works in Node.js 18+ and any runtime with a global `fetch` implementation.

## Install

```bash
npm install t212
# or
pnpm add t212
# or
yarn add t212
# or
bun add t212
```

## Quick start

```typescript
import { T212 } from "t212";

const client = new T212({
  apiKey: process.env.T212_API_KEY!,
  apiSecret: process.env.T212_API_SECRET!,
  environment: "demo", // or "live"
});

const summary = await client.account.getSummary();
console.log(summary.totalValue);

const order = await client.orders.placeMarket({
  ticker: "AAPL_US_EQ",
  quantity: 0.1,
});
```

## Authentication

Generate an API key pair in the Trading 212 app, then pass them to the client:

- `apiKey` — HTTP Basic username
- `apiSecret` — HTTP Basic password

Use `environment: "demo"` for paper trading (`demo.trading212.com`) and `"live"` for real accounts.

## API coverage

| Resource | Methods |
| --- | --- |
| `account` | `getSummary`, `getInfo`, `getCash` |
| `orders` | `list`, `get`, `placeMarket`, `placeLimit`, `placeStop`, `placeStopLimit`, `cancel` |
| `instruments` | `list`, `exchanges`, `findByTicker` |
| `positions` | `list` |
| `history` | `orders`, `ordersAll`, `ordersPages`, `ordersItems`, `dividends`, `dividendsAll`, `dividendsItems`, `transactions`, `transactionsAll`, `transactionsItems` |
| `history.exports` | `list`, `request` |
| `pies` | deprecated Trading 212 endpoints |

## Orders

Use a positive `quantity` to buy and a negative `quantity` to sell.

```typescript
await client.orders.placeLimit({
  ticker: "AAPL_US_EQ",
  quantity: 1,
  limitPrice: 150,
  timeValidity: "DAY", // or "GTC"
});

await client.orders.placeStop({
  ticker: "AAPL_US_EQ",
  quantity: -1,
  stopPrice: 140,
  timeValidity: "GTC",
});
```

## Pagination

Historical endpoints return cursor-based pages. You can fetch one page, every page, or stream items:

```typescript
const page = await client.history.orders({ limit: 50 });

for await (const order of client.history.ordersItems({ limit: 50 })) {
  console.log(order.order.id, order.fill?.price);
}

const allOrders = await client.history.ordersAll({ limit: 50 });
```

Follow `nextPagePath` automatically via `ordersPages`, `ordersItems`, or `ordersAll`.

## Rate limits

The client serializes requests and paces them using Trading 212 rate-limit response headers. On `429` responses it waits and retries automatically — you don't need to manage throttling yourself.

On HTTP errors the SDK throws `T212Error` with `status`, `body`, and optional `rateLimit` metadata.

## Error handling

```typescript
import { T212, T212Error } from "t212";

try {
  await client.orders.get(123);
} catch (error) {
  if (error instanceof T212Error) {
    if (error.isRateLimited) {
      // retry after error.rateLimit?.reset
    }
  }
}
```

## Legacy account endpoints

`account.getInfo()` and `account.getCash()` map to older Trading 212 endpoints still used by some integrations. Prefer `account.getSummary()` for new code.

## Requirements

- Node.js 18+
- Trading 212 Invest or Stocks ISA account with API access enabled

## Integration tests

Integration tests hit the **demo** environment only. Credentials come from env vars; `T212_ENVIRONMENT=live` is ignored.

```bash
cp .env.example .env
# fill in T212_API_KEY and T212_API_SECRET from your demo account

npm test
```

Optional:

- `T212_TEST_TICKER` — ticker used for write tests (default `AAPL_US_EQ`)

Write tests place a far OTM limit order and cancel it in the same run.

## License

MIT
