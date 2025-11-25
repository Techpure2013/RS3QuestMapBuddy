import React, { useCallback, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

import {
  NpcLocation,
  NpcHighlight,
  ObjectHighlight,
  ValidationResult,
} from "../../state/types";
import { HandleFloorIncreaseDecrease } from "../../map/utils/MapFunctions";

import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { savePlayerPlot } from "./savePlotPlayer";
import { submitPlotApi } from "./submitPlot";
import { toastApiError } from "./toastErrors";

interface PlotControlsProps {
  busy: boolean;
}

const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");

function extractValidNpcs(npcs: NpcHighlight[]) {
  return npcs
    .filter((n) => {
      const loc = n?.npcLocation as NpcLocation | undefined;
      return Boolean(
        loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
      );
    })
    .map((n) => {
      const loc = n.npcLocation as NpcLocation;
      const base = {
        npcName: n.npcName,
        npcLocation: { lat: loc.lat, lng: loc.lng },
        ...(n.wanderRadius ? { wanderRadius: n.wanderRadius } : {}),
      };
      return typeof n.id === "number" && Number.isFinite(n.id)
        ? { id: n.id, ...base }
        : base;
    });
}

function extractValidObjects(objects: ObjectHighlight[]) {
  return objects
    .map((o) => {
      const locs = (o.objectLocation ?? []).filter(
        (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
      );
      const base = {
        name: o.name,
        objectLocation: locs.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          ...(p.color ? { color: p.color } : {}),
          ...(p.numberLabel ? { numberLabel: p.numberLabel } : {}),
        })),
        ...(o.objectRadius ? { objectRadius: o.objectRadius } : {}),
      };
      return typeof o.id === "number" && Number.isFinite(o.id)
        ? { id: o.id, ...base }
        : base;
    })
    .filter((o) => o.objectLocation.length > 0);
}

function validatePlotState(playerName: string): ValidationResult {
  const state = EditorStore.getState();
  const rm = state.ui.restrictedMode;
  const quest = state.quest;
  const selection = state.selection;

  if (!rm?.enabled || rm.stepId <= 0) {
    return { ok: false, error: "Plot step is not ready (missing step id)." };
  }
  if (!quest) {
    return { ok: false, error: "Load a quest first." };
  }
  if (playerName.trim().length === 0) {
    return { ok: false, error: "Enter your in-game name." };
  }

  const step = quest.questSteps[selection.selectedStep];
  if (!step) {
    return { ok: false, error: "Invalid step." };
  }

  const npc = extractValidNpcs(step.highlights.npc ?? []);
  const object = extractValidObjects(step.highlights.object ?? []);

  if (npc.length === 0 && object.length === 0) {
    return {
      ok: false,
      error: "Add at least one NPC or Object location with valid coordinates.",
    };
  }

  return {
    ok: true,
    payload: {
      playerName: normalizeName(playerName),
      stepId: rm.stepId,
      floor: step.floor,
      highlights: { npc, object },
    },
  };
}

const PlotControls: React.FC<PlotControlsProps> = ({ busy }) => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);
  const restricted = ui.restrictedMode;

  const [submitting, setSubmitting] = useState(false);
  const [playerName, setPlayerName] = useState<string>(
    restricted?.defaultPlayerName ?? ""
  );

  const totalSteps = quest?.questSteps.length ?? 0;
  const step = quest?.questSteps?.[sel.selectedStep];
  const stepDescription = step?.stepDescription ?? "";

  const floorInc = useCallback(() => {
    const state = EditorStore.getState();
    const nf = state.selection.floor + 1;
    if (!HandleFloorIncreaseDecrease(nf)) return;
    EditorStore.setSelection({ floor: nf });
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (s) s.floor = nf;
    });
  }, []);

  const floorDec = useCallback(() => {
    const state = EditorStore.getState();
    const nf = state.selection.floor - 1;
    if (!HandleFloorIncreaseDecrease(nf)) return;
    EditorStore.setSelection({ floor: nf });
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (s) s.floor = nf;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const normalizedName = playerName.trim();
    if (normalizedName.length === 0) return;

    const validation = validatePlotState(normalizedName);
    if (validation.ok === false) {
      showErrorToast(validation.error);
      return;
    }

    // enforce the same normalization the server uses
    const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");
    const payload = {
      ...validation.payload,
      playerName: normalizeName(validation.payload.playerName),
    };

    setSubmitting(true);
    try {
      // 1) Save: IP-bound player-owned plot
      const saveRes = await savePlayerPlot({
        playerName: payload.playerName,
        stepId: payload.stepId,
        floor: payload.floor,
        plotHighlights: payload.highlights,
      });
      if (saveRes.ok === false) {
        toastApiError(saveRes.error);
        return;
      }

      // 2) Submit: moderation queue
      const submitRes = await submitPlotApi({
        playerName: payload.playerName,
        stepId: payload.stepId,
        floor: payload.floor,
        highlights: payload.highlights,
      });
      if (submitRes.ok === false) {
        toastApiError(submitRes.error);
        return;
      }

      showSuccessToast(
        "Saved your plot and submitted for approval. Thank you!"
      );
    } catch (e) {
      console.error("Submit failed:", e);
      showErrorToast("Submit failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, playerName]);

  const canSubmit = !submitting && !busy && playerName.trim().length > 0;

  return (
    <div className="plot-controls-grid">
      <div className="plot-controls-left">
        <div className="plot-floor-controls">
          <button onClick={floorDec} className="control-btn" type="button">
            ↓
          </button>
          <div className="plot-floor-display">Floor: {sel.floor}</div>
          <button onClick={floorInc} className="control-btn" type="button">
            ↑
          </button>
        </div>

        <label className="plot-step-label">
          Step: {sel.selectedStep + 1} / {totalSteps}
        </label>

        <div className="plot-step-description" title={stepDescription}>
          {stepDescription}
        </div>
      </div>

      <div className="plot-controls-right">
        <div className="plot-player-name-group">
          <label className="plot-player-label">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="In-game name"
            className="plot-player-input"
            disabled={submitting}
          />
        </div>

        <button
          className="button--add plot-submit-btn"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          title={
            !playerName.trim()
              ? "Enter your player name to submit"
              : "Save and submit plot for this step"
          }
        >
          {submitting ? (
            <>
              <span className="spinner-small" />
              Submitting…
            </>
          ) : (
            "Submit Plot"
          )}
        </button>
      </div>
    </div>
  );
};

export default PlotControls;
