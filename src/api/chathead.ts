import { parseWikiImageUrl } from "map/utils/imageUtils";
import { getApiBase } from "./../utils/apiBase";

export async function upsertChathead({
  name,
  sourceUrl,
  variant = "default",
  spriteSize = 48,
  npcId,
}: {
  name?: string;
  npcId?: number;
  sourceUrl: string;
  variant?: string;
  spriteSize?: number;
}): Promise<{
  ok: true;
  npc_id: number | null;
  name: string;
  variant: string;
}> {
  const API_BASE = getApiBase();

  const body: Record<string, unknown> = { variant, sourceUrl, spriteSize };
  if (typeof npcId === "number") body.npcId = npcId;
  if (name) body.name = name;

  const res = await fetch(`${API_BASE}/api/chatheads/upsert`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "chathead upsert failed");
  }
  return (await res.json()) as {
    ok: true;
    npc_id: number | null;
    name: string;
    variant: string;
  };
}
export type ResolveSource = "db" | "wiki";
export type VariantListResponse = { ok: boolean; variants: string[] };
export async function listChatheadVariants(opts: {
  npcId?: number;
  name?: string;
}): Promise<string[]> {
  const base = getApiBase();
  const qs = new URLSearchParams();
  if (typeof opts.npcId === "number") qs.set("npcId", String(opts.npcId));
  if (opts.name) qs.set("name", normalizeNameForDb(opts.name));
  const url = `${base}/api/chatheads/variants?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as VariantListResponse | { ok: false };
    return (json as VariantListResponse).ok
      ? (json as VariantListResponse).variants
      : [];
  } catch {
    return [];
  }
}

export function normalizeNameForDb(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
export function spriteUrl(params: {
  npcId?: number;
  name?: string;
  variant: string;
}) {
  const base = getApiBase();
  const q = new URLSearchParams();
  if (typeof params.npcId === "number") q.set("npcId", String(params.npcId));
  if (params.name) q.set("name", params.name);
  q.set("variant", params.variant);
  return `${base}/api/chatheads/sprite?${q.toString()}`;
}

async function rangeOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Range: "bytes=0-0",
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    });
    // Some servers return 206 for Range; treat 200 and 206 as OK
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

export async function resolveNpcChatheadUrl(opts: {
  npcName: string;
  npcId?: number;
  preferredVariant?: string;
}): Promise<{ url: string; variant: string; source: ResolveSource }> {
  const name = normalizeNameForDb(opts.npcName);
  const preferred = (opts.preferredVariant || "default").trim().toLowerCase();

  const chain: Array<{ make: () => string; variant: string }> = [];
  if (typeof opts.npcId === "number") {
    chain.push(
      {
        make: () => spriteUrl({ npcId: opts.npcId, variant: preferred }),
        variant: preferred,
      },
      {
        make: () => spriteUrl({ npcId: opts.npcId, variant: "default" }),
        variant: "default",
      }
    );
  }
  chain.push(
    { make: () => spriteUrl({ name, variant: preferred }), variant: preferred },
    { make: () => spriteUrl({ name, variant: "default" }), variant: "default" }
  );

  for (const step of chain) {
    const url = step.make();
    if (await rangeOk(url)) {
      return { url, variant: step.variant, source: "db" };
    }
  }

  const formatted = name.replace(/\s+/g, "_");
  const wiki = parseWikiImageUrl(
    `https://runescape.wiki/images/${formatted}_chathead.png`
  );
  return { url: wiki, variant: preferred, source: "wiki" };
}

export async function resolveObjectImageUrl(opts: {
  objectName: string;
  preferredVariant?: string;
}): Promise<{ url: string; variant: string; source: ResolveSource }> {
  const name = normalizeNameForDb(opts.objectName);
  const preferred = (opts.preferredVariant || "default").trim().toLowerCase();

  const preferredUrl = spriteUrl({ name, variant: preferred });
  if (await rangeOk(preferredUrl)) {
    return { url: preferredUrl, variant: preferred, source: "db" };
  }
  const defUrl = spriteUrl({ name, variant: "default" });
  if (await rangeOk(defUrl)) {
    return { url: defUrl, variant: "default", source: "db" };
  }

  const formatted = name.replace(/\s+/g, "_");
  const wiki = parseWikiImageUrl(
    `https://runescape.wiki/images/${formatted}.png`
  );
  return { url: wiki, variant: preferred, source: "wiki" };
}

export async function resolveAllNpcChatheadVariants(opts: {
  npcName: string;
  npcId?: number;
}): Promise<Array<{ variant: string; url: string }>> {
  const name = normalizeNameForDb(opts.npcName);
  const viaId = typeof opts.npcId === "number";
  const variants = await listChatheadVariants(
    viaId ? { npcId: opts.npcId } : { name }
  );
  const fullSet = variants.length > 0 ? variants : ["default"];
  return fullSet
    .map((v) => v.trim().toLowerCase())
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .sort()
    .map((v) => ({
      variant: v,
      url: viaId
        ? spriteUrl({ npcId: opts.npcId, variant: v })
        : spriteUrl({ name, variant: v }),
    }));
}

export async function resolveAllObjectImageVariants(
  objectName: string
): Promise<Array<{ variant: string; url: string }>> {
  const name = normalizeNameForDb(objectName);
  const variants = await listChatheadVariants({ name });
  const fullSet = variants.length > 0 ? variants : ["default"];
  return fullSet
    .map((v) => v.trim().toLowerCase())
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .sort()
    .map((v) => ({ variant: v, url: spriteUrl({ name, variant: v }) }));
}
