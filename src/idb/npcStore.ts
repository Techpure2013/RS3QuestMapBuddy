import { get, set, del } from "idb-keyval";

// Note to myself: Bump this key if you change the cache shape
const NPC_CACHE_KEY = "npc-cache-v1";

export type NpcLite = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  floor: number;
};

export type NpcCache = {
  byId: Record<
    number,
    {
      id: number;
      name: string;
      locations: Array<{ lat: number; lng: number; floor: number }>;
      updatedAt: string;
    }
  >;
};

export async function loadNpcCache(): Promise<NpcCache> {
  return (await get(NPC_CACHE_KEY)) ?? { byId: {} };
}

export async function saveNpcCache(cache: NpcCache): Promise<void> {
  await set(NPC_CACHE_KEY, cache);
}

/**
 * Merge search results into cache. Each result row is one location for an NPC.
 * De-duplicates identical {lat,lng,floor}.
 */
export function addNpcSearchResultsToCache(
  cache: NpcCache,
  results: NpcLite[]
): NpcCache {
  const next: NpcCache = { byId: { ...cache.byId } };

  for (const r of results) {
    const entry = next.byId[r.id];
    const loc = { lat: r.lat, lng: r.lng, floor: r.floor ?? 0 };

    if (!entry) {
      next.byId[r.id] = {
        id: r.id,
        name: r.name,
        locations: [loc],
        updatedAt: new Date().toISOString(),
      };
      continue;
    }

    // Update name if changed (defensive)
    if (entry.name !== r.name) entry.name = r.name;

    const exists = entry.locations.some(
      (l) =>
        l.lat === loc.lat && l.lng === loc.lng && (l.floor ?? 0) === loc.floor
    );
    if (!exists) {
      entry.locations.push(loc);
      entry.updatedAt = new Date().toISOString();
    }
  }

  return next;
}

/**
 * Append a single location to an NPC in cache (e.g., after POST add).
 */
export function addNpcLocationToCache(
  cache: NpcCache,
  id: number,
  name: string,
  coord: { lat: number; lng: number; floor?: number }
): NpcCache {
  const next: NpcCache = { byId: { ...cache.byId } };
  const loc = { lat: coord.lat, lng: coord.lng, floor: coord.floor ?? 0 };

  const entry = next.byId[id];
  if (!entry) {
    next.byId[id] = {
      id,
      name,
      locations: [loc],
      updatedAt: new Date().toISOString(),
    };
    return next;
  }

  // Update name if changed
  if (entry.name !== name) entry.name = name;

  const exists = entry.locations.some(
    (l) =>
      l.lat === loc.lat && l.lng === loc.lng && (l.floor ?? 0) === loc.floor
  );
  if (!exists) {
    entry.locations.push(loc);
    entry.updatedAt = new Date().toISOString();
  }
  return next;
}

export async function clearNpcCache(): Promise<void> {
  await del(NPC_CACHE_KEY);
}
