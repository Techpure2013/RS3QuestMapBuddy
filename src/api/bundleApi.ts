import { QuestBundleNormalized } from "../state/types";

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
