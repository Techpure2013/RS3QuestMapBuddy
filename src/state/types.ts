/* ==========================================================================
   RS3 Quest Buddy - Types
   ========================================================================== */

import { PlotSubmissionRow } from "./../api/plotSubmissionsAdmin";
import { PlotPayload } from "./model";
import { getApiBase } from "../utils/apiBase";

export async function submitPlot(input: {
  playerName: string;
  stepId: number;
  floor?: number;
  highlights: {
    npc: Array<{
      id?: number;
      npcName: string;
      npcLocation: { lat: number; lng: number };
      wanderRadius?: {
        bottomLeft: { lat: number; lng: number };
        topRight: { lat: number; lng: number };
      };
    }>;
    object: Array<{
      id?: number;
      name: string;
      objectLocation: Array<{
        lat: number;
        lng: number;
        color?: string;
        numberLabel?: string;
      }>;
      objectRadius?: {
        bottomLeft: { lat: number; lng: number };
        topRight: { lat: number; lng: number };
      };
    }>;
  };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/plot-submissions`, {
    method: "POST",
    credentials: "omit", // public
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    try {
      return (await res.json()) as { ok: false; error: string };
    } catch {
      return { ok: false, error: `HTTP ${res.status}` };
    }
  }
  return (await res.json()) as { ok: true };
}

/* ==========================================================================
   Enums
   ========================================================================== */

// Keep in sync with server enums (server handlers/db/schema.ts)
export type QuestSeries =
  | "No Series"
  | "Delrith"
  | "Pirate"
  | "Fairy"
  | "Camelot"
  | "Gnome"
  | "Elf (Prifddinas)"
  | "Ogre"
  | "Elemental Workshop"
  | "Myreque"
  | "Troll"
  | "Fremennik"
  | "Desert"
  | "Cave Goblin"
  | "Dwarf (Red Axe)"
  | "Temple Knight"
  | "Enchanted Key"
  | "Odd Old Man"
  | "Wise Old Man"
  | "Penguin"
  | "TzHaar"
  | "Summer"
  | "Thieves' Guild"
  | "Void Knight"
  | "Fremennik Sagas"
  | "Ozan"
  | "Doric's Tasks"
  | "Boric's Tasks"
  | "Ariane"
  | "Tales of the Arc"
  | "Violet Tendencies"
  | "Seasons"
  | "Mahjarrat Mysteries"
  | "Sliske's Game"
  | "The Elder God Wars"
  | "Legacy of Zamorak"
  | "Fort Forinthry"
  | "The First Necromancer"
  | "City of Um";

export type QuestAge =
  | "Ambiguous"
  | "None"
  | "Fifth or Sixth Age"
  | "Fifth Age"
  | "Ambiguous (Fits into Either Ages)"
  | "Sixth Age"
  | "Age of Chaos";

export type MemberRequirement = "Free to Play" | "Members Only";

export type OfficialLength =
  | "Very Short"
  | "Short"
  | "Short to Medium"
  | "Medium"
  | "Medium to Long"
  | "Long"
  | "Very Long"
  | "Very Very Long";

/* ==========================================================================
   Highlights (NPC / Object)
   ========================================================================== */

export type NpcLocation = { lat: number; lng: number };

export type NpcWanderRadius = {
  bottomLeft: NpcLocation;
  topRight: NpcLocation;
};
export type ValidationResult =
  | { ok: true; payload: PlotPayload }
  | { ok: false; error: string };
export type NpcHighlight = {
  id?: number;
  npcName: string;
  npcLocation: NpcLocation;
  wanderRadius?: NpcWanderRadius;
  floor?: number;
};
export type AdminFilter = {
  quest?: string;
  stepId?: number;
};

export type AdminAction = "approve" | "reject" | "preview";

export type AdminState = {
  items: PlotSubmissionRow[];
  selectedId: number | null;
  filter: AdminFilter;
  loading: boolean;
  processing: boolean;
  error: string | null;
};

export type SubmissionStats = {
  total: number;
  byQuest: Record<string, number>;
  byPlayer: Record<string, number>;
};
export type ObjectLocationPoint = {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
};

export type ObjectRadius = {
  bottomLeft: NpcLocation;
  topRight: NpcLocation;
};

export type ObjectHighlight = {
  id?: number;
  name: string;
  objectLocation: ObjectLocationPoint[];
  objectRadius?: ObjectRadius;
  floor?: number;
};

export type QuestHighlights = {
  npc: NpcHighlight[];
  object: ObjectHighlight[];
};

/* ==========================================================================
   Clipboard (discriminated union)
   ========================================================================== */

export type Clipboard =
  | { type: "none"; data: null }
  | { type: "npc"; data: NpcHighlight }
  | { type: "object"; data: ObjectHighlight }
  | { type: "npc-list"; data: NpcHighlight[] }
  | { type: "object-list"; data: ObjectHighlight[] };

/* ==========================================================================
   Quest Details / Steps / Images
   ========================================================================== */

export type QuestDetails = {
  Quest: string;
  StartPoint: string;
  MemberRequirement: MemberRequirement;
  OfficialLength: OfficialLength;
  Requirements: string[];
  ItemsRequired: string[];
  Recommended: string[];
  EnemiesToDefeat: string[];
};

export type QuestStep = {
  stepDescription: string;
  itemsNeeded?: string[];
  itemsRecommended?: string[];
  additionalStepInformation?: string[];
  highlights: QuestHighlights;
  floor: number;
};

export type QuestImage = {
  step: string;
  src: string;
  height: number;
  width: number;
  stepDescription: string;
};

/* ==========================================================================
   Editor Shape (flat quest)
   ========================================================================== */

export type Quest = {
  questName: string;
  questSteps: QuestStep[];
  questDetails: QuestDetails;
  questImages: QuestImage[];
  rewards: QuestRewards;
};

/* ==========================================================================
   Bundle / Normalized Shapes (API & IDB)
   ========================================================================== */

export type NormalizedQuestStep = {
  stepDescription: string;
  itemsNeeded: string[];
  itemsRecommended: string[];
  additionalStepInformation: string[];
  highlights: QuestHighlights;
  floor: number;
};

export type QuestBundle = {
  quest: { name: string };
  details: QuestDetails;
  steps: QuestStep[];
  images: QuestImage[];
  rewards: QuestRewards;
};

export type QuestBundleNormalized = {
  quest: { name: string };
  details: QuestDetails;
  steps: NormalizedQuestStep[];
  images: QuestImage[];
  rewards: QuestRewards;
};

/* ==========================================================================
   Mappers: Bundle <-> Editor Quest
   ========================================================================== */
type StepIn = {
  stepNumber?: number;
  stepDescription?: string;
  itemsNeeded?: unknown;
  itemsRecommended?: unknown;
  additionalStepInformation?: unknown;
  highlights?: QuestHighlights;
  floor?: number;
};
export type PlotQuestBundle = {
  quest: { name: string };
  details: {
    Quest: string;
    StartPoint: string;
    MemberRequirement: string;
    OfficialLength: string;
    Requirements: string[];
    ItemsRequired: string[];
    Recommended: string[];
    EnemiesToDefeat: string[];
  };
  steps: Array<{
    stepNumber: number;
    stepDescription: string;
    itemsNeeded: string[];
    itemsRecommended: string[];
    additionalStepInformation: string[];
    highlights: {
      npc: unknown[];
      object: unknown[];
    };
    floor: number;
    // Server can add this; we consume it if present
    stepId?: number;
  }>;
  images: Array<{
    step: string;
    src: string;
    height: number;
    width: number;
    stepDescription: string;
  }>;
  // Optional fields your server may add
  rewards?: { questPoints: number; questRewards: string[] };
  updatedAt?: string;
  totalSteps?: number;
};
const toLinesArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "")).filter(Boolean);
  if (v == null) return [];
  const raw = String(v);

  const looksJsonString =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'")) ||
    raw.includes('\\"');

  if (looksJsonString) {
    try {
      const parsed = JSON.parse(raw);
      return String(parsed)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      // ignore
    }
  }

  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
};
export function bundleToQuest(b: QuestBundle): Quest {
  const stepsIn = (b.steps as StepIn[] | undefined) ?? [];
  const sorted = stepsIn
    .slice()
    .sort((s1, s2) => (s1.stepNumber ?? 0) - (s2.stepNumber ?? 0));
  const rewards: QuestRewards = b.rewards ?? {
    questPoints: 0,
    questRewards: [],
  };
  return {
    questName: b.quest.name,
    questSteps: sorted.map((s) => ({
      stepDescription: s.stepDescription ?? "",
      itemsNeeded: toLinesArray(s.itemsNeeded),
      itemsRecommended: toLinesArray(s.itemsRecommended),
      additionalStepInformation: toLinesArray(s.additionalStepInformation),
      highlights: s.highlights ?? { npc: [], object: [] },
      floor: Number.isFinite(s.floor as number) ? (s.floor as number) : 0,
    })),
    questDetails: {
      Quest: b.details.Quest,
      StartPoint: b.details.StartPoint ?? "",
      MemberRequirement: b.details.MemberRequirement,
      OfficialLength: b.details.OfficialLength,
      Requirements: b.details.Requirements ?? [],
      ItemsRequired: b.details.ItemsRequired ?? [],
      Recommended: b.details.Recommended ?? [],
      EnemiesToDefeat: b.details.EnemiesToDefeat ?? [],
    },
    questImages: (b.images ?? []).map((img) => ({
      step: String(img.step ?? ""),
      src: img.src ?? "",
      width: typeof img.width === "number" ? img.width : 0,
      height: typeof img.height === "number" ? img.height : 0,
      stepDescription: img.stepDescription ?? "",
    })),
    rewards,
  };
}
export type DockZoneId = "left" | "right";
export type PanelId =
  | "npcSearch"
  | "objectSearch"
  | "mapAreaSearch"
  | "npcObjectTools"
  | "chatheads"
  | "itemsNeeded"
  | "itemsRecommended"
  | "additionalInfo"
  | "questDetails"
  | "questImagePaste"
  | "questImages"
  | "stepEditor";

export type DockLayout = {
  zones: Record<DockZoneId, PanelId[]>;
  hidden: PanelId[];
};

export type PanelSpec = {
  id: PanelId;
  title: string;
  render: () => React.ReactElement;
};
export type QuestRewards = {
  questPoints: number;
  questRewards: string[];
};
export type PanelRegistry = Record<PanelId, PanelSpec>;
export const DOCK_ZONES: ReadonlyArray<DockZoneId> = ["left", "right"] as const;
export function questToBundle(q: Quest): QuestBundleNormalized {
  return {
    quest: { name: q.questName },
    details: {
      Quest: q.questDetails.Quest,
      StartPoint: q.questDetails.StartPoint ?? "",
      MemberRequirement: q.questDetails.MemberRequirement,
      OfficialLength: q.questDetails.OfficialLength,
      Requirements: q.questDetails.Requirements ?? [],
      ItemsRequired: q.questDetails.ItemsRequired ?? [],
      Recommended: q.questDetails.Recommended ?? [],
      EnemiesToDefeat: q.questDetails.EnemiesToDefeat ?? [],
    },
    steps: (q.questSteps ?? []).map((s) => ({
      stepDescription: s.stepDescription ?? "",
      itemsNeeded: toLinesArray(s.itemsNeeded),
      itemsRecommended: toLinesArray(s.itemsRecommended),
      additionalStepInformation: toLinesArray(s.additionalStepInformation),
      highlights: s.highlights ?? { npc: [], object: [] },
      floor: Number.isFinite(s.floor) ? s.floor : 0,
    })),
    images: (q.questImages ?? []).map((img) => ({
      step: String(img.step ?? ""), // ENSURE STRING
      src: img.src,
      width: img.width,
      height: img.height,
      stepDescription: img.stepDescription ?? "",
    })),
    rewards: q.rewards ?? { questPoints: 0, questRewards: [] },
  };
}
