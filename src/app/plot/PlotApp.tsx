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
      right={null}
      center={center}
      initialLeftWidth={360}
      minLeftWidth={260}
      storageKey="rs3qb_plot_workspace_v1"
    />
  );
};

export default PlotApp;
