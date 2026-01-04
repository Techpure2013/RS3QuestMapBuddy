// src/app/containers/PathToolsPanel.tsx
import React, { useCallback, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { EditorStore } from "../../state/editorStore";
import { useEditorSelector } from "../../state/useEditorSelector";
import { generateStepToStepPath, getStepEndpoint, clearCollisionCache, debugCollisionArea, collisionEditorState, saveAllCollisionFiles, getModifiedCollisionFiles, savePath, loadCustomTransports, deleteTransport, transportEditorState, reloadTransports, setDebugDirectionsMode, getDebugDirectionsMode, type CustomTransport, type TransportType } from "../../map/utils/pathfinding";
import type { QuestPath } from "../../state/types";
import { IconRoute, IconTrash, IconEye, IconEyeOff, IconLoader2, IconRefresh, IconGridDots, IconPencil, IconWalk, IconX, IconDeviceFloppy, IconCloudUpload, IconStairs, IconArrowUp, IconArrowDown, IconArrowsUpDown, IconHelp, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight, IconPlayerPlay } from "@tabler/icons-react";
import type { PathWaypoint } from "../../state/types";

// Helper tooltip component - uses Portal to escape overflow:hidden containers
const HelpBox: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const iconRef = React.useRef<HTMLSpanElement>(null);

  const handleClick = () => {
    if (!show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      // Position tooltip so it doesn't go off screen
      const tooltipWidth = 220;
      const tooltipHeight = 160; // approximate

      // Position to the left of the icon, not covering it
      let left = rect.left - tooltipWidth - 8;
      let top = rect.top - 20; // Align roughly with icon

      // If would go off left edge, position to the right of icon instead
      if (left < 8) {
        left = rect.right + 8;
      }
      // If would go off right edge, position below
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - tooltipWidth - 8);
        top = rect.bottom + 8;
      }
      // Keep on screen vertically
      if (top < 8) top = 8;
      if (top + tooltipHeight > window.innerHeight - 8) {
        top = window.innerHeight - tooltipHeight - 8;
      }

      setPos({ top, left });
    }
    setShow(!show);
  };

  const tooltip = show && pos ? (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        padding: "8px 10px",
        background: "#1e293b",
        border: "1px solid #374151",
        borderRadius: 4,
        fontSize: 11,
        color: "#d1d5db",
        lineHeight: 1.4,
        width: 220,
        zIndex: 99999,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      {text}
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: "#6b7280",
          fontStyle: "italic",
        }}
      >
        Click ? to close
      </div>
    </div>
  ) : null;

  return (
    <>
      <span
        ref={iconRef}
        onClick={handleClick}
        style={{
          cursor: "pointer",
          color: show ? "#60a5fa" : "#6b7280",
          marginLeft: 6,
          display: "inline-flex",
          alignItems: "center",
        }}
        title="Click for help"
      >
        <IconHelp size={14} />
      </span>
      {tooltip && ReactDOM.createPortal(tooltip, document.body)}
    </>
  );
};

const PathToolsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Collision editor state
  const [collisionEditorEnabled, setCollisionEditorEnabled] = useState(collisionEditorState.enabled);
  const [collisionEditorMode, setCollisionEditorMode] = useState(collisionEditorState.mode);
  const [collisionDrawShape, setCollisionDrawShape] = useState(collisionEditorState.drawShape);

  // Debug directions mode (shows direction bits on collision tiles)
  const [debugDirections, setDebugDirections] = useState(getDebugDirectionsMode());

  // Transport editor state
  const [transportsExpanded, setTransportsExpanded] = useState(false);
  const [transports, setTransports] = useState<CustomTransport[]>([]);
  const [transportsLoading, setTransportsLoading] = useState(false);

  // Interactive transport editor state (synced with global state)
  const [transportEditorEnabled, setTransportEditorEnabled] = useState(transportEditorState.enabled);
  const [transportEditorStep, setTransportEditorStep] = useState(transportEditorState.step);
  const [transportEditorType, setTransportEditorType] = useState(transportEditorState.transportType);
  const [transportEditorBidirectional, setTransportEditorBidirectional] = useState(transportEditorState.bidirectional);
  const [transportEditorFrom, setTransportEditorFrom] = useState(transportEditorState.fromPosition);
  const [transportEditorTo, setTransportEditorTo] = useState(transportEditorState.toPosition);

  // Subscribe to transport editor state changes
  useEffect(() => {
    const unsubscribe = transportEditorState.subscribe(() => {
      setTransportEditorEnabled(transportEditorState.enabled);
      setTransportEditorStep(transportEditorState.step);
      setTransportEditorType(transportEditorState.transportType);
      setTransportEditorBidirectional(transportEditorState.bidirectional);
      setTransportEditorFrom(transportEditorState.fromPosition);
      setTransportEditorTo(transportEditorState.toPosition);
    });
    return unsubscribe;
  }, []);

  // Subscribe to collision editor state changes
  useEffect(() => {
    const unsubscribe = collisionEditorState.subscribe(() => {
      setCollisionEditorEnabled(collisionEditorState.enabled);
      setCollisionEditorMode(collisionEditorState.mode);
      setCollisionDrawShape(collisionEditorState.drawShape);
    });
    return unsubscribe;
  }, []);

  const currentStep = quest?.questSteps[selection.selectedStep];
  const prevStep = selection.selectedStep > 0
    ? quest?.questSteps[selection.selectedStep - 1]
    : null;

  const hasPathToCurrentStep = currentStep?.pathToStep &&
    currentStep.pathToStep.waypoints.length >= 2;

  // Generate path from previous step to current step
  const handleGeneratePath = useCallback(async () => {
    if (!quest || !prevStep || !currentStep) {
      setStatus("Need previous and current step with highlights");
      return;
    }

    const fromEndpoint = getStepEndpoint(prevStep);
    const toEndpoint = getStepEndpoint(currentStep);

    if (!fromEndpoint) {
      setStatus("Previous step has no NPC/Object location");
      return;
    }
    if (!toEndpoint) {
      setStatus("Current step has no NPC/Object location");
      return;
    }

    if (fromEndpoint.floor !== toEndpoint.floor) {
      setStatus("Cross-floor paths not yet supported");
      return;
    }

    setGenerating(true);
    setStatus("Generating path...");
    EditorStore.setUi({ isGeneratingPath: true });

    try {
      const waypoints = await generateStepToStepPath(prevStep, currentStep);

      if (!waypoints || waypoints.length < 2) {
        setStatus("No path found between steps");
        return;
      }

      const path: QuestPath = {
        waypoints,
        floor: fromEndpoint.floor,
        fromStepIndex: selection.selectedStep - 1,
        toStepIndex: selection.selectedStep,
      };

      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[selection.selectedStep];
        if (step) {
          step.pathToStep = path;
        }
      });

      setStatus(`Path generated: ${waypoints.length} waypoints`);
    } catch (err) {
      console.error("Path generation failed:", err);
      setStatus("Path generation failed");
    } finally {
      setGenerating(false);
      EditorStore.setUi({ isGeneratingPath: false });
    }
  }, [quest, prevStep, currentStep, selection.selectedStep]);

  // Clear path for current step
  const handleClearPath = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[selection.selectedStep];
      if (step) {
        step.pathToStep = undefined;
      }
    });
    EditorStore.setUi({ pathEditMode: false, selectedWaypointIndex: null });
    setStatus("Path cleared");
  }, [selection.selectedStep]);

  // Nudge a waypoint by dx/dy tiles
  const handleNudgeWaypoint = useCallback((waypointIndex: number, dx: number, dy: number) => {
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[selection.selectedStep];
      if (step?.pathToStep?.waypoints?.[waypointIndex]) {
        step.pathToStep.waypoints[waypointIndex].lat += dy;
        step.pathToStep.waypoints[waypointIndex].lng += dx;
      }
    });
  }, [selection.selectedStep]);

  // Delete a waypoint (not start/end)
  const handleDeleteWaypoint = useCallback((waypointIndex: number) => {
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[selection.selectedStep];
      if (step?.pathToStep?.waypoints) {
        const total = step.pathToStep.waypoints.length;
        // Don't delete start or end waypoints
        if (waypointIndex > 0 && waypointIndex < total - 1) {
          step.pathToStep.waypoints.splice(waypointIndex, 1);
        }
      }
    });
    // Deselect after deletion
    EditorStore.setUi({ selectedWaypointIndex: null });
    setStatus("Waypoint deleted");
  }, [selection.selectedStep]);

  // Recalculate path through a via point (selected waypoint)
  const handleRecalculateThroughWaypoint = useCallback(async (waypointIndex: number) => {
    if (!quest || !currentStep?.pathToStep?.waypoints) {
      setStatus("No path to recalculate");
      return;
    }

    const waypoints = currentStep.pathToStep.waypoints;
    const viaPoint = waypoints[waypointIndex];
    if (!viaPoint) {
      setStatus("Invalid waypoint");
      return;
    }

    // Get start and end points
    const startWp = waypoints[0];
    const endWp = waypoints[waypoints.length - 1];
    const floor = currentStep.pathToStep.floor;

    setGenerating(true);
    setStatus("Recalculating path through waypoint...");
    EditorStore.setUi({ isGeneratingPath: true });

    try {
      // Import the findPath function dynamically to avoid circular deps
      const { findPath } = await import("../../map/utils/pathfinding");

      // Path from start to via point
      const pathToVia = await findPath(
        startWp.lat, startWp.lng,
        viaPoint.lat, viaPoint.lng,
        floor
      );

      // Path from via point to end
      const pathFromVia = await findPath(
        viaPoint.lat, viaPoint.lng,
        endWp.lat, endWp.lng,
        floor
      );

      if (!pathToVia || pathToVia.length < 1) {
        setStatus("Could not find path to via point");
        return;
      }

      if (!pathFromVia || pathFromVia.length < 1) {
        setStatus("Could not find path from via point to end");
        return;
      }

      // Combine paths (remove duplicate via point)
      const combinedPath = [...pathToVia, ...pathFromVia.slice(1)];

      // Update the path
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[selection.selectedStep];
        if (step?.pathToStep) {
          step.pathToStep.waypoints = combinedPath;
        }
      });

      setStatus(`Path recalculated: ${combinedPath.length} waypoints`);
      EditorStore.setUi({ selectedWaypointIndex: null });
    } catch (err) {
      console.error("Path recalculation failed:", err);
      setStatus("Path recalculation failed");
    } finally {
      setGenerating(false);
      EditorStore.setUi({ isGeneratingPath: false });
    }
  }, [quest, currentStep, selection.selectedStep]);

  // Generate paths for all steps
  const handleGenerateAllPaths = useCallback(async () => {
    if (!quest || quest.questSteps.length < 2) {
      setStatus("Need at least 2 steps");
      return;
    }

    setGenerating(true);
    EditorStore.setUi({ isGeneratingPath: true });
    let generated = 0;
    let failed = 0;

    try {
      for (let i = 1; i < quest.questSteps.length; i++) {
        const from = quest.questSteps[i - 1];
        const to = quest.questSteps[i];

        setStatus(`Generating path ${i}/${quest.questSteps.length - 1}...`);

        const fromEndpoint = getStepEndpoint(from);
        const toEndpoint = getStepEndpoint(to);

        if (!fromEndpoint || !toEndpoint) {
          failed++;
          continue;
        }

        if (fromEndpoint.floor !== toEndpoint.floor) {
          failed++;
          continue;
        }

        try {
          const waypoints = await generateStepToStepPath(from, to);

          if (waypoints && waypoints.length >= 2) {
            const path: QuestPath = {
              waypoints,
              floor: fromEndpoint.floor,
              fromStepIndex: i - 1,
              toStepIndex: i,
            };

            EditorStore.patchQuest((draft) => {
              const step = draft.questSteps[i];
              if (step) {
                step.pathToStep = path;
              }
            });
            generated++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      setStatus(`Generated ${generated} paths, ${failed} failed`);
    } finally {
      setGenerating(false);
      EditorStore.setUi({ isGeneratingPath: false });
    }
  }, [quest]);

  // Toggle show all paths
  const handleToggleShowAll = useCallback(() => {
    EditorStore.setUi({ showAllPaths: !ui.showAllPaths });
  }, [ui.showAllPaths]);

  // Clear all paths
  const handleClearAllPaths = useCallback(() => {
    if (!confirm("Clear all paths from all steps?")) return;

    EditorStore.patchQuest((draft) => {
      draft.questSteps.forEach((step) => {
        step.pathToStep = undefined;
      });
    });
    setStatus("All paths cleared");
  }, []);

  // Save current step's path to server
  const handleSaveCurrentPath = useCallback(async () => {
    if (!currentStep?.pathToStep?.waypoints || currentStep.pathToStep.waypoints.length < 2) {
      setStatus("No path to save for current step");
      return;
    }

    setGenerating(true);
    setStatus("Saving path to server...");

    try {
      const path = currentStep.pathToStep;
      const stepId = currentStep.stepId;
      const questName = quest?.questName ?? "Unknown";

      const saved = await savePath(
        path.waypoints,
        path.floor,
        path.floor, // endFloor same as startFloor for now
        {
          name: `${questName} - Step ${selection.selectedStep + 1}`,
          description: `Path from step ${path.fromStepIndex !== undefined ? path.fromStepIndex + 1 : '?'} to step ${path.toStepIndex !== undefined ? path.toStepIndex + 1 : '?'}`,
          quest_step_id: stepId,
        }
      );

      if (saved) {
        setStatus(`Path saved! ID: ${saved.id}, ${saved.tile_count} tiles`);
      } else {
        setStatus("Failed to save path");
      }
    } catch (err) {
      console.error("Failed to save path:", err);
      setStatus("Error saving path");
    } finally {
      setGenerating(false);
    }
  }, [currentStep, quest?.questName, selection.selectedStep]);

  // Save all paths to server
  const handleSaveAllPaths = useCallback(async () => {
    if (!quest) {
      setStatus("No quest loaded");
      return;
    }

    const stepsWithPaths = quest.questSteps.filter(
      (s) => s.pathToStep?.waypoints && s.pathToStep.waypoints.length >= 2
    );

    if (stepsWithPaths.length === 0) {
      setStatus("No paths to save");
      return;
    }

    setGenerating(true);
    let saved = 0;
    let failed = 0;

    for (let i = 0; i < quest.questSteps.length; i++) {
      const step = quest.questSteps[i];
      if (!step.pathToStep?.waypoints || step.pathToStep.waypoints.length < 2) {
        continue;
      }

      setStatus(`Saving path ${saved + failed + 1}/${stepsWithPaths.length}...`);

      try {
        const path = step.pathToStep;
        const result = await savePath(
          path.waypoints,
          path.floor,
          path.floor,
          {
            name: `${quest.questName} - Step ${i + 1}`,
            description: `Path from step ${path.fromStepIndex !== undefined ? path.fromStepIndex + 1 : '?'} to step ${path.toStepIndex !== undefined ? path.toStepIndex + 1 : '?'}`,
            quest_step_id: step.stepId,
          }
        );

        if (result) {
          saved++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setStatus(`Saved ${saved} paths${failed > 0 ? `, ${failed} failed` : ''}`);
    setGenerating(false);
  }, [quest]);

  // Load transports from server
  const handleLoadTransports = useCallback(async () => {
    setTransportsLoading(true);
    setStatus("Loading transports...");
    try {
      // Load for panel display
      const loaded = await loadCustomTransports();
      setTransports(loaded);
      // Also reload the visualization cache (triggers map update via event)
      await reloadTransports();
      setStatus(`Loaded ${loaded.length} transports`);
    } catch (err) {
      console.error("Failed to load transports:", err);
      setStatus("Failed to load transports");
    } finally {
      setTransportsLoading(false);
    }
  }, []);

  // Delete transport
  const handleDeleteTransport = useCallback(async (id: number, name: string) => {
    if (!confirm(`Delete transport "${name}"?`)) return;

    setTransportsLoading(true);
    try {
      const success = await deleteTransport(id);
      if (success) {
        setStatus(`Deleted transport: ${name}`);
        const loaded = await loadCustomTransports();
        setTransports(loaded);
      } else {
        setStatus("Failed to delete transport");
      }
    } catch (err) {
      console.error("Failed to delete transport:", err);
      setStatus("Error deleting transport");
    } finally {
      setTransportsLoading(false);
    }
  }, []);

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    fontSize: 12,
    borderRadius: 6,
    border: "none",
    cursor: generating ? "wait" : "pointer",
    width: "100%",
    justifyContent: "center",
    marginBottom: 6,
    transition: "background 0.15s ease",
    boxSizing: "border-box",
  };

  return (
    <div className="path-tools-panel" style={{ overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <span>Step {selection.selectedStep + 1} of {quest?.questSteps.length ?? 0}</span>
          {hasPathToCurrentStep && (
            <span style={{ color: "#10b981", marginLeft: 8 }}>
              (has path: {currentStep?.pathToStep?.waypoints.length} points)
            </span>
          )}
          <HelpBox text="Paths are auto-generated routes between quest steps. Select a step (not step 1), then click 'Generate Path' to create a walking route from the previous step's NPC/Object to this step's NPC/Object." />
        </div>

        {/* Generate path for current step */}
        <button
          onClick={handleGeneratePath}
          disabled={generating || selection.selectedStep === 0}
          style={{
            ...buttonStyle,
            background: generating ? "#1e3a5f" : "#065f46",
            color: generating ? "#9ca3af" : "#a7f3d0",
            opacity: selection.selectedStep === 0 ? 0.5 : 1,
          }}
          title={selection.selectedStep === 0
            ? "Cannot generate path for first step"
            : "Generate path from previous step to current step"}
        >
          {generating ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconRoute size={16} />
          )}
          Generate Path to This Step
        </button>

        {/* Clear cache and regenerate path */}
        <button
          onClick={async () => {
            clearCollisionCache();
            // Also debug the collision area around the destination
            const toEndpoint = currentStep ? getStepEndpoint(currentStep) : null;
            if (toEndpoint) {
              await debugCollisionArea(toEndpoint.lat, toEndpoint.lng, toEndpoint.floor, 10);
            }
            handleGeneratePath();
          }}
          disabled={generating || selection.selectedStep === 0}
          style={{
            ...buttonStyle,
            background: generating ? "#1e3a5f" : "#7c3aed",
            color: generating ? "#9ca3af" : "#e9d5ff",
            opacity: selection.selectedStep === 0 ? 0.5 : 1,
          }}
          title="Clear collision cache and regenerate path (use if path seems stuck)"
        >
          <IconRefresh size={16} />
          Clear Cache & Regenerate
        </button>

        {/* Clear path for current step */}
        {hasPathToCurrentStep && (
          <button
            onClick={handleClearPath}
            disabled={generating}
            style={{
              ...buttonStyle,
              background: "#7f1d1d",
              color: "#fecaca",
            }}
          >
            <IconTrash size={16} />
            Clear Path for This Step
          </button>
        )}

        {/* Path Edit Mode Toggle */}
        {hasPathToCurrentStep && (
          <>
            <button
              onClick={() => {
                const newMode = !ui.pathEditMode;
                EditorStore.setUi({
                  pathEditMode: newMode,
                  selectedWaypointIndex: newMode ? null : undefined,
                });
              }}
              style={{
                ...buttonStyle,
                background: ui.pathEditMode ? "#0891b2" : "#0f172a",
                color: ui.pathEditMode ? "#cffafe" : "#9ca3af",
                border: "1px solid #1e293b",
              }}
              title="Enable path editing to drag waypoints and adjust the route"
            >
              <IconPencil size={16} />
              {ui.pathEditMode ? "Path Edit Mode ON" : "Edit Path Waypoints"}
            </button>

            {/* Waypoint List - shown when edit mode is on */}
            {ui.pathEditMode && currentStep?.pathToStep?.waypoints && (
              <div style={{
                background: "#0f172a",
                borderRadius: 4,
                padding: 8,
                marginBottom: 6,
              }}>
                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Waypoints ({currentStep.pathToStep.waypoints.length})</span>
                  <HelpBox text="Click a waypoint marker on the map to select it, then drag to move. Use nudge buttons to fine-tune position. Changes will recalculate the path through that point." />
                </div>

                {/* Selected waypoint info and nudge controls */}
                {ui.selectedWaypointIndex !== null && ui.selectedWaypointIndex !== undefined && (
                  <div style={{
                    background: "#1e293b",
                    borderRadius: 4,
                    padding: 8,
                    marginBottom: 8,
                  }}>
                    <div style={{ fontSize: 11, color: "#FF00FF", fontWeight: 600, marginBottom: 6 }}>
                      Selected: Waypoint #{ui.selectedWaypointIndex}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8 }}>
                      Position: ({currentStep.pathToStep.waypoints[ui.selectedWaypointIndex]?.lat}, {currentStep.pathToStep.waypoints[ui.selectedWaypointIndex]?.lng})
                    </div>

                    {/* Nudge controls */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <button
                        onClick={() => {
                          const wp = currentStep.pathToStep?.waypoints[ui.selectedWaypointIndex!];
                          if (wp) {
                            handleNudgeWaypoint(ui.selectedWaypointIndex!, 0, 1);
                          }
                        }}
                        style={{
                          padding: "4px 12px",
                          background: "#1e3a5f",
                          color: "#93c5fd",
                          border: "1px solid #374151",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: 10,
                        }}
                        title="Move waypoint north (+Y)"
                      >
                        <IconChevronUp size={14} />
                      </button>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          onClick={() => handleNudgeWaypoint(ui.selectedWaypointIndex!, -1, 0)}
                          style={{
                            padding: "4px 12px",
                            background: "#1e3a5f",
                            color: "#93c5fd",
                            border: "1px solid #374151",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                          }}
                          title="Move waypoint west (-X)"
                        >
                          <IconChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => handleNudgeWaypoint(ui.selectedWaypointIndex!, 1, 0)}
                          style={{
                            padding: "4px 12px",
                            background: "#1e3a5f",
                            color: "#93c5fd",
                            border: "1px solid #374151",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 10,
                          }}
                          title="Move waypoint east (+X)"
                        >
                          <IconChevronRight size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleNudgeWaypoint(ui.selectedWaypointIndex!, 0, -1)}
                        style={{
                          padding: "4px 12px",
                          background: "#1e3a5f",
                          color: "#93c5fd",
                          border: "1px solid #374151",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: 10,
                        }}
                        title="Move waypoint south (-Y)"
                      >
                        <IconChevronDown size={14} />
                      </button>
                    </div>

                    {/* Recalculate through this point */}
                    <button
                      onClick={() => handleRecalculateThroughWaypoint(ui.selectedWaypointIndex!)}
                      disabled={generating}
                      style={{
                        ...buttonStyle,
                        marginTop: 8,
                        marginBottom: 0,
                        background: generating ? "#1e3a5f" : "#059669",
                        color: generating ? "#9ca3af" : "#d1fae5",
                        fontSize: 10,
                        padding: "6px 10px",
                      }}
                      title="Recalculate the path to go through this waypoint's new position"
                    >
                      <IconPlayerPlay size={14} />
                      Recalculate Through This Point
                    </button>

                    {/* Delete waypoint button - only for non-endpoint waypoints */}
                    {(() => {
                      const total = currentStep.pathToStep?.waypoints.length ?? 0;
                      const isEndpoint = ui.selectedWaypointIndex === 0 || ui.selectedWaypointIndex === total - 1;
                      return (
                        <button
                          onClick={() => handleDeleteWaypoint(ui.selectedWaypointIndex!)}
                          disabled={isEndpoint}
                          style={{
                            ...buttonStyle,
                            marginTop: 6,
                            marginBottom: 0,
                            background: isEndpoint ? "#1e293b" : "#7f1d1d",
                            color: isEndpoint ? "#6b7280" : "#fecaca",
                            fontSize: 10,
                            padding: "6px 10px",
                            opacity: isEndpoint ? 0.5 : 1,
                            cursor: isEndpoint ? "not-allowed" : "pointer",
                          }}
                          title={isEndpoint ? "Cannot delete start/end waypoints" : "Delete this waypoint"}
                        >
                          <IconTrash size={14} />
                          {isEndpoint ? "Cannot Delete (Endpoint)" : "Delete Waypoint"}
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Scrollable waypoint list */}
                <div style={{
                  maxHeight: 150,
                  overflowY: "auto",
                  fontSize: 10,
                }}>
                  {currentStep.pathToStep.waypoints.filter((_, i) => {
                    // Show start, end, and every Nth waypoint
                    const total = currentStep.pathToStep!.waypoints.length;
                    const interval = Math.max(1, Math.floor(total / 15));
                    return i === 0 || i === total - 1 || i % interval === 0 || i === ui.selectedWaypointIndex;
                  }).map((wp, displayIdx) => {
                    // Find actual index
                    const total = currentStep.pathToStep!.waypoints.length;
                    const interval = Math.max(1, Math.floor(total / 15));
                    let actualIdx = 0;
                    let count = 0;
                    for (let i = 0; i < total; i++) {
                      if (i === 0 || i === total - 1 || i % interval === 0 || i === ui.selectedWaypointIndex) {
                        if (count === displayIdx) {
                          actualIdx = i;
                          break;
                        }
                        count++;
                      }
                    }
                    const isSelected = actualIdx === ui.selectedWaypointIndex;
                    const isEndpoint = actualIdx === 0 || actualIdx === total - 1;

                    return (
                      <div
                        key={actualIdx}
                        onClick={() => EditorStore.setUi({ selectedWaypointIndex: isSelected ? null : actualIdx })}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "3px 6px",
                          background: isSelected ? "#FF00FF33" : "transparent",
                          borderRadius: 2,
                          cursor: "pointer",
                          color: isSelected ? "#FF00FF" : isEndpoint ? "#FFD700" : "#9ca3af",
                          borderLeft: isSelected ? "2px solid #FF00FF" : "2px solid transparent",
                        }}
                      >
                        <span>#{actualIdx} {isEndpoint ? (actualIdx === 0 ? "(Start)" : "(End)") : ""}</span>
                        <span>({wp.lat}, {wp.lng})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{
        borderTop: "1px solid #1e293b",
        paddingTop: 12,
        marginTop: 12
      }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center" }}>
          <span>Batch Operations</span>
          <HelpBox text="Generate paths for all steps at once, or save to server. 'Show All Paths' displays every path. 'Show Collision Debug' shows walkable/blocked tiles (red=blocked). 'Show Transport Links' shows teleports, stairs, etc. Enable 'Edit Transport Positions' under Transport Links to move/delete existing transports." />
        </div>

        {/* Generate all paths */}
        <button
          onClick={handleGenerateAllPaths}
          disabled={generating}
          style={{
            ...buttonStyle,
            background: generating ? "#1e3a5f" : "#1e40af",
            color: generating ? "#9ca3af" : "#93c5fd",
          }}
        >
          {generating ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconRoute size={16} />
          )}
          Generate All Paths
        </button>

        {/* Save current step's path to server */}
        {hasPathToCurrentStep && (
          <button
            onClick={handleSaveCurrentPath}
            disabled={generating}
            style={{
              ...buttonStyle,
              background: generating ? "#1e3a5f" : "#0d9488",
              color: generating ? "#9ca3af" : "#ccfbf1",
            }}
            title="Save current step's path to the database"
          >
            {generating ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconCloudUpload size={16} />
            )}
            Save Path to Server
          </button>
        )}

        {/* Save all paths to server */}
        <button
          onClick={handleSaveAllPaths}
          disabled={generating}
          style={{
            ...buttonStyle,
            background: generating ? "#1e3a5f" : "#0f766e",
            color: generating ? "#9ca3af" : "#99f6e4",
          }}
          title="Save all generated paths to the database"
        >
          {generating ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconCloudUpload size={16} />
          )}
          Save All Paths to Server
        </button>

        {/* Toggle show all paths */}
        <button
          onClick={handleToggleShowAll}
          style={{
            ...buttonStyle,
            background: ui.showAllPaths ? "#1e3a5f" : "#0f172a",
            color: ui.showAllPaths ? "#93c5fd" : "#9ca3af",
            border: "1px solid #1e293b",
          }}
        >
          {ui.showAllPaths ? <IconEye size={16} /> : <IconEyeOff size={16} />}
          {ui.showAllPaths ? "Showing All Paths" : "Show Current Path Only"}
        </button>

        {/* Clear all paths */}
        <button
          onClick={handleClearAllPaths}
          disabled={generating}
          style={{
            ...buttonStyle,
            background: "#450a0a",
            color: "#fca5a5",
          }}
        >
          <IconTrash size={16} />
          Clear All Paths
        </button>

        {/* Toggle collision debug overlay */}
        <button
          onClick={() => EditorStore.setUi({ showCollisionDebug: !ui.showCollisionDebug })}
          style={{
            ...buttonStyle,
            background: ui.showCollisionDebug ? "#dc2626" : "#0f172a",
            color: ui.showCollisionDebug ? "#fef2f2" : "#9ca3af",
            border: "1px solid #1e293b",
            marginTop: 8,
          }}
          title="Show collision data overlay on map (red = blocked tiles)"
        >
          <IconGridDots size={16} />
          {ui.showCollisionDebug ? "Hide Collision Debug" : "Show Collision Debug"}
        </button>

        {/* Toggle debug directions mode - only show when collision debug is on */}
        {ui.showCollisionDebug && (
          <button
            onClick={() => {
              const newMode = !debugDirections;
              setDebugDirections(newMode);
              setDebugDirectionsMode(newMode);
            }}
            style={{
              ...buttonStyle,
              background: debugDirections ? "#7c3aed" : "#0f172a",
              color: debugDirections ? "#ede9fe" : "#9ca3af",
              border: "1px solid #1e293b",
              marginTop: 4,
              fontSize: 11,
            }}
            title="Show direction bits on each tile (green=walkable, red=blocked for each direction). Each tile shows 8 edge indicators: N/S/E/W and diagonals."
          >
            🔍 {debugDirections ? "Direction Debug ON" : "Show Direction Bits"}
          </button>
        )}

        {/* Toggle transport visualization */}
        <button
          onClick={() => EditorStore.setUi({ showTransportDebug: !ui.showTransportDebug })}
          style={{
            ...buttonStyle,
            background: ui.showTransportDebug ? "#0891b2" : "#0f172a",
            color: ui.showTransportDebug ? "#cffafe" : "#9ca3af",
            border: "1px solid #1e293b",
            marginTop: 4,
          }}
          title="Show all transport links on map (stairs, teleports, fairy rings, etc.)"
        >
          <IconStairs size={16} />
          {ui.showTransportDebug ? "Hide Transport Links" : "Show Transport Links"}
        </button>

        {/* Transport filter controls - only show when enabled */}
        {ui.showTransportDebug && (
          <div style={{
            padding: 8,
            background: "#0f172a",
            borderRadius: 4,
            marginTop: 6,
          }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <select
                value={ui.transportDisplayMode ?? "nodes"}
                onChange={(e) => EditorStore.setUi({ transportDisplayMode: e.target.value as "nodes" | "links" | "all" })}
                style={{
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 10,
                  background: "#1e293b",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  color: "#e5e7eb",
                }}
              >
                <option value="nodes">Nodes Only</option>
                <option value="links">Links Only</option>
                <option value="all">Nodes + Links</option>
              </select>
              <select
                value={ui.transportCategory ?? "all"}
                onChange={(e) => EditorStore.setUi({ transportCategory: e.target.value as any })}
                style={{
                  flex: 1,
                  padding: "4px 6px",
                  fontSize: 10,
                  background: "#1e293b",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  color: "#e5e7eb",
                }}
              >
                <option value="all">All Types</option>
                <option value="vertical">Stairs/Ladders</option>
                <option value="teleport">Teleports</option>
                <option value="fairy_ring">Fairy Rings</option>
                <option value="spirit_tree">Spirit Trees</option>
                <option value="aerial">Gliders/Balloons</option>
                <option value="ground">Minecarts</option>
                <option value="water">Boats/Ships</option>
                <option value="shortcuts">Shortcuts</option>
              </select>
            </div>
            <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 6 }}>
              Nodes = dots at positions, Links = arrows between
            </div>
            {/* Edit mode toggle */}
            <button
              onClick={() => EditorStore.setUi({ transportEditMode: !ui.transportEditMode })}
              style={{
                ...buttonStyle,
                width: "100%",
                background: ui.transportEditMode ? "#dc2626" : "#1e293b",
                color: ui.transportEditMode ? "#fef2f2" : "#9ca3af",
                border: `1px solid ${ui.transportEditMode ? "#dc2626" : "#374151"}`,
                fontSize: 10,
              }}
              title="Click markers to select, then click map to adjust position"
            >
              {ui.transportEditMode ? "Exit Edit Mode" : "Edit Transport Positions"}
            </button>
            {ui.transportEditMode && (
              <div style={{ fontSize: 9, color: "#fbbf24", marginTop: 4 }}>
                Click a marker to select, then click map to move
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collision Editor Section */}
      <div style={{
        borderTop: "1px solid #1e293b",
        paddingTop: 12,
        marginTop: 12
      }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center" }}>
          <span>Collision Editor</span>
          <HelpBox text="Fix pathfinding issues by editing collision data. Enable the editor, choose Walkable or Blocked mode, then click+drag on the map to paint tiles. Use Line mode to draw walls along tile edges. Save edits when done." />
        </div>

        {/* Toggle collision editor */}
        <button
          onClick={() => collisionEditorState.toggle()}
          style={{
            ...buttonStyle,
            background: collisionEditorEnabled ? "#16a34a" : "#0f172a",
            color: collisionEditorEnabled ? "#dcfce7" : "#9ca3af",
            border: "1px solid #1e293b",
          }}
          title="Enable interactive collision editing mode"
        >
          <IconPencil size={16} />
          {collisionEditorEnabled ? "Collision Editor ON" : "Collision Editor OFF"}
        </button>

        {/* Mode selection - only show when enabled */}
        {collisionEditorEnabled && (
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => collisionEditorState.setMode("walkable")}
              style={{
                ...buttonStyle,
                flex: 1,
                background: collisionEditorMode === "walkable" ? "#16a34a" : "#0f172a",
                color: collisionEditorMode === "walkable" ? "#dcfce7" : "#9ca3af",
                border: "1px solid #1e293b",
                marginBottom: 0,
              }}
              title="Paint tiles as walkable (all directions free)"
            >
              <IconWalk size={16} />
              Walkable
            </button>
            <button
              onClick={() => collisionEditorState.setMode("blocked")}
              style={{
                ...buttonStyle,
                flex: 1,
                background: collisionEditorMode === "blocked" ? "#dc2626" : "#0f172a",
                color: collisionEditorMode === "blocked" ? "#fecaca" : "#9ca3af",
                border: "1px solid #1e293b",
                marginBottom: 0,
              }}
              title="Paint tiles as blocked (all directions blocked)"
            >
              <IconX size={16} />
              Blocked
            </button>
          </div>
        )}

        {/* Draw shape toggle - Rectangle vs Line vs Wall */}
        {collisionEditorEnabled && (
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => collisionEditorState.setDrawShape("rectangle")}
              style={{
                ...buttonStyle,
                flex: 1,
                background: collisionDrawShape === "rectangle" ? "#7c3aed" : "#0f172a",
                color: collisionDrawShape === "rectangle" ? "#ede9fe" : "#9ca3af",
                border: "1px solid #1e293b",
                marginBottom: 0,
              }}
              title="Draw filled rectangles"
            >
              Rectangle
            </button>
            <button
              onClick={() => collisionEditorState.setDrawShape("line")}
              style={{
                ...buttonStyle,
                flex: 1,
                background: collisionDrawShape === "line" ? "#f97316" : "#0f172a",
                color: collisionDrawShape === "line" ? "#ffedd5" : "#9ca3af",
                border: "1px solid #1e293b",
                marginBottom: 0,
              }}
              title="Draw walls along tile edges (blocks movement perpendicular to line)"
            >
              Line/Wall
            </button>
          </div>
        )}

        {collisionEditorEnabled && (
          <div style={{
            fontSize: 10,
            color: "#6b7280",
            marginTop: 6,
            padding: 8,
            background: "#0f172a",
            borderRadius: 4,
          }}>
            {collisionDrawShape === "line"
              ? `Click and drag to draw a wall along tile edges. Movement will be blocked perpendicular to the wall. Use "${collisionEditorMode}" to ${collisionEditorMode === "walkable" ? "remove" : "add"} walls.`
              : `Click and drag on the map to select tiles. Selected tiles will be marked as ${collisionEditorMode}.`}
          </div>
        )}

        {/* Save collision edits */}
        <button
          onClick={async () => {
            const files = getModifiedCollisionFiles();
            if (files.length === 0) {
              setStatus("No collision files to save");
              return;
            }
            setStatus(`Saving ${files.length} collision files...`);
            const result = await saveAllCollisionFiles();
            if (result.saved > 0) {
              setStatus(`Saved ${result.saved} collision files${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
            } else {
              setStatus(`Failed to save collision files (${result.failed} failed)`);
            }
          }}
          style={{
            ...buttonStyle,
            background: "#1e40af",
            color: "#93c5fd",
            border: "1px solid #1e293b",
            marginTop: 8,
          }}
          title="Save all modified collision files to server"
        >
          <IconDeviceFloppy size={16} />
          Save Collision Edits
        </button>
      </div>

      {/* Transport Editor Section */}
      <div style={{
        borderTop: "1px solid #1e293b",
        paddingTop: 12,
        marginTop: 12
      }}>
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ cursor: "pointer", display: "flex", alignItems: "center", flex: 1 }}
            onClick={() => setTransportsExpanded(!transportsExpanded)}
          >
            Transport Editor
            <span style={{ fontSize: 10, marginLeft: 6 }}>{transportsExpanded ? "▼" : "▶"}</span>
          </span>
          <HelpBox text="Add transport links (stairs, teleports, fairy rings, etc.) to help pathfinding. Enable editor, select type, click map for FROM, then TO. Shift+Click after FROM to set a second corner for multi-tile areas. In Edit Mode: click a marker to select it, click map to move it, Shift+Click to resize multi-tile bounds, Delete/Backspace to remove." />
        </div>

        {transportsExpanded && (
          <>
            {/* Load transports button */}
            <button
              onClick={handleLoadTransports}
              disabled={transportsLoading}
              style={{
                ...buttonStyle,
                background: transportsLoading ? "#1e3a5f" : "#0f766e",
                color: transportsLoading ? "#9ca3af" : "#99f6e4",
              }}
              title="Load all transports from server"
            >
              {transportsLoading ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconStairs size={16} />
              )}
              Load Transports ({transports.length})
            </button>

            {/* Interactive Transport Placement */}
            <div style={{
              padding: 8,
              background: "#0f172a",
              borderRadius: 4,
              marginBottom: 6,
            }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6 }}>
                Click-to-Place Transport
              </div>

              {/* Enable/Disable toggle */}
              <button
                onClick={() => transportEditorState.toggle()}
                style={{
                  ...buttonStyle,
                  background: transportEditorEnabled ? "#16a34a" : "#1e293b",
                  color: transportEditorEnabled ? "#dcfce7" : "#9ca3af",
                  border: "1px solid #374151",
                  marginBottom: 8,
                }}
              >
                <IconPencil size={16} />
                {transportEditorEnabled ? "Transport Editor ON" : "Transport Editor OFF"}
              </button>

              {/* Type select */}
              <select
                value={transportEditorType}
                onChange={(e) => transportEditorState.setTransportType(e.target.value as TransportType)}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: 11,
                  background: "#1e293b",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  color: "#e5e7eb",
                  marginBottom: 6,
                }}
              >
                <optgroup label="Vertical">
                  <option value="stairs">Stairs</option>
                  <option value="ladder">Ladder</option>
                  <option value="trapdoor">Trapdoor</option>
                  <option value="rope">Rope</option>
                </optgroup>
                <optgroup label="Teleports">
                  <option value="teleport">Teleport</option>
                  <option value="lodestone">Lodestone</option>
                  <option value="fairy_ring">Fairy Ring</option>
                  <option value="spirit_tree">Spirit Tree</option>
                  <option value="portal">Portal</option>
                  <option value="jewelry_teleport">Jewelry Teleport</option>
                </optgroup>
                <optgroup label="Aerial">
                  <option value="gnome_glider">Gnome Glider</option>
                  <option value="balloon">Balloon</option>
                  <option value="eagle">Eagle</option>
                  <option value="magic_carpet">Magic Carpet</option>
                </optgroup>
                <optgroup label="Ground/Rail">
                  <option value="minecart">Minecart</option>
                  <option value="gnome_cart">Gnome Cart</option>
                </optgroup>
                <optgroup label="Water">
                  <option value="boat">Boat</option>
                  <option value="canoe">Canoe</option>
                  <option value="charter_ship">Charter Ship</option>
                </optgroup>
                <optgroup label="Shortcuts">
                  <option value="agility">Agility</option>
                  <option value="door">Door</option>
                  <option value="gate">Gate</option>
                </optgroup>
                <option value="other">Other</option>
              </select>

              {/* Bidirectional toggle */}
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 8,
                cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={transportEditorBidirectional}
                  onChange={(e) => transportEditorState.setBidirectional(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                Bidirectional (can go both ways)
              </label>

              {/* Status and position info */}
              {transportEditorEnabled && (
                <div style={{
                  padding: 8,
                  background: "#1e293b",
                  borderRadius: 4,
                  marginBottom: 6,
                }}>
                  {/* Current step */}
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: transportEditorStep === "from" ? "#00ff00" : transportEditorStep === "to" ? "#ff6600" : "#6b7280",
                    marginBottom: 6,
                  }}>
                    {transportEditorStep === "from" && "Click on map to set FROM position"}
                    {transportEditorStep === "to" && "Click on map to set TO position"}
                    {transportEditorStep === "idle" && "Ready to place next transport"}
                  </div>

                  {/* FROM position */}
                  {transportEditorFrom && (
                    <div style={{ fontSize: 10, color: "#00ff00", marginBottom: 4 }}>
                      FROM: ({transportEditorFrom.x}, {transportEditorFrom.y}, F{transportEditorFrom.floor})
                    </div>
                  )}

                  {/* TO position */}
                  {transportEditorTo && (
                    <div style={{ fontSize: 10, color: "#ff6600", marginBottom: 4 }}>
                      TO: ({transportEditorTo.x}, {transportEditorTo.y}, F{transportEditorTo.floor})
                    </div>
                  )}

                  {/* Direction indicator */}
                  {transportEditorFrom && transportEditorTo && (
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                      {transportEditorTo.floor > transportEditorFrom.floor ? (
                        <><IconArrowUp size={12} style={{ verticalAlign: "middle" }} /> Going Up</>
                      ) : transportEditorTo.floor < transportEditorFrom.floor ? (
                        <><IconArrowDown size={12} style={{ verticalAlign: "middle" }} /> Going Down</>
                      ) : (
                        <><IconArrowsUpDown size={12} style={{ verticalAlign: "middle" }} /> Same Floor</>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cancel button */}
              {transportEditorEnabled && (transportEditorFrom || transportEditorStep !== "idle") && (
                <button
                  onClick={() => transportEditorState.cancelPlacement()}
                  style={{
                    ...buttonStyle,
                    background: "#7f1d1d",
                    color: "#fecaca",
                    marginBottom: 0,
                  }}
                >
                  <IconX size={16} />
                  Cancel Placement
                </button>
              )}

              {/* Instructions when disabled */}
              {!transportEditorEnabled && (
                <div style={{
                  fontSize: 10,
                  color: "#6b7280",
                  padding: 8,
                  background: "#1e293b",
                  borderRadius: 4,
                }}>
                  Enable the editor, select a transport type, then click on the map to place FROM and TO positions.
                </div>
              )}
            </div>

            {/* Transport list */}
            {transports.length > 0 && (
              <div style={{
                maxHeight: 200,
                overflowY: "auto",
                background: "#0f172a",
                borderRadius: 4,
                padding: 4,
              }}>
                {transports.slice(0, 20).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 6px",
                      fontSize: 10,
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: "#e5e7eb",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {t.name}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 9 }}>
                        {t.transport_type} | ({t.from_x},{t.from_y},F{t.from_floor}) → ({t.to_x},{t.to_y},F{t.to_floor})
                        {t.bidirectional && " ↔"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTransport(t.id, t.name)}
                      style={{
                        padding: 4,
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        cursor: "pointer",
                      }}
                      title="Delete transport"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
                {transports.length > 20 && (
                  <div style={{ padding: 4, fontSize: 9, color: "#6b7280", textAlign: "center" }}>
                    Showing 20 of {transports.length} transports
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          marginTop: 12,
          padding: 8,
          background: "#0f172a",
          borderRadius: 4,
          fontSize: 11,
          color: status.includes("failed") || status.includes("No path")
            ? "#f87171"
            : "#9ca3af",
        }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default PathToolsPanel;
