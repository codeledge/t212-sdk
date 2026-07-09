import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { homedir } from "os";
import { resolve } from "path";
import {
  isTrustedTrading212Url,
  resolveLoopbackCdpUrl,
  resolveTrading212Origin,
  resolveTrading212RequestUrl,
} from "./urlGuards";

/**
 * Robust access to Trading 212's Cloudflare-protected internal endpoints.
 *
 * Node/Bun's `fetch` can't reach these endpoints directly: its TLS fingerprint
 * doesn't match a browser, so Cloudflare returns "Access Denied" even with a
 * valid `cf_clearance`. So we always issue the request from inside a real
 * Chrome page (via Playwright) — genuine Chrome TLS clears Cloudflare.
 *
 * Three ways to supply the logged-in session, in priority order:
 *
 * 1. (simplest) T212_COOKIE — paste the `Cookie` header from your logged-in
 *    browser (DevTools > any *.trading212.com request > Copy > Copy Cookie, or
 *    Application > Cookies). We launch a fresh Chrome, inject those cookies, and
 *    go. No interactive login, no CDP, no persistent profile. Cookies expire, so
 *    re-paste when you start getting 401s.
 *
 * 2. Attach to your ALREADY-RUNNING Chrome over CDP (no cookie needed). Launch
 *    Chrome once with a debugging port open:
 *
 *      open -a "Google Chrome" --args --remote-debugging-port=9222
 *
 *    (Quit any existing Chrome first — the flag only applies on cold start.)
 *
 * 3. A dedicated persistent profile launched by Playwright (used if neither of
 *    the above is available). One-time login via `scripts/login.ts`.
 *
 *   T212_COOKIE                 raw Cookie header from a logged-in session
 *   T212_CDP_URL                CDP endpoint of your running Chrome (default http://localhost:9222)
 *   T212_CHROME_USER_DATA_DIR   fallback persistent profile dir (default ~/.t212-sdk/chrome)
 *   T212_SHOW_WINDOW=1          keep the Chrome window visible instead of minimizing it
 *   T212_APP_ORIGIN             app origin to anchor requests (default app.trading212.com)
 */

const CHROME_ARGS = [
  "--password-store=basic",
  "--use-mock-keychain",
  "--no-first-run",
  "--no-default-browser-check",
];

let browserPromise: Promise<Browser> | null = null;
let contextPromise: Promise<BrowserContext> | null = null;
let pagePromise: Promise<Page> | null = null;
let usingCdp = false;

function userDataDir(): string {
  return (
    process.env.T212_CHROME_USER_DATA_DIR ??
    resolve(homedir(), ".t212-sdk", "chrome")
  );
}

function getAppOrigin(): string {
  return resolveTrading212Origin(
    process.env.T212_APP_ORIGIN ?? "https://app.trading212.com",
    "T212_APP_ORIGIN",
  );
}

function getCdpUrl(): string {
  return resolveLoopbackCdpUrl(
    process.env.T212_CDP_URL ?? "http://localhost:9222",
    "T212_CDP_URL",
  );
}

/**
 * Parse a raw `Cookie` header ("a=1; b=2") into Playwright cookie objects,
 * scoped to `.trading212.com` so they're sent to every T212 subdomain.
 */
function parseCookieHeader(
  header: string,
): Parameters<BrowserContext["addCookies"]>[0] {
  return header
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return {
        name: eq === -1 ? pair : pair.slice(0, eq),
        value: eq === -1 ? "" : pair.slice(eq + 1),
        domain: ".trading212.com",
        path: "/",
        secure: true,
        sameSite: "Lax" as const,
      };
    });
}

/** Minimize the browser window (best-effort) so it isn't in the way. */
async function minimizeWindow(
  context: BrowserContext,
  page: Page,
): Promise<void> {
  try {
    const cdp = await context.newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "minimized" },
    });
  } catch {
    // Best-effort only.
  }
}

/**
 * Cookie mode: launch a fresh real Chrome, inject cookies copied from a
 * logged-in session, and anchor on the app origin. Real Chrome TLS clears
 * Cloudflare, and the injected `cf_clearance`/session cookies authenticate —
 * no interactive login, no CDP, no persistent profile.
 */
