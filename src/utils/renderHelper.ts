import type {
  NpcHighlight,
  ObjectHighlight,
  ObjectLocationPoint,
} from "./../state/types";

// Pure render format - what the map needs to draw
export interface NpcRenderItem {
  id: string; // unique key for React
  npcId?: number;
  name: string;
  location: { lat: number; lng: number };
  chatheadOverride?: string;
  wanderRadius: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}

export interface ObjectRenderItem {
  id: string; // unique key for React
  objectId?: number;
  name: string;
  locations: Array<{
    lat: number;
    lng: number;
    color?: string;
    numberLabel?: string;
  }>;
  imageOverride?: string;
  radius: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}

// Pure data transformation - no business logic
export function npcToRenderItem(
  npc: NpcHighlight,
  index: number
): NpcRenderItem | null {
  const loc = npc.npcLocation;

  // Filter out unset locations
  if (!loc || (loc.lat === 0 && loc.lng === 0)) {
    return null;
  }

  return {
    id: `npc-${index}-${npc.id || npc.npcName}`,
    npcId: npc.id,
    name: npc.npcName || `NPC ${index + 1}`,
    location: { lat: loc.lat, lng: loc.lng },
    chatheadOverride: undefined, // Add if you have this in your data
    wanderRadius: npc.wanderRadius || {
      bottomLeft: { lat: 0, lng: 0 },
      topRight: { lat: 0, lng: 0 },
    },
  };
}

export function objectToRenderItem(
  obj: ObjectHighlight,
  index: number
): ObjectRenderItem | null {
  const locations = (obj.objectLocation || []).filter(
    (loc) => loc.lat !== 0 || loc.lng !== 0
  );

  // Filter out objects with no valid locations
  if (locations.length === 0) {
    return null;
  }

  return {
    id: `object-${index}-${obj.id || obj.name}`,
    objectId: obj.id,
    name: obj.name || `Object ${index + 1}`,
    locations: locations.map((loc) => ({
      lat: loc.lat,
      lng: loc.lng,
      color: loc.color,
      numberLabel: loc.numberLabel,
    })),
    imageOverride: undefined, // Add if you have this in your data
    radius: obj.objectRadius || {
      bottomLeft: { lat: 0, lng: 0 },
      topRight: { lat: 0, lng: 0 },
    },
  };
}
