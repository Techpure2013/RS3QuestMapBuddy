// src/utils/http.ts
export type HttpOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
};

export async function httpJson<T>(
  url: string,
  opts: HttpOptions = {}
): Promise<T> {
  const { body, headers, credentials, method, cache } = opts;
  const res = await fetch(url, {
    method: method ?? (body ? "POST" : "GET"),
    credentials: credentials ?? "include",
    cache: cache ?? "no-store",
    headers: {
      "Cache-Control": "no-store",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  // If server returns no content:
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}
