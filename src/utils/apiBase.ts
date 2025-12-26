// src/utils/apiBase.ts
export type AppConfig = {
  API_BASE?: string;
  FRONTEND_BASE_PATH?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

export function getApiBase(): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  // Dev: use empty string for relative URLs so webpack proxy handles routing
  if (isLocalHost(host)) {
    return "";
  }

  const cfg = typeof window !== "undefined" ? window.__APP_CONFIG__ : undefined;
  const fromCfg =
    cfg?.API_BASE && cfg.API_BASE.trim().length > 0
      ? cfg.API_BASE.trim()
      : null;

  return fromCfg ?? origin;
}
