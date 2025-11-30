// src/utils/appBase.ts

function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

export function getAppBasePath(): string {
  // 1) Runtime override via injected config
  const cfg =
    (typeof window !== "undefined" && window.__APP_CONFIG__) || undefined;
  const cfgBase =
    cfg?.FRONTEND_BASE_PATH && cfg.FRONTEND_BASE_PATH.trim().length > 0
      ? cfg.FRONTEND_BASE_PATH.trim()
      : null;

  if (cfgBase) return ensureTrailingSlash(cfgBase);

  // 2) CRA PUBLIC_URL (baked at build time)
  const craPublicUrl =
    typeof process !== "undefined" && (process as any).env?.PUBLIC_URL;
  if (typeof craPublicUrl === "string" && craPublicUrl.length > 0) {
    // PUBLIC_URL can be absolute; we only need the path portion for building relative URLs.
    try {
      const u = new URL(craPublicUrl, "http://placeholder");
      return ensureTrailingSlash(u.pathname || "/");
    } catch {
      return ensureTrailingSlash(craPublicUrl);
    }
  }

  // 3) Default: root
  return "/";
}

export function buildObjectsJsonUrl(letter: string): string {
  const first = (letter[0] || "").toUpperCase();
  const base = getAppBasePath(); // "/" or "/RS3QuestBuddyEditor/"
  return `${base}Objects_By_Letter/${first}.json`;
}
