export function getApiBase(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:42069";
  }
  return window.__APP_CONFIG__?.API_BASE ?? window.location.origin;
}

export async function fetchMe(): Promise<{
  ok: boolean;
  email?: string;
  role?: string;
}> {
  try {
    const res = await fetch(getApiBase() + "/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      // Prevent revalidation caching weirdness on some proxies
      headers: { "Cache-Control": "no-store" },
    });
    if (!res.ok) return { ok: false };
    return (await res.json()) as { ok: boolean; email?: string; role?: string };
  } catch {
    return { ok: false };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(getApiBase() + "/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // ignore
  }
}
