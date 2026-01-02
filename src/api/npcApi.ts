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
  coord: { lat: number; lng: number; floor: number }
): Promise<void> {
  const base = getApiBase();
  await httpJson<void>(`${base}/api/npcs/${npcId}/locations`, {
    method: "POST",
    body: coord,
  });
}
