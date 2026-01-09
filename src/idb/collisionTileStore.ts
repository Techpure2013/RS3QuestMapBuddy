// src/idb/collisionTileStore.ts
import { get, set, del, keys } from "idb-keyval";

export interface CachedCollisionTile {
  floor: number;
  fileX: number;
  fileY: number;
  data: Uint8Array;
  fetchedAt: number;
  updatedAt: number;
  size: number;
}

const CACHE_PREFIX = "rs3qb:collision:";
const CACHE_META_KEY = "rs3qb:collision_meta";
const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

interface CollisionCacheMeta {
  totalSize: number;
  itemCount: number;
  lastCleanup: number;
  version: number; // Server collision cache version
}

function getTileKey(floor: number, fileX: number, fileY: number): string {
  return `${CACHE_PREFIX}${floor}_${fileX}_${fileY}`;
}

function parseTileKey(key: string): { floor: number; fileX: number; fileY: number } | null {
  if (!key.startsWith(CACHE_PREFIX)) return null;
  const parts = key.slice(CACHE_PREFIX.length).split("_");
  if (parts.length !== 3) return null;
  const [floor, fileX, fileY] = parts.map(Number);
  if (isNaN(floor) || isNaN(fileX) || isNaN(fileY)) return null;
  return { floor, fileX, fileY };
}

async function getCacheMeta(): Promise<CollisionCacheMeta> {
  const meta = await get<CollisionCacheMeta>(CACHE_META_KEY);
  return meta ?? { totalSize: 0, itemCount: 0, lastCleanup: Date.now(), version: 0 };
}

async function setCacheMeta(meta: CollisionCacheMeta): Promise<void> {
  await set(CACHE_META_KEY, meta);
}

/**
 * Get a cached collision tile
 */
export async function getCollisionTile(
  floor: number,
  fileX: number,
  fileY: number
): Promise<Uint8Array | null> {
  try {
    const key = getTileKey(floor, fileX, fileY);
    const cached = await get<CachedCollisionTile>(key);

    if (!cached) return null;

    // Check if stale (older than TTL)
    const age = Date.now() - cached.fetchedAt;
    if (age > TTL_MS) {
      console.log(`Collision tile ${floor}/${fileX}-${fileY} is stale (${(age / 1000 / 60 / 60 / 24).toFixed(1)} days old)`);
      // Don't delete, just return null to trigger re-fetch
      return null;
    }

    return cached.data;
  } catch (err) {
    console.error("Failed to get cached collision tile:", err);
    return null;
  }
}

/**
 * Store a collision tile in cache
 */
export async function setCollisionTile(
  floor: number,
  fileX: number,
  fileY: number,
  data: Uint8Array
): Promise<void> {
  try {
    const key = getTileKey(floor, fileX, fileY);
    const now = Date.now();

    // Check if we're replacing an existing tile
    const existing = await get<CachedCollisionTile>(key);
    const oldSize = existing?.size ?? 0;

    const cached: CachedCollisionTile = {
      floor,
      fileX,
      fileY,
      data,
      fetchedAt: now,
      updatedAt: now,
      size: data.byteLength,
    };

    await set(key, cached);

    // Update metadata
    const meta = await getCacheMeta();
    meta.totalSize = meta.totalSize - oldSize + data.byteLength;
    if (!existing) {
      meta.itemCount += 1;
    }
    await setCacheMeta(meta);

    console.log(
      `%c💾 Cached collision tile ${floor}/${fileX}-${fileY} (${(data.byteLength / 1024 / 1024).toFixed(2)} MB)`,
      "color: cyan"
    );
  } catch (err) {
    console.error("Failed to cache collision tile:", err);
  }
}

/**
 * Delete a single collision tile from cache
 */
export async function invalidateCollisionTile(
  floor: number,
  fileX: number,
  fileY: number
): Promise<boolean> {
  try {
    const key = getTileKey(floor, fileX, fileY);
    const existing = await get<CachedCollisionTile>(key);

    if (!existing) return false;

    await del(key);

    // Update metadata
    const meta = await getCacheMeta();
    meta.totalSize = Math.max(0, meta.totalSize - existing.size);
    meta.itemCount = Math.max(0, meta.itemCount - 1);
    await setCacheMeta(meta);

    console.log(`%c🗑️ Invalidated collision tile ${floor}/${fileX}-${fileY}`, "color: orange");
    return true;
  } catch (err) {
    console.error("Failed to invalidate collision tile:", err);
    return false;
  }
}

/**
 * Delete multiple collision tiles from cache (batch)
 */
