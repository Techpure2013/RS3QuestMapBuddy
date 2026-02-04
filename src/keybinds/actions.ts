// src/keybinds/actions.ts
// Decoupled action functions that can be called from keybinds OR UI buttons

import { EditorStore, requestFlyToCurrentTargetAt } from "../state/editorStore";
import {
  collisionEditorState,
  transportEditorState,
} from "../map/utils/pathfinding";
import { keybindStore } from "./keybindStore";

// ============================================================================
// Collision Editor Actions
// ============================================================================

export const collisionActions = {
  toggle: () => {
    collisionEditorState.toggle();
  },

  setWalkable: () => {
    collisionEditorState.setMode("walkable");
  },

  setBlocked: () => {
    collisionEditorState.setMode("blocked");
  },

  setRectangle: () => {
    collisionEditorState.setDrawShape("rectangle");
  },

  setLine: () => {
    collisionEditorState.setDrawShape("line");
  },

  toggleShape: () => {
    const current = collisionEditorState.drawShape;
    // Cycle through: rectangle -> line -> rectangle
    const next = current === "rectangle" ? "line" : "rectangle";
    collisionEditorState.setDrawShape(next);
  },

  // Nudge actions - move last edit by 1 tile
  nudgeUp: () => {
    collisionEditorState.nudgeLastEdit(0, 1);
  },

  nudgeDown: () => {
    collisionEditorState.nudgeLastEdit(0, -1);
  },

  nudgeLeft: () => {
    collisionEditorState.nudgeLastEdit(-1, 0);
  },

  nudgeRight: () => {
    collisionEditorState.nudgeLastEdit(1, 0);
  },
};

// ============================================================================
// Transport Editor Actions
// ============================================================================

export const transportActions = {
  toggle: () => {
    transportEditorState.toggle();
  },

  toggleBidirectional: () => {
    transportEditorState.setBidirectional(!transportEditorState.bidirectional);
  },
};

// ============================================================================
// Path Actions
// ============================================================================

export const pathActions = {
  toggleEditMode: () => {
    const ui = EditorStore.getState().ui;
    EditorStore.setUi({
      pathEditMode: !ui.pathEditMode,
      selectedWaypointIndex: ui.pathEditMode ? undefined : null,
    });
  },

  // Nudge selected waypoint by dx/dy tiles
  nudgeWaypoint: (dx: number, dy: number) => {
    const state = EditorStore.getState();
    const { ui, selection, quest } = state;

    // Must be in path edit mode with a waypoint selected
    if (!ui.pathEditMode || ui.selectedWaypointIndex == null) return;

    const step = quest?.questSteps?.[selection.selectedStep];
    if (!step?.pathToStep?.waypoints?.[ui.selectedWaypointIndex]) return;

    EditorStore.patchQuest((draft) => {
      const draftStep = draft.questSteps[selection.selectedStep];
      if (draftStep?.pathToStep?.waypoints?.[ui.selectedWaypointIndex!]) {
        draftStep.pathToStep.waypoints[ui.selectedWaypointIndex!].lat += dy;
        draftStep.pathToStep.waypoints[ui.selectedWaypointIndex!].lng += dx;
      }
    });
  },

  nudgeUp: () => pathActions.nudgeWaypoint(0, 1),
  nudgeDown: () => pathActions.nudgeWaypoint(0, -1),
  nudgeLeft: () => pathActions.nudgeWaypoint(-1, 0),
  nudgeRight: () => pathActions.nudgeWaypoint(1, 0),
};

// ============================================================================
// Radius Actions (NPC/Object Tools)
// ============================================================================

export const radiusActions = {
  toggle: () => {
    const state = EditorStore.getState();
    const isRadius = state.ui.captureMode === "radius";
    const next = isRadius
      ? state.selection.targetType === "npc"
        ? "single"
        : "multi-point"
      : "radius";
    EditorStore.setUi({ captureMode: next });
  },

  clear: () => {
    const state = EditorStore.getState();
    const { selectedStep, targetIndex, targetType } = state.selection;

    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step) return;

      const zeroBox = {
        bottomLeft: { lat: null as unknown as number, lng: null as unknown as number },
        topRight: { lat: null as unknown as number, lng: null as unknown as number },
      };

      if (targetType === "npc") {
        const item = step.highlights.npc?.[targetIndex];
        if (item) item.wanderRadius = { ...zeroBox };
      } else {
        const item = step.highlights.object?.[targetIndex];
        if (item) item.objectRadius = { ...zeroBox };
      }
    });
  },
};

