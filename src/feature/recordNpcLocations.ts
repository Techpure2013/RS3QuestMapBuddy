import { addNpcLocation } from "../api/npcApi";
import {
  loadNpcCache,
  saveNpcCache,
  addNpcLocationToCache,
} from "../idb/npcStore";

/**
 Explicitly persist a new NPC location to DB and local persistent cache.
 Idempotent on server: exact duplicates are ignored.
*/
export async function recordNpcLocation(
  npcId: number,
  npcName: string,
  coord: { lat: number; lng: number; floor: number }
): Promise<void> {
  // Persist to DB (server dedups exact matches)
  await addNpcLocation(npcId, coord);

  // Persist/merge to local cache
  const cache = await loadNpcCache();
  const next = addNpcLocationToCache(cache, npcId, npcName, coord);
  await saveNpcCache(next);
}
