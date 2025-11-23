// src/app/plot/PlotApp.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import WorkspaceLayout from "./../../feature/WorkspaceLayouts";
import MapCenter from "../map/MapCenter";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
} from "../../state/editorStore";
import { bundleToQuest } from "../../state/types";
import PlotControls from "./PlotControls";
import PlotTargetsPanel from "./PlotTargetPanel";
import { fetchQuestBundlePublic } from "../../api/bundleApiRoute";
import { plotBundleToQuestBundle } from "./plotAdapters";
import type { PlotQuestBundle } from "../../state/types";
import MapAreaSearchPanel from "app/containers/SearchPanels/MapAreaSearchPanel";
import NpcSearchPanel from "app/containers/SearchPanels/NpcSearchPanel";
import ObjectSearchPanel from "app/containers/SearchPanels/ObjectSearchPanel";

type RouteParams = { questName: string; step: string };

export const PlotApp: React.FC = () => {
  const { questName = "", step = "1" } = useParams<RouteParams>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const init = useCallback(async () => {
    try {
      setBusy(true);
      setError("");

      const decodedQuest = decodeURIComponent(questName);
      const stepIndex = Math.max(0, Number(step) - 1);

      console.log("[PlotApp] questName, step:", questName, step);
      const bundle = await fetchQuestBundlePublic(decodedQuest);
      console.log("[PlotApp] got bundle:", !!bundle);
      const q = bundleToQuest(plotBundleToQuestBundle(bundle));
      EditorStore.setQuest(q);
      console.log("[PlotApp] set quest, steps:", q.questSteps.length);

      const total = q.questSteps.length;
      const boundedIndex = Math.min(
        Math.max(0, stepIndex),
        Math.max(0, total - 1)
      );

      EditorStore.autoSelectFirstValidTargetForStep(boundedIndex);
      requestFlyToCurrentTargetAt(5, "quest-load");

      const stepMeta = (bundle.steps as PlotQuestBundle["steps"])[boundedIndex];
      const stepId = stepMeta?.stepId ?? -1;

      EditorStore.enableRestrictedMode({
        enabled: true,
        stepIndex: boundedIndex,
        stepId,
        allowNpc: true,
        allowObject: true,
        allowRadius: true,
      });
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to initialize plot workspace"
      );
    } finally {
      setBusy(false);
    }
  }, [questName, step]);

  useEffect(() => {
    void init();
    return () => {
      EditorStore.disableRestrictedMode();
    };
  }, [init]);

  const left = <PlotTargetsPanel />;
  const right = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto", // scroll the entire column
        padding: 12,
        boxSizing: "border-box",
        gap: 10,
        position: "relative",
      }}
    >
      {/* Guide card */}
      <div
        style={{
          padding: "8px 10px",
          background: "#0f172a",
          border: "1px solid #1f2937",
          borderRadius: 8,
          flex: "0 0 auto",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "#e5e7eb",
          }}
        >
          Plot Workspace Guide
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            color: "#9ca3af",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          Capture & submit locations for this quest step. Use the left panel to
          add NPCs/Objects, click the map to place points, and the tools below
          to search NPCs, Objects, and Areas.
        </p>
      </div>

      {/* Quick tips */}
      <div
        style={{
          padding: 10,
          background: "#0b1220",
          border: "1px solid #1f2937",
          borderRadius: 8,
          flex: "0 0 auto",
        }}
      >
        <h3
          style={{ margin: 0, fontSize: 14, color: "#d1d5db", fontWeight: 600 }}
        >
          Quick Tips
        </h3>
        <ul
          style={{
            margin: "6px 0 0",
            paddingLeft: 16,
            color: "#9ca3af",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <li>
            NPC mode: one click sets NPC location; Radius draws a wander area.
          </li>
          <li>
            Object mode: clicks add tiles; last point can have color/number.
          </li>
          <li>Use Grids for alignment; cursor shows live X/Y/Zoom.</li>
          <li>Submit with your in‑game name; admin will merge on approval.</li>
        </ul>
      </div>

      {/* Search stack with non-clipping parents */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: "1 1 auto", // allow this block to grow and overflow
          minHeight: 0, // crucial for nested flex scrolling in some browsers
        }}
      >
        {/* Object Search */}
        <div
          style={{
            background: "#0b1220",
            border: "1px solid #1f2937",
            borderRadius: 8,
            position: "relative", // allow absolute children to stay within stacking context
            zIndex: 1,
            padding: 10,
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 6,
              borderBottom: "1px solid #1f2937",
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22d3ee",
                marginRight: 8,
              }}
            />
            <strong style={{ color: "#e5e7eb", fontSize: 13 }}>
              Object Search
            </strong>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 8px" }}>
            Search by name or click a map area to find nearby objects. Pick a
            result to seed an object and add points on the map.
          </p>
          {/* Ensure the dropdown is not clipped; wrap with a higher stacking context */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <ObjectSearchPanel />
          </div>
        </div>

        {/* NPC Search */}
        <div
          style={{
            background: "#0b1220",
            border: "1px solid #1f2937",
            borderRadius: 8,
            position: "relative",
            zIndex: 1,
            padding: 10,
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 6,
              borderBottom: "1px solid #1f2937",
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#34d399",
                marginRight: 8,
              }}
            />
            <strong style={{ color: "#e5e7eb", fontSize: 13 }}>
              NPC Search
            </strong>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 8px" }}>
            Type ≥4 chars, press Enter. Cycle results. Choosing fills id + name
            and snaps to the NPC’s floor (best for approval).
          </p>
          <div style={{ position: "relative", zIndex: 2 }}>
            <NpcSearchPanel />
          </div>
        </div>

        {/* Map Area Search */}
        <div
          style={{
            background: "#0b1220",
            border: "1px solid #1f2937",
            borderRadius: 8,
            position: "relative",
            zIndex: 1,
            padding: 10,
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 6,
              borderBottom: "1px solid #1f2937",
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#60a5fa",
                marginRight: 8,
              }}
            />
            <strong style={{ color: "#e5e7eb", fontSize: 13 }}>
              Map Area Search
            </strong>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 8px" }}>
            Find an area by name and fly there. Use “Back” to return to your
            previous view.
          </p>
          <div style={{ position: "relative", zIndex: 2 }}>
            <MapAreaSearchPanel />
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div
        style={{
          padding: 10,
          background: "#0b1220",
          border: "1px solid #1f2937",
          borderRadius: 8,
          flex: "0 0 auto",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            color: "#d1d5db",
            fontWeight: 600,
          }}
        >
          Troubleshooting
        </h3>
        <ul
          style={{
            margin: "6px 0 0",
            paddingLeft: 16,
            color: "#9ca3af",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <li>
            Submitted but nothing changed: likely NPCs had no resolvable id or
            objects had no points. Use the search tools, then add points and
            resubmit.
          </li>
          <li>
            NPC didn’t approve: ensure an exact DB name match via NPC Search to
            backfill id.
          </li>
          <li>
            If you cannot plot a point something might be hung up in the cache
            quick cache reset ctrl+shift+r or hit the local reset button by the
            grid controls
          </li>
        </ul>
      </div>
    </div>
  );
  const center = (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          background: "rgba(11, 18, 32, 0.95)",
          borderBottom: "1px solid #374151",
          padding: "10px 16px",
        }}
      >
        <PlotControls busy={busy} />
        {error && (
          <div style={{ marginTop: 6, color: "#fca5a5", fontSize: 12 }}>
            {error}
          </div>
        )}
      </div>
      <MapCenter />
    </>
  );

  return (
    <WorkspaceLayout
      left={left}
      right={right}
      center={center}
      initialLeftWidth={360}
      minLeftWidth={260}
      storageKey="rs3qb_plot_workspace_v1"
    />
  );
};

export default PlotApp;
