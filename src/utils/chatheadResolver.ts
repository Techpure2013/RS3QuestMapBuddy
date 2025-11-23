// src/utils/chatheadResolver.ts
import { getApiBase } from "utils/apiBase";
import { parseWikiImageUrl } from "map/utils/imageUtils";

type Source = "db" | "wiki";
type VariantTry = "preferred" | "default";

// strict normalization to match server upsert normalization
function normalizeNameForDb(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

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

export async function resolveNpcChatheadUrl(opts: {
  npcName: string;
  npcId?: number;
  preferredVariant?: string;
}): Promise<{
  url: string;
  variant: string;
  source: Source;
  tried: Array<{
    by: "id" | "name" | "wiki";
    variant: VariantTry;
    ok: boolean;
  }>;
}> {
  const tried: Array<{
    by: "id" | "name" | "wiki";
    variant: VariantTry;
    ok: boolean;
  }> = [];

  const rawName = opts.npcName ?? "";
  const name = normalizeNameForDb(rawName);
  const preferred = (opts.preferredVariant || "default").trim().toLowerCase();

  const tryChain: Array<{
    by: "id" | "name";
    variant: VariantTry;
    make: () => string;
  }> = [
    ...(typeof opts.npcId === "number"
      ? [
          {
            by: "id" as const,
            variant: "preferred" as const,
            make: () => spriteUrl({ npcId: opts.npcId, variant: preferred }),
          },
          {
            by: "id" as const,
            variant: "default" as const,
            make: () => spriteUrl({ npcId: opts.npcId, variant: "default" }),
          },
        ]
      : []),
    {
      by: "name" as const,
      variant: "preferred" as const,
      make: () => spriteUrl({ name, variant: preferred }),
    },
    {
      by: "name" as const,
      variant: "default" as const,
      make: () => spriteUrl({ name, variant: "default" }),
    },
  ];

  for (const step of tryChain) {
    const url = step.make();
    const ok = await headOk(url);
    tried.push({ by: step.by, variant: step.variant, ok });
    if (ok) {
      return {
        url,
        variant: step.variant === "preferred" ? preferred : "default",
        source: "db",
        tried,
      };
    }
  }

  // Wiki fallback (visual only)
  const formatted = name.replace(/\s+/g, "_");
  const wiki = parseWikiImageUrl(
    `https://runescape.wiki/images/${formatted}_chathead.png`
  );
  tried.push({ by: "wiki", variant: "preferred", ok: true });
  return { url: wiki, variant: preferred, source: "wiki", tried };
}
