// src/app/plot/PlotApp.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import WorkspaceLayout from "../../feature/WorkspaceLayouts";
import MapCenter from "../map/MapCenter";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
} from "../../state/editorStore";
import { bundleToQuest } from "../../state/types";
import PlotControls from "./PlotControls";

import { fetchQuestBundlePublic } from "../../api/bundleApiRoute";
import { plotBundleToQuestBundle } from "./plotAdapters";
import type { PlotQuestBundle } from "../../state/types";
import { PlotGuide } from "./PlotGuide";
import { clearImageCache } from "../../idb/imageCache";

import PlotTargetsPanel from "./PlotTargetPanel";
import PlotBottomBar from "./PlotBottomBar";

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

      console.log("[PlotApp] Loading quest:", decodedQuest, "step:", step);

      const bundle = await fetchQuestBundlePublic(decodedQuest);
      const q = bundleToQuest(plotBundleToQuestBundle(bundle));
      EditorStore.setQuest(q);

      const total = q.questSteps.length;
      const boundedIndex = Math.min(
        Math.max(0, stepIndex),
        Math.max(0, total - 1)
      );

      EditorStore.autoSelectFirstValidTargetForStep(boundedIndex);

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

      // Delay fly request to ensure state updates have propagated
      setTimeout(() => {
        console.log("[PlotApp] Flying to target after load...");
        requestFlyToCurrentTargetAt(5, "quest-load");
      }, 100);

      console.log("[PlotApp] Quest loaded successfully");
    } catch (e) {
      console.error("[PlotApp] Failed to load quest:", e);
      setError(
        e instanceof Error ? e.message : "Failed to initialize plot workspace"
      );
    } finally {
      setBusy(false);
    }
  }, [questName, step]);

  useEffect(() => {
    // Clear cache on mount to prevent stale data
    void clearImageCache().then(() => init());

    return () => {
      EditorStore.disableRestrictedMode();
    };
  }, [init]);

  if (busy) {
    return (
      <div className="plot-loading">
        <div className="spinner" />
        <p>Loading quest: {questName}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="plot-error">
        <h2>Failed to Load Quest</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const left = <PlotTargetsPanel />;
  const right = <PlotGuide />;
  const center = (
    <>
      <div className="plot-controls-header">
        <PlotControls busy={busy} />
      </div>
      <MapCenter />
    </>
  );

  return (
    <WorkspaceLayout
      left={left}
      right={right}
      center={center}
      controlBar={<PlotBottomBar />}
      initialLeftWidth={360}
      minLeftWidth={260}
      storageKey="rs3qb_plot_workspace_v1"
    />
  );
};

export default PlotApp;