// ============================================================================
// UI Toggle Actions
// ============================================================================

export const uiActions = {
  toggleCollisionDebug: () => {
    const ui = EditorStore.getState().ui;
    EditorStore.setUi({ showCollisionDebug: !ui.showCollisionDebug });
  },

  toggleTransportDebug: () => {
    const ui = EditorStore.getState().ui;
    EditorStore.setUi({ showTransportDebug: !ui.showTransportDebug });
  },

  toggleAllPaths: () => {
    const ui = EditorStore.getState().ui;
    EditorStore.setUi({ showAllPaths: !ui.showAllPaths });
  },

  togglePanel: () => {
    const ui = EditorStore.getState().ui;
    EditorStore.setUi({ panelOpen: !ui.panelOpen });
  },

  toggleGrids: () => {
    const ui = EditorStore.getState().ui;
    EditorStore.setUi({ showGrids: !ui.showGrids });
  },
};

// ============================================================================
// Navigation Actions
// ============================================================================

export const navigationActions = {
  stepPrev: () => {
    const selection = EditorStore.getState().selection;
    if (selection.selectedStep > 0) {
      EditorStore.setSelection({
        selectedStep: selection.selectedStep - 1,
        targetIndex: 0,
      });
    }
  },

  stepNext: () => {
    const state = EditorStore.getState();
    const quest = state.quest;
    const selection = state.selection;
    if (quest && selection.selectedStep < quest.questSteps.length - 1) {
      EditorStore.setSelection({
        selectedStep: selection.selectedStep + 1,
        targetIndex: 0,
      });
    }
  },

  floorUp: () => {
    const selection = EditorStore.getState().selection;
    if (selection.floor < 3) {
      EditorStore.setSelection({ floor: selection.floor + 1 });
    }
  },

  floorDown: () => {
    const selection = EditorStore.getState().selection;
    if (selection.floor > 0) {
      EditorStore.setSelection({ floor: selection.floor - 1 });
    }
  },
};

// ============================================================================
// Editor Actions (Step Editor - callbacks registered by CenterControlPanel)
// ============================================================================

// Callback registry for editor actions that need component state
const editorCallbacks: {
  // Formatting
  bold?: () => void;
  italic?: () => void;
  underline?: () => void;
  superscript?: () => void;
  link?: () => void;
  color?: () => void;
  image?: () => void;
  stepLink?: () => void;
  table?: () => void;
  clearFormatting?: () => void;
  // Actions
  undo?: () => void;
  redo?: () => void;
  toggleTarget?: () => void;
  addNpc?: () => void;
  addObject?: () => void;
  addStep?: () => void;
} = {};

export const editorActions = {
  // Register callbacks from CenterControlPanel
  registerCallbacks(callbacks: typeof editorCallbacks) {
    Object.assign(editorCallbacks, callbacks);
  },

  // Unregister callbacks (for cleanup)
  unregisterCallbacks() {
    // Formatting
    editorCallbacks.bold = undefined;
    editorCallbacks.italic = undefined;
    editorCallbacks.underline = undefined;
    editorCallbacks.superscript = undefined;
    editorCallbacks.link = undefined;
    editorCallbacks.color = undefined;
    editorCallbacks.image = undefined;
    editorCallbacks.stepLink = undefined;
    editorCallbacks.table = undefined;
    editorCallbacks.clearFormatting = undefined;
    // Actions
    editorCallbacks.undo = undefined;
    editorCallbacks.redo = undefined;
    editorCallbacks.toggleTarget = undefined;
    editorCallbacks.addNpc = undefined;
    editorCallbacks.addObject = undefined;
    editorCallbacks.addStep = undefined;
  },

  // Formatting actions
  bold: () => {
    editorCallbacks.bold?.();
  },

  italic: () => {
    editorCallbacks.italic?.();
  },

  underline: () => {
    editorCallbacks.underline?.();
  },

  superscript: () => {
    editorCallbacks.superscript?.();
  },

  link: () => {
    editorCallbacks.link?.();
  },

  color: () => {
    editorCallbacks.color?.();
  },

  image: () => {
    editorCallbacks.image?.();
  },

  stepLink: () => {
    editorCallbacks.stepLink?.();
  },

  table: () => {
    editorCallbacks.table?.();
  },

  clearFormatting: () => {
    editorCallbacks.clearFormatting?.();
  },

  // Editor actions
  undo: () => {
    editorCallbacks.undo?.();
  },

  redo: () => {
    editorCallbacks.redo?.();
  },

  toggleTarget: () => {
    editorCallbacks.toggleTarget?.();
  },

  addNpc: () => {
    editorCallbacks.addNpc?.();
  },

  addObject: () => {
    editorCallbacks.addObject?.();
  },

  addStep: () => {
    editorCallbacks.addStep?.();
  },
};

