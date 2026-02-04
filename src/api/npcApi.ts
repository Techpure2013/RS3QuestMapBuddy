// src/api/npcApi.ts
import { getApiBase } from "../utils/apiBase";
import { httpJson } from "../utils/http";

export type NpcSearchRow = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  floor: number;
};

export async function searchNpcs(
  name: string,
  limit = 15
): Promise<NpcSearchRow[]> {
  const base = getApiBase();
  const params = new URLSearchParams({
    name: name.trim(),
    limit: String(limit),
  });
  return httpJson<NpcSearchRow[]>(
    `${base}/api/npcs?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function addNpcLocation(
  npcId: number,
  coord: { lat: number; lng: number; floor: number },
  npcName?: string
): Promise<void> {
  const base = getApiBase();
  await httpJson<void>(`${base}/api/npcs/${npcId}/locations`, {
    method: "POST",
    body: { ...coord, ...(npcName ? { npcName } : {}) },
  });
}

/**
 * Look up an NPC by exact name match (case-insensitive).
 * Returns the first matching NPC's ID, or null if not found.
 */
export async function lookupNpcIdByName(name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  try {
    const results = await searchNpcs(trimmed, 100);
    // Find exact match (case-insensitive)
    const exactMatch = results.find(
      (npc) => npc.name.toLowerCase() === trimmed.toLowerCase()
    );
    return exactMatch?.id ?? null;
  } catch {
    return null;
  }
}
