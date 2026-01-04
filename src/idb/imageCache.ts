// src/idb/imageCache.ts
import { get, set, del, keys, clear } from "idb-keyval";

export interface CachedImage {
  url: string;
  blob: Blob;
  fetchedAt: number;
  lastAccessedAt: number;
  size: number;
}

const CACHE_PREFIX = "rs3qb:img_cache:";
const CACHE_META_KEY = "rs3qb:img_cache_meta";
const MAX_CACHE_SIZE_MB = 100; // 100MB limit
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;

// Track failed URLs to avoid repeated fetch attempts
const failedUrls = new Set<string>();

interface CacheMeta {
  totalSize: number;
  itemCount: number;
  lastCleanup: number;
}

function getCacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`;
}

async function getCacheMeta(): Promise<CacheMeta> {
  const meta = await get<CacheMeta>(CACHE_META_KEY);
  return meta ?? { totalSize: 0, itemCount: 0, lastCleanup: Date.now() };
}

async function setCacheMeta(meta: CacheMeta): Promise<void> {
  await set(CACHE_META_KEY, meta);
}

/**
 * Get a cached image by URL
 */
export async function getCachedImage(url: string): Promise<Blob | null> {
  try {
    const cacheKey = getCacheKey(url);
    const cached = await get<CachedImage>(cacheKey);

    if (!cached) return null;

    // Update last accessed time
    cached.lastAccessedAt = Date.now();
    await set(cacheKey, cached);

    return cached.blob;
  } catch (err) {
    console.error("Failed to get cached image:", err);
    return null;
  }
}

/**
 * Cache an image blob
 */
export async function setCachedImage(url: string, blob: Blob): Promise<void> {
  try {
    const size = blob.size;
    const now = Date.now();
    const cacheKey = getCacheKey(url);

    // Check if we need to make space
    const meta = await getCacheMeta();
    if (meta.totalSize + size > MAX_CACHE_SIZE_BYTES) {
      await evictOldestImages(size);
    }

    // Store the image
    const cached: CachedImage = {
      url,
      blob,
      fetchedAt: now,
      lastAccessedAt: now,
      size,
    };

    await set(cacheKey, cached);

    // Update metadata
    const newMeta = await getCacheMeta();
    newMeta.totalSize += size;
    newMeta.itemCount += 1;
    await setCacheMeta(newMeta);

    console.log(
      `Cached image: ${url} (${(size / 1024).toFixed(1)} KB) - Total cache: ${(
        newMeta.totalSize /
        1024 /
        1024
      ).toFixed(1)} MB`
    );
  } catch (err) {
    console.error("Failed to cache image:", err);
  }
}

/**
 * Evict oldest (least recently accessed) images to make space
 */
async function evictOldestImages(spaceNeeded: number): Promise<void> {
  console.log("Evicting old images to make space...");

  const allKeys = await keys();
  const imageKeys = allKeys.filter((k) =>
    String(k).startsWith(CACHE_PREFIX)
  ) as string[];

  // Load all cached images and sort by last accessed time
  const entries: Array<{ key: string; cached: CachedImage }> = [];
  for (const key of imageKeys) {
    const cached = await get<CachedImage>(key);
    if (cached) {
      entries.push({ key, cached });
    }
  }

  entries.sort((a, b) => a.cached.lastAccessedAt - b.cached.lastAccessedAt);

  // Remove oldest until we have enough space (plus 20% buffer)
  const targetSpace = spaceNeeded * 1.2;
  let freedSpace = 0;

  for (const entry of entries) {
    if (freedSpace >= targetSpace) break;

    await del(entry.key);
    freedSpace += entry.cached.size;
    console.log(`Evicted: ${entry.cached.url}`);
  }

  // Update metadata
  const meta = await getCacheMeta();
  meta.totalSize = Math.max(0, meta.totalSize - freedSpace);
  meta.itemCount = Math.max(0, meta.itemCount - entries.length);
  meta.lastCleanup = Date.now();
  await setCacheMeta(meta);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalSizeMB: number;
  itemCount: number;
  lastCleanup: Date;
}> {
  const meta = await getCacheMeta();
  return {
    totalSizeMB: meta.totalSize / 1024 / 1024,
    itemCount: meta.itemCount,
    lastCleanup: new Date(meta.lastCleanup),
  };
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<void> {
  const allKeys = await keys();
  const imageKeys = allKeys.filter((k) =>
    String(k).startsWith(CACHE_PREFIX)
  ) as string[];

  for (const key of imageKeys) {
    await del(key);
  }

  await setCacheMeta({ totalSize: 0, itemCount: 0, lastCleanup: Date.now() });
  console.log("Image cache cleared");
}

// Track in-flight fetches to prevent duplicate requests (includes cache checks)
const pendingFetches = new Map<string, Promise<Blob>>();


/**
 * Fetch an image with caching - silently skips URLs that have failed before
 */
export async function fetchImageWithCache(url: string): Promise<Blob> {
  // Already failed before - silently reject
  if (failedUrls.has(url)) {
    throw new Error("URL previously failed");
  }

  // Check if there's already a pending operation for this URL
  const pending = pendingFetches.get(url);
  if (pending) {
    return pending;
  }

  // Create the full operation promise and store it IMMEDIATELY
  const operationPromise = (async () => {
    // Try cache first
    const cached = await getCachedImage(url);
    if (cached) {
      return cached;
    }

    // Fetch from network
    const response = await fetch(url);
    if (!response.ok) {
      failedUrls.add(url);
      throw new Error("Fetch failed");
    }

    const blob = await response.blob();
    void setCachedImage(url, blob);
    return blob;
  })();

  // Store the promise BEFORE awaiting it
  pendingFetches.set(url, operationPromise);

  // Clean up and mark as failed on error
  operationPromise.catch(() => {
    failedUrls.add(url);
  }).finally(() => {
    pendingFetches.delete(url);
  });

  return operationPromise;
}
