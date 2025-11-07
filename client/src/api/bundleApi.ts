// src/utils/bundleApi.ts

import { QuestBundleNormalized } from "./../state/types";

function getApiBase(): string {
  const host = window.location.hostname;

  // Local dev: hit dev API or rely on webpack devServer proxy
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:42069"; // or just return "" and prefix fetch with /api
  }

  // Prod: always go through /api behind NGINX
  const base = (window as any).__APP_CONFIG__?.API_BASE;
  if (base) return base; // optional runtime override
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
