export type TargetType = "npc" | "object";
export type CaptureMode = "single" | "multi-point" | "radius" | "wanderRadius";
import type { Clipboard } from "./types";
export interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}

export interface SelectionState {
  selectedStep: number;
  targetType: TargetType;
  targetIndex: number;
  floor: number;
}

export interface UiState {
  panelOpen: boolean;
  showGrids: boolean;
  stepDescriptionEdit: boolean;
  captureMode: CaptureMode;
  wanderRadiusInput: number;
  imageDirectoryName: string;
  areaSearchMode: "object" | null;
  isAlt1Environment: boolean;
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

// Import your Quest types
import type {
  Quest,
  QuestImage,
  NpcHighlight,
  ObjectHighlight,
} from "../state/types";

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
