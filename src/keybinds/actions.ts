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

  // General
  keybindStore.registerAction("general.flyTo", generalActions.flyToTarget);
  keybindStore.registerAction("general.showKeybinds", generalActions.openKeybindModal);
}