export async function invalidateCollisionTiles(
  tiles: Array<{ floor: number; fileX: number; fileY: number }>
): Promise<number> {
  let deleted = 0;
  let totalSizeFreed = 0;

  for (const tile of tiles) {
    try {
      const key = getTileKey(tile.floor, tile.fileX, tile.fileY);
      const existing = await get<CachedCollisionTile>(key);

      if (existing) {
        await del(key);
        totalSizeFreed += existing.size;
        deleted++;
      }
    } catch (err) {
      console.error(`Failed to invalidate tile ${tile.floor}/${tile.fileX}-${tile.fileY}:`, err);
    }
  }

  if (deleted > 0) {
    // Update metadata
    const meta = await getCacheMeta();
    meta.totalSize = Math.max(0, meta.totalSize - totalSizeFreed);
    meta.itemCount = Math.max(0, meta.itemCount - deleted);
    await setCacheMeta(meta);

    console.log(`%c🗑️ Invalidated ${deleted} collision tiles`, "color: orange");
  }

  return deleted;
}

/**
 * Check if a tile is cached
 */
export async function isTileCached(
  floor: number,
  fileX: number,
  fileY: number
): Promise<boolean> {
  const key = getTileKey(floor, fileX, fileY);
  const cached = await get<CachedCollisionTile>(key);
  if (!cached) return false;

  // Check if stale
  const age = Date.now() - cached.fetchedAt;
  return age <= TTL_MS;
}

/**
 * Get all cached tile keys
 */
export async function getAllCachedTileKeys(): Promise<string[]> {
  const allKeys = await keys();
  return allKeys
    .filter((k) => String(k).startsWith(CACHE_PREFIX) && k !== CACHE_META_KEY)
    .map(String);
}

/**
 * Get list of cached tiles as coordinates
 */
export async function getCachedTileList(): Promise<Array<{ floor: number; fileX: number; fileY: number }>> {
  const tileKeys = await getAllCachedTileKeys();
  const tiles: Array<{ floor: number; fileX: number; fileY: number }> = [];

  for (const key of tileKeys) {
    const parsed = parseTileKey(key);
    if (parsed) {
      tiles.push(parsed);
    }
  }

  return tiles;
}

/**
 * Get cache statistics
 */
export async function getCollisionCacheStats(): Promise<{
  totalSizeMB: number;
  itemCount: number;
  lastCleanup: Date;
  version: number;
}> {
  const meta = await getCacheMeta();
  return {
    totalSizeMB: meta.totalSize / 1024 / 1024,
    itemCount: meta.itemCount,
    lastCleanup: new Date(meta.lastCleanup),
    version: meta.version,
  };
}

/**
 * Update the stored server version
 */
export async function setCollisionCacheVersion(version: number): Promise<void> {
  const meta = await getCacheMeta();
  meta.version = version;
  await setCacheMeta(meta);
}

/**
 * Get the stored server version
 */
export async function getCollisionCacheVersion(): Promise<number> {
  const meta = await getCacheMeta();
  return meta.version;
}

/**
 * Clear all cached collision tiles
 */
export async function clearCollisionTileCache(): Promise<void> {
  const allKeys = await keys();
  const tileKeys = allKeys.filter(
    (k) => String(k).startsWith(CACHE_PREFIX)
  ) as string[];

  for (const key of tileKeys) {
    await del(key);
  }

  await setCacheMeta({ totalSize: 0, itemCount: 0, lastCleanup: Date.now(), version: 0 });
  console.log("%c🗑️ Collision tile cache cleared", "color: orange; font-weight: bold");
}

/**
 * Clean up stale tiles (older than TTL)
 */
export async function cleanupStaleTiles(): Promise<number> {
  const now = Date.now();
  const tileKeys = await getAllCachedTileKeys();
  let cleaned = 0;
  let sizeFreed = 0;

  for (const key of tileKeys) {
    try {
      const cached = await get<CachedCollisionTile>(key);
      if (cached && now - cached.fetchedAt > TTL_MS) {
        await del(key);
        sizeFreed += cached.size;
        cleaned++;
      }
    } catch (err) {
      console.error(`Failed to check tile ${key}:`, err);
    }
  }

  if (cleaned > 0) {
    const meta = await getCacheMeta();
    meta.totalSize = Math.max(0, meta.totalSize - sizeFreed);
    meta.itemCount = Math.max(0, meta.itemCount - cleaned);
    meta.lastCleanup = now;
    await setCacheMeta(meta);

    console.log(`%c🧹 Cleaned up ${cleaned} stale collision tiles (${(sizeFreed / 1024 / 1024).toFixed(1)} MB)`, "color: yellow");
  }

  return cleaned;
}
