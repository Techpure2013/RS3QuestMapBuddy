// src/api/bundleApiPlot.ts

// src/api/bundleApiPlot.ts
import { getApiBase } from "../utils/apiBase";
import type { PlotQuestBundle } from "./../state/types";

export async function fetchQuestBundlePublic(
  name: string
): Promise<PlotQuestBundle | null> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/quests/${encodeURIComponent(name)}/bundle`,
    {
      credentials: "omit",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    }
  );
  if (!res.ok) return null;

  const json = (await res.json()) as unknown;
  // Minimal shape check so TS narrows safely
  if (
    !json ||
    typeof json !== "object" ||
    !("quest" in json) ||
    !("steps" in json)
  ) {
    return null;
  }
  return json as PlotQuestBundle;
}
