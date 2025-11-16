import { QuestBundleNormalized } from "../state/types";

function getApiBase(): string {
  const host = window.location.hostname;

  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:42069";
  }

  const base = (window as any).__APP_CONFIG__?.API_BASE;
  if (base) return base;
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
  bundle: Omit<QuestBundleNormalized, "updatedAt">
): Promise<void> {
  const res = await fetch(
    `/api/quests/${encodeURIComponent(bundle.quest.name)}/bundle`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to save bundle");
  }
}
