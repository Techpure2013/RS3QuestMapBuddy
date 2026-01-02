// src/app/containers/PathToolsPanel.tsx
import React, { useCallback, useState, useEffect } from "react";
import { EditorStore } from "../../state/editorStore";
import { useEditorSelector } from "../../state/useEditorSelector";
import { generateStepToStepPath, getStepEndpoint, clearCollisionCache, debugCollisionArea, collisionEditorState, saveAllCollisionFiles, getModifiedCollisionFiles, DIRECTION_BITS, savePath, loadCustomTransports, deleteTransport, transportEditorState, type CustomTransport, type TransportType } from "../../map/utils/pathfinding";
import type { QuestPath } from "../../state/types";
import { IconRoute, IconTrash, IconEye, IconEyeOff, IconLoader2, IconRefresh, IconGridDots, IconPencil, IconWalk, IconX, IconDeviceFloppy, IconCloudUpload, IconStairs, IconArrowUp, IconArrowDown, IconArrowsUpDown } from "@tabler/icons-react";

const PathToolsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Collision editor state
  const [collisionEditorEnabled, setCollisionEditorEnabled] = useState(collisionEditorState.enabled);
  const [collisionEditorMode, setCollisionEditorMode] = useState(collisionEditorState.mode);
  const [selectedDirections, setSelectedDirections] = useState(collisionEditorState.selectedDirections);
  const [directionalAction, setDirectionalAction] = useState(collisionEditorState.directionalAction);

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
      setSelectedDirections(collisionEditorState.selectedDirections);
      setDirectionalAction(collisionEditorState.directionalAction);
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
    setStatus("Path cleared");
  }, [selection.selectedStep]);

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
      const loaded = await loadCustomTransports();
      setTransports(loaded);
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
  };

  return (
    <div className="path-tools-panel">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
          Step {selection.selectedStep + 1} of {quest?.questSteps.length ?? 0}
          {hasPathToCurrentStep && (
            <span style={{ color: "#10b981", marginLeft: 8 }}>
              (has path: {currentStep?.pathToStep?.waypoints.length} points)
            </span>
          )}
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
      </div>

      <div style={{
        borderTop: "1px solid #1e293b",
        paddingTop: 12,
        marginTop: 12
      }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
          Batch Operations
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
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
          Collision Editor
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
            <button
              onClick={() => collisionEditorState.setMode("directional")}
              style={{
                ...buttonStyle,
                flex: 1,
                background: collisionEditorMode === "directional" ? "#0891b2" : "#0f172a",
                color: collisionEditorMode === "directional" ? "#cffafe" : "#9ca3af",
                border: "1px solid #1e293b",
                marginBottom: 0,
              }}
              title="Edit specific directions on tiles"
            >
              Directional
            </button>
          </div>
        )}

        {/* Directional mode controls */}
        {collisionEditorEnabled && collisionEditorMode === "directional" && (
          <div style={{
            padding: 8,
            background: "#0f172a",
            borderRadius: 4,
            marginBottom: 6,
          }}>
            {/* Block/Unblock action toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => collisionEditorState.setDirectionalAction("block")}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  background: directionalAction === "block" ? "#dc2626" : "#1e293b",
                  color: directionalAction === "block" ? "#fecaca" : "#9ca3af",
                  border: "1px solid #374151",
                  marginBottom: 0,
                  padding: "4px 8px",
                  fontSize: 11,
                }}
                title="Block selected directions (remove walkability)"
              >
                Block
              </button>
              <button
                onClick={() => collisionEditorState.setDirectionalAction("unblock")}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  background: directionalAction === "unblock" ? "#16a34a" : "#1e293b",
                  color: directionalAction === "unblock" ? "#dcfce7" : "#9ca3af",
                  border: "1px solid #374151",
                  marginBottom: 0,
                  padding: "4px 8px",
                  fontSize: 11,
                }}
                title="Unblock selected directions (add walkability)"
              >
                Unblock
              </button>
            </div>

            {/* Direction selection grid */}
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>
              Select directions to {directionalAction}:
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
              maxWidth: 120,
              margin: "0 auto",
            }}>
              {/* Row 1: NW, N, NE */}
              {[
                { bit: DIRECTION_BITS.NORTHWEST, label: "NW" },
                { bit: DIRECTION_BITS.NORTH, label: "N" },
                { bit: DIRECTION_BITS.NORTHEAST, label: "NE" },
              ].map(({ bit, label }) => (
                <button
                  key={label}
                  onClick={() => collisionEditorState.toggleDirection(bit)}
                  style={{
                    padding: "4px",
                    fontSize: 10,
                    fontWeight: 600,
                    background: (selectedDirections & bit) ? "#0891b2" : "#1e293b",
                    color: (selectedDirections & bit) ? "#cffafe" : "#6b7280",
                    border: "1px solid #374151",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
              {/* Row 2: W, center, E */}
              <button
                onClick={() => collisionEditorState.toggleDirection(DIRECTION_BITS.WEST)}
                style={{
                  padding: "4px",
                  fontSize: 10,
                  fontWeight: 600,
                  background: (selectedDirections & DIRECTION_BITS.WEST) ? "#0891b2" : "#1e293b",
                  color: (selectedDirections & DIRECTION_BITS.WEST) ? "#cffafe" : "#6b7280",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                W
              </button>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "#4b5563",
              }}>
                ●
              </div>
              <button
                onClick={() => collisionEditorState.toggleDirection(DIRECTION_BITS.EAST)}
                style={{
                  padding: "4px",
                  fontSize: 10,
                  fontWeight: 600,
                  background: (selectedDirections & DIRECTION_BITS.EAST) ? "#0891b2" : "#1e293b",
                  color: (selectedDirections & DIRECTION_BITS.EAST) ? "#cffafe" : "#6b7280",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                E
              </button>
              {/* Row 3: SW, S, SE */}
              {[
                { bit: DIRECTION_BITS.SOUTHWEST, label: "SW" },
                { bit: DIRECTION_BITS.SOUTH, label: "S" },
                { bit: DIRECTION_BITS.SOUTHEAST, label: "SE" },
              ].map(({ bit, label }) => (
                <button
                  key={label}
                  onClick={() => collisionEditorState.toggleDirection(bit)}
                  style={{
                    padding: "4px",
                    fontSize: 10,
                    fontWeight: 600,
                    background: (selectedDirections & bit) ? "#0891b2" : "#1e293b",
                    color: (selectedDirections & bit) ? "#cffafe" : "#6b7280",
                    border: "1px solid #374151",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Quick select buttons */}
            <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "center" }}>
              <button
                onClick={() => collisionEditorState.setSelectedDirections(255)}
                style={{
                  padding: "2px 6px",
                  fontSize: 9,
                  background: "#1e293b",
                  color: "#9ca3af",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                All
              </button>
              <button
                onClick={() => collisionEditorState.setSelectedDirections(0)}
                style={{
                  padding: "2px 6px",
                  fontSize: 9,
                  background: "#1e293b",
                  color: "#9ca3af",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                None
              </button>
              <button
                onClick={() => collisionEditorState.setSelectedDirections(
                  DIRECTION_BITS.NORTH | DIRECTION_BITS.SOUTH | DIRECTION_BITS.EAST | DIRECTION_BITS.WEST
                )}
                style={{
                  padding: "2px 6px",
                  fontSize: 9,
                  background: "#1e293b",
                  color: "#9ca3af",
                  border: "1px solid #374151",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                Cardinals
              </button>
            </div>
          </div>
        )}

        {collisionEditorEnabled && collisionEditorMode !== "directional" && (
          <div style={{
            fontSize: 10,
            color: "#6b7280",
            marginTop: 6,
            padding: 8,
            background: "#0f172a",
            borderRadius: 4,
          }}>
            Click and drag on the map to select tiles. Selected tiles will be marked as {collisionEditorMode}.
          </div>
        )}

        {collisionEditorEnabled && collisionEditorMode === "directional" && (
          <div style={{
            fontSize: 10,
            color: "#6b7280",
            marginTop: 6,
            padding: 8,
            background: "#0f172a",
            borderRadius: 4,
          }}>
            Click and drag to {directionalAction} the selected directions on tiles.
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
            cursor: "pointer",
          }}
          onClick={() => setTransportsExpanded(!transportsExpanded)}
        >
          <span>Transport Editor</span>
          <span style={{ fontSize: 10 }}>{transportsExpanded ? "▼" : "▶"}</span>
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
