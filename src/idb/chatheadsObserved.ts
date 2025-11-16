// src/idb/chatheadsObserved.ts
import { get, set } from "idb-keyval";

export type ObservedChathead = {
  npcId?: number;
  name?: string;
  variant: string;
  sourceUrl: string;
  count: number;
  firstObservedAt: number;
  lastObservedAt: number;
  step?: number;
  stepDescription?: string;
};

const KEY = "rs3qb:observed_chatheads_v2";

export async function loadObservedChatheads(): Promise<ObservedChathead[]> {
  const arr = await get<ObservedChathead[]>(KEY);
  return Array.isArray(arr) ? arr : [];
}

export async function recordObservedChathead(
  item: Omit<ObservedChathead, "count" | "firstObservedAt" | "lastObservedAt">
): Promise<void> {
  const list = await loadObservedChatheads();
  const now = Date.now();

  const idx = list.findIndex((x) => {
    const sameId = x.npcId && item.npcId ? x.npcId === item.npcId : false;
    const sameName =
      x.name && item.name
        ? x.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        : false;
    const sameIdentity = sameId || sameName;
    return (
      sameIdentity &&
      x.variant.toLowerCase() === item.variant.toLowerCase() &&
      x.sourceUrl === item.sourceUrl
    );
  });

  if (idx >= 0) {
    const cur = list[idx];
    list[idx] = {
      ...cur,
      count: Math.min(cur.count + 1, 1_000_000),
      lastObservedAt: now,
      step: item.step, // Update to latest step
      stepDescription: item.stepDescription,
    };
  } else {
    list.push({
      ...item,
      count: 1,
      firstObservedAt: now,
      lastObservedAt: now,
    });
  }
  await set(KEY, list);
}

export async function removeObservedChatheads(
  predicate: (x: ObservedChathead) => boolean
): Promise<void> {
  const list = await loadObservedChatheads();
  const next = list.filter((x) => !predicate(x));
  await set(KEY, next);
}

export async function clearObservedChatheads(): Promise<void> {
  await set(KEY, []);
}