async function launchWithCookies(
  cookieHeader: string,
): Promise<BrowserContext> {
  const showWindow = process.env.T212_SHOW_WINDOW === "1";
  const appOrigin = getAppOrigin();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: CHROME_ARGS,
  });
  browserPromise = Promise.resolve(browser);
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });
  await context.addCookies(parseCookieHeader(cookieHeader));
  const page = await context.newPage();
  if (!showWindow) await minimizeWindow(context, page);
  await page.goto(appOrigin, { waitUntil: "domcontentloaded" });
  return context;
}

async function connectToRunningChrome(): Promise<BrowserContext | null> {
  try {
    const browser = await chromium.connectOverCDP(getCdpUrl());
    browserPromise = Promise.resolve(browser);
    usingCdp = true;
    return browser.contexts()[0] ?? (await browser.newContext());
  } catch {
    return null;
  }
}

async function getContext(): Promise<BrowserContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      // Preferred: cookies copied from a logged-in session (simplest, no login).
      const cookieHeader = process.env.T212_COOKIE;
      if (cookieHeader) return launchWithCookies(cookieHeader);

      const cdpContext = await connectToRunningChrome();
      if (cdpContext) return cdpContext;

      const showWindow = process.env.T212_SHOW_WINDOW === "1";
      const context = await chromium.launchPersistentContext(userDataDir(), {
        channel: "chrome",
        // Real headless mode gets fingerprinted and blocked by Cloudflare, so
        // we always launch headed and instead hide the window off-screen.
        headless: false,
        viewport: { width: 1024, height: 768 },
        args: CHROME_ARGS,
      });

      if (!showWindow) {
        const page =
          context.pages().find((p) => !p.isClosed()) ??
          (await context.newPage());
        await minimizeWindow(context, page);
      }
      return context;
    })();
  }
  return contextPromise;
}

export async function getPage(): Promise<Page> {
  if (!pagePromise) {
    pagePromise = (async () => {
      const appOrigin = getAppOrigin();
      const context = await getContext();
      const existing = context
        .pages()
        .find((p) => !p.isClosed() && isTrustedTrading212Url(p.url()));
      const page = existing ?? (await context.newPage());
      // Anchor on the app origin once. The charting endpoints live on
      // *.services.trading212.com; T212's CORS lets the app origin call them
      // cross-origin with credentials, so we never navigate again after this.
      // Skip re-navigating a page already on trading212.com (likely your own
      // logged-in tab when attached over CDP) to avoid disrupting it.
      if (!isTrustedTrading212Url(page.url())) {
        await page.goto(appOrigin, { waitUntil: "domcontentloaded" });
      }
      return page;
    })();
  }
  const page = await pagePromise;
  if (page.isClosed()) {
    pagePromise = null;
    return getPage();
  }
  return page;
}

export class BrowserRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "BrowserRequestError";
  }
}

export interface BrowserRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON-serialisable request body (sent with Content-Type: application/json). */
  body?: unknown;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function throwForStatus(status: number, body: unknown): never {
  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
      ? (body as { message: string }).message
      : `Request failed: ${status}`;
  throw new BrowserRequestError(message, status, body);
}

/**
 * Fetch a Trading 212 JSON endpoint from inside a real Chrome page context, so
 * the request carries genuine Chrome TLS and clears Cloudflare.
 */
export async function browserRequest<T>(
  url: string,
  options: BrowserRequestOptions = {},
): Promise<T> {
  const page = await getPage();
  const target = resolveTrading212RequestUrl(url);

  const result = await page.evaluate(
    async ({ target, method, body }) => {
      const headers: Record<string, string> = { Accept: "application/json" };
      const init: RequestInit = { method, headers, credentials: "include" };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }
      const res = await fetch(target, init);
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    },
    { target, method: options.method ?? "GET", body: options.body },
  );

  const body = parseBody(result.text);
  if (!result.ok) throwForStatus(result.status, body);
  return body as T;
}

/**
 * Close the shared browser. Call at the end of a script so the process exits.
 * When attached to your running Chrome over CDP, this only disconnects —
 * your actual browser window stays open.
 */
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    // For CDP this just disconnects (your real Chrome stays open); for a
    // cookie-mode launch it closes the browser we started.
    const browser = await browserPromise;
    await browser.close();
  } else if (contextPromise) {
    const context = await contextPromise;
    await context.close();
  }
  contextPromise = null;
  pagePromise = null;
  browserPromise = null;
  usingCdp = false;
}
