// src/state/api/submitPlot.ts
export type SubmitHighlightPoint = {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
};
export type SubmitHighlights = {
  npc: Array<{
    id?: number;
    npcName?: string;
    npcLocation?: { lat: number; lng: number };
    wanderRadius?: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }>;
  object: Array<{
    id?: number;
    name?: string;
    objectLocation?: SubmitHighlightPoint[];
    objectRadius?: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }>;
};
export type SubmitPlotBody = {
  playerName: string;
  stepId: number;
  floor?: number;
  highlights: SubmitHighlights;
};
// src/state/api/submitPlot.ts
export type SubmitPlotError = "bad_request" | "step_not_found" | "save_failed";

export type SubmitPlotResp =
  | { ok: true }
  | { ok: false; error: SubmitPlotError };

export async function submitPlotApi(
  body: SubmitPlotBody
): Promise<SubmitPlotResp> {
  const res = await fetch("/api/plot-submissions", {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return { ok: true };

  const json = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  const error = (json?.error as SubmitPlotError | undefined) ?? "save_failed";
  return { ok: false, error };
}
