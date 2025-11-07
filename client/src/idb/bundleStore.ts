import { get, set, del } from "idb-keyval";
import type { QuestBundleNormalized } from "../state/types";

const ACTIVE_BUNDLE_KEY = "active-quest-bundle";

export async function saveActiveBundle(
  b: QuestBundleNormalized
): Promise<void> {
  await set(ACTIVE_BUNDLE_KEY, { ...b, updatedAt: new Date().toISOString() });
}

export async function loadActiveBundle(): Promise<QuestBundleNormalized | null> {
  return (await get(ACTIVE_BUNDLE_KEY)) ?? null;
}

export async function clearActiveBundle(): Promise<void> {
  await del(ACTIVE_BUNDLE_KEY);
}
