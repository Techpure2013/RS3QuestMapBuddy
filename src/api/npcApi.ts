function getApiBase(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:42069";
  }
  return window.__APP_CONFIG__?.API_BASE ?? window.location.origin;
}

const API_BASE = getApiBase();

export async function searchNpcs(
  name: string,
  limit = 15
): Promise<
  {
    id: number;
    name: string;
    lat: number;
    lng: number;
    floor: number;
  }[]
> {
  // FIX: Use correct endpoint format
  const params = new URLSearchParams({
    name: name.trim(),
    limit: String(limit),
  });

  // Try the correct endpoint
  const res = await fetch(`${API_BASE}/api/npcs/search?${params.toString()}`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `NPC search failed: ${res.status}`);
  }

  const json = await res.json();
  return Array.isArray(json) ? json : json.results ?? json.items ?? [];
}

export async function addNpcLocation(
  npcId: number,
  coord: { lat: number; lng: number; floor: number }
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/npcs/${npcId}/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coord),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to add NPC location: ${res.status}`);
  }
}