// ============================================================================
// General Actions
// ============================================================================

export const generalActions = {
  flyToTarget: () => {
    requestFlyToCurrentTargetAt(5, "external");
  },

  openKeybindModal: () => {
    keybindStore.setModalOpen(true);
  },

  closeKeybindModal: () => {
    keybindStore.setModalOpen(false);
  },
};

// ============================================================================
// Register all actions with keybindStore
// ============================================================================

export function registerAllActions() {
  // Collision
  keybindStore.registerAction("collision.toggle", collisionActions.toggle);
  keybindStore.registerAction("collision.walkable", collisionActions.setWalkable);
  keybindStore.registerAction("collision.blocked", collisionActions.setBlocked);
  keybindStore.registerAction("collision.rectangle", collisionActions.setRectangle);
  keybindStore.registerAction("collision.line", collisionActions.setLine);
  keybindStore.registerAction("collision.nudgeUp", collisionActions.nudgeUp);
  keybindStore.registerAction("collision.nudgeDown", collisionActions.nudgeDown);
  keybindStore.registerAction("collision.nudgeLeft", collisionActions.nudgeLeft);
  keybindStore.registerAction("collision.nudgeRight", collisionActions.nudgeRight);

  // Transport
  keybindStore.registerAction("transport.toggle", transportActions.toggle);
  keybindStore.registerAction("transport.bidirectional", transportActions.toggleBidirectional);

  // Path
  keybindStore.registerAction("path.toggleEdit", pathActions.toggleEditMode);
  keybindStore.registerAction("path.nudgeUp", pathActions.nudgeUp);
  keybindStore.registerAction("path.nudgeDown", pathActions.nudgeDown);
  keybindStore.registerAction("path.nudgeLeft", pathActions.nudgeLeft);
  keybindStore.registerAction("path.nudgeRight", pathActions.nudgeRight);

  // Radius
  keybindStore.registerAction("radius.toggle", radiusActions.toggle);
  keybindStore.registerAction("radius.clear", radiusActions.clear);

  // UI
  keybindStore.registerAction("ui.collisionDebug", uiActions.toggleCollisionDebug);
  keybindStore.registerAction("ui.transportDebug", uiActions.toggleTransportDebug);
  keybindStore.registerAction("ui.showAllPaths", uiActions.toggleAllPaths);
  keybindStore.registerAction("ui.panel", uiActions.togglePanel);
  keybindStore.registerAction("ui.grids", uiActions.toggleGrids);

  // Navigation
  keybindStore.registerAction("nav.stepPrev", navigationActions.stepPrev);
  keybindStore.registerAction("nav.stepNext", navigationActions.stepNext);
  keybindStore.registerAction("nav.floorUp", navigationActions.floorUp);
  keybindStore.registerAction("nav.floorDown", navigationActions.floorDown);

  // Editor - Formatting
  keybindStore.registerAction("editor.bold", editorActions.bold);
  keybindStore.registerAction("editor.italic", editorActions.italic);
  keybindStore.registerAction("editor.underline", editorActions.underline);
  keybindStore.registerAction("editor.superscript", editorActions.superscript);
  keybindStore.registerAction("editor.link", editorActions.link);
  keybindStore.registerAction("editor.color", editorActions.color);
  keybindStore.registerAction("editor.image", editorActions.image);
  keybindStore.registerAction("editor.stepLink", editorActions.stepLink);
  keybindStore.registerAction("editor.table", editorActions.table);
  keybindStore.registerAction("editor.clearFormatting", editorActions.clearFormatting);
  // Editor - Actions
  keybindStore.registerAction("editor.undo", editorActions.undo);
  keybindStore.registerAction("editor.redo", editorActions.redo);
  keybindStore.registerAction("editor.toggleTarget", editorActions.toggleTarget);
  keybindStore.registerAction("editor.addNpc", editorActions.addNpc);
  keybindStore.registerAction("editor.addObject", editorActions.addObject);
  keybindStore.registerAction("editor.addStep", editorActions.addStep);

  // General
  keybindStore.registerAction("general.flyTo", generalActions.flyToTarget);
  keybindStore.registerAction("general.showKeybinds", generalActions.openKeybindModal);
}
