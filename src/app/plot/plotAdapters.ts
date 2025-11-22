// src/app/plot/plotAdapters.ts
import type { PlotQuestBundle } from "../../state/types";
import type { QuestBundle } from "../../state/types"; // your existing type

export function plotBundleToQuestBundle(b: PlotQuestBundle): QuestBundle {
  return b as unknown as QuestBundle;
}
