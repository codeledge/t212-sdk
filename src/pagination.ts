import type { HttpClient } from "./http";
import type { PaginatedResponse, PaginationQuery } from "./types";

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

  return http.requestPaginatedPath<T>(nextPath!);
}

export async function fetchAllPages<T>(
  http: HttpClient,
  initialPath: string,
  query?: PaginationQuery,
): Promise<T[]> {
  const items: T[] = [];
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

    items.push(...page.items);
    nextPath = page.nextPagePath;
    isFirstPage = false;
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
): AsyncGenerator<T, void, undefined> {
  for await (const page of iteratePages<T>(http, initialPath, query)) {
    for (const item of page.items) {
      yield item;
    }
  }
}
