import {
  loadQuestListFullCache,
  saveQuestListFullCache,
} from "api/questListService";
import { type QuestListFullCache, type QuestRowFull } from "../state/questList";

function getApiBase(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    // Use dev proxy or same-origin in dev to avoid CORS
    return "http://127.0.0.1:42069";
  }
  return window.__APP_CONFIG__?.API_BASE ?? window.location.origin;
}
const API_BASE = getApiBase();

/**
 Fetch the entire quests table once, cache to IDB.
 Server route must return:
  { items: QuestRowFull[], total: number, updatedAt: string }
 Dates must be strings (ISO) in the response.
*/
export async function loadQuestListAllFull(
  forceRefresh = false
): Promise<QuestListFullCache> {
  if (!forceRefresh) {
    const cached = await loadQuestListFullCache();
    if (cached) return cached;
  }
  const res = await fetch(`${API_BASE}/api/quests/all-full`);
  console.dir(API_BASE);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to load full quest list");
  }
  const json = (await res.json()) as QuestListFullCache;

  // Ensure deterministic order and safe shape
  const sorted: QuestListFullCache = {
    ...json,
    items: (json.items ?? [])
      .slice()
      .sort((a, b) => a.quest_name.localeCompare(b.quest_name)),
    total:
      typeof json.total === "number" ? json.total : json.items?.length ?? 0,
    updatedAt: json.updatedAt ?? new Date().toISOString(),
  };
  await saveQuestListFullCache(sorted);
  return sorted;
}

/**
 Upsert a quest row into the local IDB cache (after a successful server save).
*/
export async function upsertQuestRowLocal(item: QuestRowFull): Promise<void> {
  const cached = (await loadQuestListFullCache()) ?? {
    items: [],
    total: 0,
    updatedAt: new Date().toISOString(),
  };

  const idx = cached.items.findIndex((q) => q.id === item.id);
  if (idx >= 0) {
    cached.items[idx] = {
      ...cached.items[idx],
      ...item,
      updated_at: item.updated_at ?? new Date().toISOString(),
    };
  } else {
    cached.items.push(item);
  }

  cached.items.sort((a, b) => a.quest_name.localeCompare(b.quest_name));
  cached.total = cached.items.length;
  cached.updatedAt = new Date().toISOString();

  await saveQuestListFullCache(cached);
}

/**
 Remove a quest row locally by id (use after a delete).
*/
export async function removeQuestRowLocal(id: number): Promise<void> {
  const cached = await loadQuestListFullCache();
  if (!cached) return;
  cached.items = cached.items.filter((q) => q.id !== id);
  cached.total = cached.items.length;
  cached.updatedAt = new Date().toISOString();
  await saveQuestListFullCache(cached);
}
export { QuestListFullCache, QuestRowFull };
