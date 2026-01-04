// src/keybinds/defaults.ts
// Default keybind registry - all keybinds start unassigned

import type { KeybindDef } from "./types";
import { keybindStore } from "./keybindStore";

export const DEFAULT_KEYBINDS: KeybindDef[] = [
  // ============================================================================
  // Collision Editor
  // ============================================================================
  {
    id: "collision.toggle",
    label: "Toggle Collision Editor",
    description: "Enable or disable the collision editing mode",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.walkable",
    label: "Walkable Mode",
    description: "Set collision editor to paint walkable tiles",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.blocked",
    label: "Blocked Mode",
    description: "Set collision editor to paint blocked tiles",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.rectangle",
    label: "Rectangle Shape",
    description: "Use filled rectangle for collision editing",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.line",
    label: "Line/Wall Shape",
    description: "Draw walls along tile boundaries (blocks movement perpendicular to line)",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.nudgeUp",
    label: "Nudge Last Edit Up",
    description: "Move the last collision edit up by 1 tile",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.nudgeDown",
    label: "Nudge Last Edit Down",
    description: "Move the last collision edit down by 1 tile",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.nudgeLeft",
    label: "Nudge Last Edit Left",
    description: "Move the last collision edit left by 1 tile",
    category: "collision",
    defaultKey: null,
  },
  {
    id: "collision.nudgeRight",
    label: "Nudge Last Edit Right",
    description: "Move the last collision edit right by 1 tile",
    category: "collision",
    defaultKey: null,
  },

  // ============================================================================
  // Transport Editor
  // ============================================================================
  {
    id: "transport.toggle",
    label: "Toggle Transport Editor",
    description: "Enable or disable transport placement mode",
    category: "transport",
    defaultKey: null,
  },
  {
    id: "transport.bidirectional",
    label: "Toggle Bidirectional",
    description: "Toggle whether transport works both ways",
    category: "transport",
    defaultKey: null,
  },
  {
    id: "transport.wheel",
    label: "Transport Wheel",
    description: "Hold to show transport type wheel picker",
    category: "transport",
    defaultKey: null,
  },

  // ============================================================================
  // Path Editing
  // ============================================================================
  {
    id: "path.toggleEdit",
    label: "Toggle Path Edit Mode",
    description: "Enable or disable waypoint editing mode",
    category: "path",
    defaultKey: null,
  },
  {
    id: "path.nudgeUp",
    label: "Nudge Waypoint Up",
    description: "Move selected waypoint up by 1 tile",
    category: "path",
    defaultKey: null,
  },
  {
    id: "path.nudgeDown",
    label: "Nudge Waypoint Down",
    description: "Move selected waypoint down by 1 tile",
    category: "path",
    defaultKey: null,
  },
  {
    id: "path.nudgeLeft",
    label: "Nudge Waypoint Left",
    description: "Move selected waypoint left by 1 tile",
    category: "path",
    defaultKey: null,
  },
  {
    id: "path.nudgeRight",
    label: "Nudge Waypoint Right",
    description: "Move selected waypoint right by 1 tile",
    category: "path",
    defaultKey: null,
  },

  // ============================================================================
  // Radius (NPC/Object Tools)
  // ============================================================================
  {
    id: "radius.toggle",
    label: "Toggle Radius Mode",
    description: "Toggle radius capture mode for NPC wander/object bounds",
    category: "radius",
    defaultKey: null,
  },
  {
    id: "radius.clear",
    label: "Clear Radius",
    description: "Clear the radius bounds for the selected NPC/object",
    category: "radius",
    defaultKey: null,
  },

  // ============================================================================
  // UI Toggles
  // ============================================================================
  {
    id: "ui.collisionDebug",
    label: "Toggle Collision Debug",
    description: "Show or hide collision debug overlay",
    category: "ui",
    defaultKey: null,
  },
  {
    id: "ui.transportDebug",
    label: "Toggle Transport Debug",
    description: "Show or hide transport links overlay",
    category: "ui",
    defaultKey: null,
  },
  {
    id: "ui.showAllPaths",
    label: "Toggle Show All Paths",
    description: "Show all paths or current path only",
    category: "ui",
    defaultKey: null,
  },
  {
    id: "ui.panel",
    label: "Toggle Side Panel",
    description: "Show or hide the left side panel",
    category: "ui",
    defaultKey: null,
  },
  {
    id: "ui.grids",
    label: "Toggle Grid Overlay",
    description: "Show or hide the grid overlay on the map",
    category: "ui",
    defaultKey: null,
  },

  // ============================================================================
  // Navigation
  // ============================================================================
  {
    id: "nav.stepPrev",
    label: "Previous Step",
    description: "Go to the previous quest step",
    category: "navigation",
    defaultKey: null,
  },
  {
    id: "nav.stepNext",
    label: "Next Step",
    description: "Go to the next quest step",
    category: "navigation",
    defaultKey: null,
  },
  {
    id: "nav.floorUp",
    label: "Floor Up",
    description: "Go up one floor level",
    category: "navigation",
    defaultKey: null,
  },
  {
    id: "nav.floorDown",
    label: "Floor Down",
    description: "Go down one floor level",
    category: "navigation",
    defaultKey: null,
  },

  // ============================================================================
  // General
  // ============================================================================
  {
    id: "general.flyTo",
    label: "Fly to Target",
    description: "Pan map to current NPC/Object location",
    category: "general",
    defaultKey: null,
  },
  // Note: "Show Keybinds" is hardcoded to Shift+? and not customizable
];

// Register defaults with the keybind store
export function initializeDefaults() {
  keybindStore.setDefaults(DEFAULT_KEYBINDS);
}
