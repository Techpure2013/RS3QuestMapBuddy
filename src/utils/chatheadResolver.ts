import { getApiBase } from "utils/apiBase";

function spriteUrl(params: {
  npcId?: number;
  name?: string;
  variant: string;
}): string {
  const base = getApiBase();
  const q = new URLSearchParams();
  if (typeof params.npcId === "number") q.set("npcId", String(params.npcId));
  if (params.name) q.set("name", params.name);
  q.set("variant", params.variant);
  return `${base}/api/chatheads/sprite?${q.toString()}`;
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 DB-first chathead resolver.
 - Try preferred variant sprite
 - If missing and preferred != default, try default sprite
 - Finally, fallback to wiki image as a visual-only backup
*/
export async function resolveNpcChatheadUrl(opts: {
  npcName: string;
  npcId?: number;
  preferredVariant?: string;
}): Promise<{ url: string; variant: string; source: "db" | "wiki" }> {
  const name = opts.npcName.trim();
  const preferred = (opts.preferredVariant || "default").trim().toLowerCase();

  // 1) DB sprite for preferred variant
  const preferredUrl = spriteUrl({
    npcId: opts.npcId,
    name,
    variant: preferred,
  });
  if (await headOk(preferredUrl)) {
    return { url: preferredUrl, variant: preferred, source: "db" };
  }

  // 2) DB sprite fallback to "default" variant (if preferred isn't default)
  if (preferred !== "default") {
    const defUrl = spriteUrl({ npcId: opts.npcId, name, variant: "default" });
    if (await headOk(defUrl)) {
      return { url: defUrl, variant: "default", source: "db" };
    }
  }

  // 3) Pure wiki fallback (visual only)
  const formatted = name.replace(/\s+/g, "_");
  return {
    url: `https://runescape.wiki/images/${formatted}_chathead.png`,
    variant: preferred,
    source: "wiki",
  };
}
