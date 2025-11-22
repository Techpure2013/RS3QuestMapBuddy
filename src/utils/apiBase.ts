// src/utils/apiBase.ts
type AppConfig = {
  API_BASE?: string;
};
declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

export function getApiBase(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:42069";
  }
  return window.__APP_CONFIG__?.API_BASE ?? window.location.origin;
}
