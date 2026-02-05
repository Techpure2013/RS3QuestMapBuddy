import { getApiBase } from "../utils/apiBase";
import { httpJson } from "../utils/http";

export interface WikiQuestStep {
  stepNumber: number;
  stepDescription: string;
  itemsNeeded: string[];
  itemsRecommended: string[];
  dialogOptions: string[];
  additionalStepInformation: string[];
}

export interface WikiQuestData {
  questName: string;
  steps: WikiQuestStep[];
  itemsNeeded: string[];
  itemsRecommended: string[];
  fetchedAt: string;
}

export interface WikiRefreshResult {
  success: boolean;
  stepsUpdated: number;
  message: string;
}

export async function fetchWikiGuide(questName: string): Promise<WikiQuestData | null> {
  const base = getApiBase();
  return httpJson<WikiQuestData | null>(
    `${base}/api/quests/${encodeURIComponent(questName)}/wiki-guide`,
    { method: "GET" }
  );
}

export async function refreshQuestFromWiki(questName: string): Promise<WikiRefreshResult> {
  const base = getApiBase();
  return httpJson<WikiRefreshResult>(
    `${base}/api/quests/${encodeURIComponent(questName)}/wiki-refresh`,
    { method: "POST" }
  );
}
