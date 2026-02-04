// src/api/mapLocationsApi.ts
import { getApiBase } from "../utils/apiBase";
import { httpJson } from "../utils/http";

export interface MapLocation {
  mapId: number;
  name: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

export interface MapLocationInput {
  mapId: number;
  name: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

/**
 * Fetch all map locations with optional search filter
 */
export async function getMapLocations(search?: string, limit = 100): Promise<MapLocation[]> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (search && search.length >= 2) {
    params.set("search", search);
  }
  params.set("limit", String(limit));

  return httpJson<MapLocation[]>(`${base}/api/map-locations?${params.toString()}`, {
    method: "GET",
  });
}

/**
 * Get a single map location by ID
 */
export async function getMapLocation(mapId: number): Promise<MapLocation> {
  const base = getApiBase();
  return httpJson<MapLocation>(`${base}/api/map-locations/${mapId}`, {
    method: "GET",
  });
}

/**
 * Get the next available map ID
 */
export async function getNextMapId(): Promise<number> {
  const base = getApiBase();
  const result = await httpJson<{ nextId: number }>(`${base}/api/map-locations/next-id`, {
    method: "GET",
  });
  return result.nextId;
}

/**
 * Create a new map location
 */
export async function createMapLocation(location: MapLocationInput): Promise<{ ok: true; mapId: number }> {
  const base = getApiBase();
  return httpJson<{ ok: true; mapId: number }>(`${base}/api/map-locations`, {
    method: "POST",
    body: location,
  });
}

/**
 * Update an existing map location
 */
export async function updateMapLocation(
  mapId: number,
  updates: Partial<Omit<MapLocationInput, "mapId">>
): Promise<{ ok: true }> {
  const base = getApiBase();
  return httpJson<{ ok: true }>(`${base}/api/map-locations/${mapId}`, {
    method: "PUT",
    body: updates,
  });
}

/**
 * Delete a map location
 */
export async function deleteMapLocation(mapId: number): Promise<{ ok: true }> {
  const base = getApiBase();
  return httpJson<{ ok: true }>(`${base}/api/map-locations/${mapId}`, {
    method: "DELETE",
  });
}
