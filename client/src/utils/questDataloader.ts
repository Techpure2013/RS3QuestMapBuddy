// src/utils/questDataLoader.ts
import type {
  MemberRequirement,
  OfficialLength,
  QuestDetails,
} from "./../state/types";
export interface QuestInfo {
  Quest: string;
  StartPoint: string;
  MemberRequirement: MemberRequirement;
  OfficialLength: OfficialLength;
  Requirements: string[];
  ItemsRequired: string[];
  Recommended: string[];
  EnemiesToDefeat: string[];
}

export interface QuestDatabase {
  [questName: string]: QuestInfo;
}

// In-memory caches (session-only)
let questDatabaseCache: QuestDatabase = {};
let questDataArrayCache: QuestInfo[] = [];

// API base
const API_BASE = window.__APP_CONFIG__?.API_BASE ?? window.location.origin;

function normalizeQuestInfo(q: QuestInfo): QuestInfo {
  return {
    Quest: q.Quest,
    StartPoint: q.StartPoint ?? "",
    MemberRequirement: q.MemberRequirement as MemberRequirement,
    OfficialLength: q.OfficialLength as OfficialLength,
    Requirements: q.Requirements ?? [],
    ItemsRequired: q.ItemsRequired ?? [],
    Recommended: q.Recommended ?? [],
    EnemiesToDefeat: q.EnemiesToDefeat ?? [],
  };
}

// Fetch details from API bundle for a single quest
async function fetchQuestDetailsFromApi(
  questName: string
): Promise<QuestInfo | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/quests/${encodeURIComponent(questName)}/bundle`
    );
    if (!res.ok) return null;
    const bundle = await res.json();
    if (!bundle || !bundle.details) return null;

    // bundle.details already matches QuestInfo shape
    return normalizeQuestInfo(bundle.details as QuestInfo);
  } catch (e) {
    console.error("Failed to fetch quest details from API:", e);
    return null;
  }
}

/**
Init the in-memory caches.
Kept for symmetry; starts empty and fills via getQuestInfo().
*/
export const loadQuestDatabase = async (): Promise<QuestDatabase> => {
  questDatabaseCache = {};
  questDataArrayCache = [];
  return questDatabaseCache;
};

/**
Update a quest’s details in the in-memory cache (for UI coherence).
Authoritative persistence is via PUT /api/quests/:name/bundle elsewhere.
*/
export const updateQuestInDatabase = async (
  updatedQuestInfo: QuestInfo
): Promise<void> => {
  const normalized = normalizeQuestInfo(updatedQuestInfo);

  // Update object cache
  questDatabaseCache[normalized.Quest] = normalized;

  // Update array cache
  const idx = questDataArrayCache.findIndex(
    (q) => q.Quest === normalized.Quest
  );
  if (idx > -1) {
    questDataArrayCache[idx] = normalized;
  } else {
    questDataArrayCache.push(normalized);
  }
};

/**
Get details for a specific quest.
- Returns cached details if present.
- Otherwise fetches from API and caches the result.
*/
export const getQuestInfo = async (
  questName: string
): Promise<QuestInfo | null> => {
  const cached = questDatabaseCache[questName];
  if (cached) return cached;

  const apiDetails = await fetchQuestDetailsFromApi(questName);
  if (apiDetails) {
    // cache it
    questDatabaseCache[apiDetails.Quest] = apiDetails;
    questDataArrayCache.push(apiDetails);
    return apiDetails;
  }
  return null;
};

/**
Returns the current in-memory array cache as JSON (for export/debug).
Since we're "new only", this reflects whatever has been fetched or edited
during the session.
*/
export const getQuestDatabaseAsJsonString = async (): Promise<string> => {
  // No legacy load; just stringify what we have
  return JSON.stringify(questDataArrayCache, null, 2);
};
