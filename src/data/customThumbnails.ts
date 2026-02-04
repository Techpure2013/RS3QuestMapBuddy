/**
 * Custom thumbnail storage for user-added quick insert icons
 * Uses localStorage for persistence
 */

import type { QuickInsertThumbnail } from "./quickInsertThumbnails";

const STORAGE_KEY = "rs3quest_custom_thumbnails";

export interface CustomThumbnail extends QuickInsertThumbnail {
  isCustom: true;
}

/**
 * Load custom thumbnails from localStorage
 */
export function loadCustomThumbnails(): CustomThumbnail[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: any) => ({ ...t, isCustom: true as const }));
  } catch {
    return [];
  }
}

/**
 * Save custom thumbnails to localStorage
 */
export function saveCustomThumbnails(thumbnails: CustomThumbnail[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thumbnails));
  } catch (e) {
    console.error("Failed to save custom thumbnails:", e);
  }
}

/**
 * Add a new custom thumbnail
 */
export function addCustomThumbnail(thumbnail: Omit<CustomThumbnail, "id" | "isCustom">): CustomThumbnail {
  const existing = loadCustomThumbnails();
  const newThumbnail: CustomThumbnail = {
    ...thumbnail,
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isCustom: true,
  };
  saveCustomThumbnails([...existing, newThumbnail]);
  return newThumbnail;
}

/**
 * Delete a custom thumbnail by ID
 */
export function deleteCustomThumbnail(id: string): void {
  const existing = loadCustomThumbnails();
  const filtered = existing.filter((t) => t.id !== id);
  saveCustomThumbnails(filtered);
}

/**
 * Update a custom thumbnail
 */
export function updateCustomThumbnail(id: string, updates: Partial<Omit<CustomThumbnail, "id" | "isCustom">>): void {
  const existing = loadCustomThumbnails();
  const updated = existing.map((t) => (t.id === id ? { ...t, ...updates } : t));
  saveCustomThumbnails(updated);
}

/**
 * Export custom thumbnails as JSON string for sharing
 */
export function exportCustomThumbnails(): string {
  const thumbnails = loadCustomThumbnails();
  return JSON.stringify(thumbnails, null, 2);
}

/**
 * Import custom thumbnails from JSON string
 * Returns count of imported thumbnails
 */
export function importCustomThumbnails(jsonString: string, mode: 'merge' | 'replace' = 'merge'): number {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array');
    }

    // Validate each thumbnail has required fields
    const validThumbnails = imported.filter((t: any) =>
      t.name && t.imageUrl && typeof t.defaultSize === 'number'
    ).map((t: any) => ({
      ...t,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true as const,
    }));

    if (mode === 'replace') {
      saveCustomThumbnails(validThumbnails);
    } else {
      const existing = loadCustomThumbnails();
      saveCustomThumbnails([...existing, ...validThumbnails]);
    }

    return validThumbnails.length;
  } catch (e) {
    console.error('Failed to import thumbnails:', e);
    throw e;
  }
}
