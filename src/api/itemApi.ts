// src/api/itemApi.ts
import { getApiBase } from "../utils/apiBase";
import { httpJson } from "../utils/http";

export type ItemSearchRow = {
  id: number;
  name: string;
  pHash: string;
};

export async function searchItems(
  search: string,
  limit = 50
): Promise<ItemSearchRow[]> {
  const base = getApiBase();
  const params = new URLSearchParams({
    search: search.trim(),
    limit: String(limit),
  });
  const result = await httpJson<{ items: ItemSearchRow[]; pagination: unknown }>(
    `${base}/api/items?${params.toString()}`,
    { method: "GET" }
  );
  return result.items;
}
