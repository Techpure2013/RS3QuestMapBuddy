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
