// src/utils/objectImageResolver.ts
import { getApiBase } from "utils/apiBase";
import { parseWikiImageUrl } from "map/utils/imageUtils";

function normalizeNameForDb(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function spriteUrlByName(name: string, variant: string): string {
  const base = getApiBase();
  const q = new URLSearchParams();
  q.set("name", name);
  q.set("variant", variant);
  return `${base}/api/chatheads/sprite?${q.toString()}`;
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveObjectImageUrl(opts: {
  objectName: string;
  preferredVariant?: string; // default "default"
}): Promise<{
  url: string;
  variant: string;
  source: "db" | "wiki";
  tried: Array<{
    by: "name" | "wiki";
    variant: "preferred" | "default";
    ok: boolean;
  }>;
}> {
  const tried: Array<{
    by: "name" | "wiki";
    variant: "preferred" | "default";
    ok: boolean;
  }> = [];

  const rawName = opts.objectName ?? "";
  const name = normalizeNameForDb(rawName);
  const preferred = (opts.preferredVariant || "default").trim().toLowerCase();

  // DB by name+variant
  const preferredUrl = spriteUrlByName(name, preferred);
  if (await headOk(preferredUrl)) {
    tried.push({ by: "name", variant: "preferred", ok: true });
    return { url: preferredUrl, variant: preferred, source: "db", tried };
  }
  tried.push({ by: "name", variant: "preferred", ok: false });

  const defUrl = spriteUrlByName(name, "default");
  if (await headOk(defUrl)) {
    tried.push({ by: "name", variant: "default", ok: true });
    return { url: defUrl, variant: "default", source: "db", tried };
  }
  tried.push({ by: "name", variant: "default", ok: false });

  // Wiki fallback
  const formatted = name.replace(/\s+/g, "_");
  const wiki = parseWikiImageUrl(
    `https://runescape.wiki/images/${formatted}.png`
  );
  tried.push({ by: "wiki", variant: "preferred", ok: true });
  return { url: wiki, variant: preferred, source: "wiki", tried };
}
