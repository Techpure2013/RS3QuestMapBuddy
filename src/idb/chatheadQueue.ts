// src/idb/chatheadQueue.ts
import { get, set, del } from "idb-keyval";

export type PendingChathead = {
  npcId?: number;
  name?: string;
  variant: string;
  sourceUrl: string;
  step?: number;
  stepDescription?: string;
};

const KEY = "rs3qb:pending_chatheads_v2";

export async function loadPendingChatheads(): Promise<PendingChathead[]> {
  const arr = await get<PendingChathead[]>(KEY);
  return Array.isArray(arr) ? arr : [];
}

export async function addPendingChathead(item: PendingChathead): Promise<void> {
  const list = await loadPendingChatheads();
  const exists = list.some((x) => {
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
  if (!exists) {
    list.push(item);
    await set(KEY, list);
  }
}

export async function removePendingChathead(
  predicate: (item: PendingChathead) => boolean
): Promise<void> {
  const list = await loadPendingChatheads();
  const next = list.filter((x) => !predicate(x));
  await set(KEY, next);
}

export async function clearPendingChatheads(): Promise<void> {
  await del(KEY);
}
