import type { Clipboard } from "./types"; // Import your Quest types
import type {
  Quest,
  QuestImage,
  NpcHighlight,
  ObjectHighlight,
} from "../state/types";
import { PlotSubmissionRow } from "./../api/plotSubmissionsAdmin";
export interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}
export type TargetType = "npc" | "object";
export type CaptureMode = "single" | "multi-point" | "radius" | "wanderRadius";
export type RestrictedPlotMode = {
  enabled: boolean;
  stepIndex: number;
  stepId: number;
  allowNpc: boolean;
  allowObject: boolean;
  allowRadius: boolean;
  defaultPlayerName?: string;
};
export interface PlotPayload {
  playerName: string;
  stepId: number;
  floor: number;
  highlights: {
    npc: PlotNpcHighlight[];
    object: PlotObjectHighlight[];
  };
}

export interface PlotNpcHighlight {
  id?: number;
  npcName: string;
  npcLocation: { lat: number; lng: number };
  wanderRadius?: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}

export interface PlotObjectHighlight {
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
}
export interface SelectionState {
  selectedStep: number;
  targetType: TargetType;
  targetIndex: number;
  floor: number;
  chatheadVariant: string;
  // Hover state for highlighting individual points on the map
  hoveredTargetType?: TargetType | null;
  hoveredTargetIndex?: number | null;
  hoveredLocationIndex?: number | null; // For object location points within hoveredTargetIndex
}

export interface UiState {
  panelOpen: boolean;
  showGrids: boolean;
  stepDescriptionEdit: boolean;
  captureMode: CaptureMode;
  wanderRadiusInput: number;
  imageDirectoryName: string;
  areaSearchMode: "object" | null;

  targetZoom?: number;
  areaZoom?: number;

  flyToTargetRequest?: {
    token: number;
    source?: "selection" | "quest-load" | "auto-select" | "external";
  };
  areaFlyRequest?: {
    token: number;
    area: {
      name: string;
      bounds: [[number, number], [number, number]];
      center: [number, number];
      mapId: number;
    };
    preferredZoom?: number;
  };

  targetNavSeq?: number;
  areaNavSeq?: number;

  captureNavReturnRequest?: { token: number; includeSelection?: boolean };
  restoreViewRequest?: { token: number; clearReturn?: boolean };
  captureNavSeq?: number;
  restoreNavSeq?: number;
  selectedObjectColor: string;
  objectNumberLabel: string;
  navReturn?: {
    center: { lat: number; lng: number };
    zoom: number;
    floor: number;
    selection?: SelectionState;
  };

  restrictedMode?: RestrictedPlotMode | null;
  previewSubmission?: PlotSubmissionRow | null;
  isAlt1Environment: boolean;
  radiusFirstCorner?: { lat: number; lng: number } | null;
  showAllPaths?: boolean;
  isGeneratingPath?: boolean;
  showCollisionDebug?: boolean;
  showTransportDebug?: boolean;
  transportDisplayMode?: "nodes" | "links" | "all";
  transportCategory?: "all" | "vertical" | "teleport" | "fairy_ring" | "spirit_tree" | "aerial" | "ground" | "water" | "shortcuts";
  transportEditMode?: boolean;
  // Path editing
  pathEditMode?: boolean;
  selectedWaypointIndex?: number | null;
  // Focus target name input after adding new NPC/Object
  focusTargetName?: boolean;

  // Map location recording mode (click center, then click corners for bounds)
  mapLocationRecordMode?: "center" | "corner1" | "corner2" | null;
  mapLocationCenter?: { lat: number; lng: number } | null;
  mapLocationCorner1?: { lat: number; lng: number } | null;
}

export interface HighlightNpc {
  id: number;
  name: string;
  lat: number;
  lng: number;
  floor: number;
}
export interface HighlightObject {
  id: number;
  name: string;
  lat: number;
  lng: number;
  floor: number;
}

export interface HighlightState {
  highlightedNpc: HighlightNpc | null;
  highlightedObject: HighlightObject | null;
  selectedObjectFromSearch: HighlightObject | null;
  selectedArea: MapArea | null;
}

export interface ObjectNPCClipboard {
  type: Clipboard;
  data: unknown | null;
}

export interface EditorState {
  version: number;
  quest: Quest | null;
  clipboard: Clipboard;
  selection: SelectionState;
  ui: UiState;
  highlights: HighlightState;
}

// Helpful derived selectors contract
export interface DerivedSelectors {
  selectedStep(): Quest["questSteps"][number] | undefined;
  currentTarget(): NpcHighlight | ObjectHighlight | undefined;
  canRecordNpcLocation(): boolean;
}
