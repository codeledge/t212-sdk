const TRADING212_ROOT_DOMAIN = "trading212.com";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const CDP_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

function parseAbsoluteUrl(rawUrl: string, source: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new Error(`${source} must be a valid absolute URL`);
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function isTrading212Hostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === TRADING212_ROOT_DOMAIN ||
    normalized.endsWith(`.${TRADING212_ROOT_DOMAIN}`)
  );
}

function assertHttpsTrading212Url(url: URL, source: string): void {
  if (url.protocol !== "https:") {
    throw new Error(`${source} must use https`);
  }

  if (!isTrading212Hostname(url.hostname)) {
    throw new Error(`${source} must target a trading212.com host`);
  }
}

function assertOriginOnly(url: URL, source: string): void {
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${source} must not include a path, query, or fragment`);
  }
}

export function isTrustedTrading212Url(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && isTrading212Hostname(url.hostname);
  } catch {
    return false;
  }
}

export function resolveTrading212Origin(
  rawUrl: string,
  source: string,
): string {
  const url = parseAbsoluteUrl(rawUrl, source);
  assertHttpsTrading212Url(url, source);
  assertOriginOnly(url, source);
  return url.origin;
}

export function resolveTrading212RequestUrl(
  rawUrl: string,
  source = "Browser request URL",
): string {
  const url = parseAbsoluteUrl(rawUrl, source);
  assertHttpsTrading212Url(url, source);
  return url.toString();
}

export function resolveLoopbackCdpUrl(
  rawUrl: string,
  source = "T212_CDP_URL",
): string {
  const url = parseAbsoluteUrl(rawUrl, source);

  if (!CDP_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${source} must use http, https, ws, or wss`);
  }

  if (!LOOPBACK_HOSTS.has(normalizeHostname(url.hostname))) {
    throw new Error(`${source} must target localhost or another loopback host`);
  }

  return url.toString();
}
