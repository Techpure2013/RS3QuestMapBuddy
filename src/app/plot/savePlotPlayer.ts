// src/state/api/savePlayerPlot.ts
export type CanonicalPoint = { lat: number; lng: number };

export type SaveNpc = {
  id?: number;
  npcName?: string;
  npcLocation?: CanonicalPoint;
  wanderRadius?: { bottomLeft: CanonicalPoint; topRight: CanonicalPoint };
};

export type SaveObjPoint = CanonicalPoint & {
  color?: string;
  numberLabel?: string;
};

export type SaveObj = {
  id?: number;
  name?: string;
  objectLocation?: SaveObjPoint[];
  objectRadius?: { bottomLeft: CanonicalPoint; topRight: CanonicalPoint };
};

export type SavePlayerPlotBody = {
  playerName: string;
  stepId: number;
  floor?: number;
  plotHighlights: { npc: SaveNpc[]; object: SaveObj[] };
};

export type SavePlayerPlotError =
  | "name_not_claimed_or_ip_mismatch"
  | "name_bound_to_different_ip"
  | "save_failed"
  | "bad_request";

export type SavePlayerPlotResp =
  | { ok: true }
  | { ok: false; error: SavePlayerPlotError };

export async function savePlayerPlot(
  body: SavePlayerPlotBody
): Promise<SavePlayerPlotResp> {
  const res = await fetch("/api/plot/save", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) return { ok: true };

  const json = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  const error =
    (json?.error as SavePlayerPlotError | undefined) ?? "save_failed";
  return { ok: false, error };
}
