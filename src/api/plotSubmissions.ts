import { getApiBase } from "../utils/apiBase";

export async function submitPlot(input: {
  playerName: string;
  stepId: number;
  floor?: number;
  highlights: {
    npc: Array<{
      id?: number;
      npcName: string;
      npcLocation: { lat: number; lng: number };
      wanderRadius?: {
        bottomLeft: { lat: number; lng: number };
        topRight: { lat: number; lng: number };
      };
    }>;
    object: Array<{
      id?: number;
      name: string;
      objectLocation: Array<{
        lat: number;
        lng: number;
        color?: string;
        numberLabel?: string;
      }>;
      objectRadius?: {
        bottomLeft: { lat: number; lng: number };
        topRight: { lat: number; lng: number };
      };
    }>;
  };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/plot-submissions`, {
    method: "POST",
    credentials: "omit", // public
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    try {
      return (await res.json()) as { ok: false; error: string };
    } catch {
      return { ok: false, error: `HTTP ${res.status}` };
    }
  }
  return (await res.json()) as { ok: true };
}
