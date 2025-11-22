// src/api/plotApi.ts
import { getApiBase } from "../utils/apiBase";
import { httpJson } from "../utils/http";

export type PlotNpcHighlight = {
  id: number;
  npcName: string;
  npcLocation: { lat: number; lng: number };
  wanderRadius?: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
};
export type PlotObjectHighlight = {
  id: number;
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
};
export type PlotHighlights = {
  npc: PlotNpcHighlight[];
  object: PlotObjectHighlight[];
};

export async function saveStepPlot(input: {
  playerName: string;
  stepId: number;
  floor?: number;
  highlights: PlotHighlights;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  return httpJson(`${base}/api/plot/save`, {
    method: "POST",
    body: input,
  });
}

export async function getStepPlot(stepId: number, playerName: string) {
  const base = getApiBase();
  return httpJson<{
    ok: true;
    plot: {
      highlights: PlotHighlights;
      floor: number | null;
      updatedAt: string;
    };
  }>(`${base}/api/plot/${stepId}/${encodeURIComponent(playerName)}`, {
    method: "GET",
  });
}

export async function listStepPlots(stepId: number) {
  const base = getApiBase();
  return httpJson<{
    ok: true;
    items: Array<{
      playerName: string;
      floor: number | null;
      updatedAt: string;
      highlights: PlotHighlights;
    }>;
  }>(`${base}/api/plot/step/${stepId}`, { method: "GET" });
}
