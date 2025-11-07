// src/utils/bundleApi.ts

import { QuestBundleNormalized } from "./../state/types";

function getApiBase(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    // Use dev proxy or same-origin in dev to avoid CORS
    return "http://127.0.0.1:42069";
  }
  return window.__APP_CONFIG__?.API_BASE ?? window.location.origin;
}
const API_BASE = getApiBase();

export async function fetchQuestBundle(
  questName: string
): Promise<QuestBundleNormalized> {
  const res = await fetch(
    `/api/quests/${encodeURIComponent(questName)}/bundle`
  );
  if (!res.ok) {
    throw new Error(`Failed to load bundle: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json) {
    throw new Error("Quest not found");
  }
  return json as QuestBundleNormalized;
}

export async function saveQuestBundle(
  bundle: Omit<QuestBundleNormalized, "updatedAt">,
  adminToken: string
): Promise<void> {
  console.log(API_BASE);
  const res = await fetch(
    `/api/quests/${encodeURIComponent(bundle.quest.name)}/bundle`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify(bundle),
    }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to save bundle");
  }
}
