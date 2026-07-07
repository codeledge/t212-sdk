import type { HttpClient } from "./http";
import type { PaginatedResponse, PaginationQuery } from "./types";

export interface PaginationIteratorOptions<T> {
  /**
   * Stop iteration when this returns true for an item.
   * The matching item is not yielded/returned.
   */
  stopWhen?: (item: T) => boolean;
  /** Yield only items that match this predicate. */
  includeWhen?: (item: T) => boolean;
  /** Maximum number of pages to read. */
  maxPages?: number;
}

async function fetchPage<T>(
  http: HttpClient,
  initialPath: string,
  query: PaginationQuery | undefined,
  nextPath: string | null,
  isFirstPage: boolean,
): Promise<PaginatedResponse<T>> {
  if (isFirstPage) {
    return http.request<PaginatedResponse<T>>({
      path: initialPath,
      ...(query ? { query } : {}),
    });
  }

  // Subsequent pages: extract the cursor from nextPath and re-send it alongside
  // the original query params, otherwise filters like `ticker` get dropped.
  const cursorMatch = nextPath!.match(/[?&]cursor=([^&]+)/);
  const cursor = cursorMatch?.[1] ? decodeURIComponent(cursorMatch[1]) : "";
  return http.request<PaginatedResponse<T>>({
    path: initialPath,
    query: { ...query, ...(cursor ? { cursor } : {}) },
  });
}

export async function fetchAllPages<T>(
  http: HttpClient,
  initialPath: string,
  query?: PaginationQuery,
  options?: PaginationIteratorOptions<T>,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterateAllItems<T>(
    http,
    initialPath,
    query,
    options,
  )) {
    items.push(item);
  }
  return items;
}

export async function* iteratePages<T>(
  http: HttpClient,
  initialPath: string,
  query?: PaginationQuery,
): AsyncGenerator<PaginatedResponse<T>, void, undefined> {
  let nextPath: string | null = null;
  let isFirstPage = true;

  while (isFirstPage || nextPath) {
    const page: PaginatedResponse<T> = await fetchPage<T>(
      http,
      initialPath,
      query,
      nextPath,
      isFirstPage,
    );

    yield page;
    nextPath = page.nextPagePath;
    isFirstPage = false;
  }
}

export async function* iterateAllItems<T>(
  http: HttpClient,
  initialPath: string,
  query?: PaginationQuery,
  options?: PaginationIteratorOptions<T>,
): AsyncGenerator<T, void, undefined> {
  let pageIndex = 0;
  for await (const page of iteratePages<T>(http, initialPath, query)) {
    pageIndex += 1;
    if (options?.maxPages !== undefined && pageIndex > options.maxPages) {
      return;
    }
    for (const item of page.items) {
      if (options?.stopWhen?.(item)) {
        return;
      }
      if (options?.includeWhen && !options.includeWhen(item)) {
        continue;
      }
      yield item;
    }
  }
}
