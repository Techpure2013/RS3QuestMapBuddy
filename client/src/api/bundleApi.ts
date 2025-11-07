// src/utils/bundleApi.ts

import { QuestBundleNormalized } from "./../state/types";

function getApiBase(): string {
  const host = window.location.hostname;

  // Local dev (webpack-dev-server): hit local API directly or use dev proxy
  if (host === "localhost" || host === "127.0.0.1") {
    // If you run the API locally:
    return "http://127.0.0.1:42069";
    // you can also return "" and always prefix routes with /api in fetch calls.
  }

  // This keeps same-origin and avoids CORS
  const base = window.__APP_CONFIG__?.API_BASE;
  if (base) return base; // allow runtime override if you ever inject one

  return `${window.location.origin}/api`;
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
