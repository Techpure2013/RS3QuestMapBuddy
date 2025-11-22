// src/app/plot/PlotControls.tsx
import React, { useMemo, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import { submitPlot } from "api/plotSubmissions";
import { NpcLocation } from "state/types";

const PlotControls: React.FC<{ busy: boolean }> = ({ busy }) => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);
  const restricted = ui.restrictedMode;

  const [submitting, setSubmitting] = useState(false);
  const [playerName, setPlayerName] = useState<string>(
    restricted?.defaultPlayerName ?? ""
  );

  const totalSteps = quest?.questSteps.length ?? 0;
  const stepIndex = sel.selectedStep;

  const step = useMemo(
    () => quest?.questSteps?.[stepIndex],
    [quest, stepIndex]
  );
  const stepDescription = step?.stepDescription ?? "";

  const buildPayload = () => {
    const rm = EditorStore.getState().ui.restrictedMode;
    const q = EditorStore.getState().quest;
    const selection = EditorStore.getState().selection;

    if (!rm?.enabled || rm.stepId <= 0) {
      return { error: "Plot step is not ready (missing step id)." } as const;
    }
    if (!q) return { error: "Load a quest first." } as const;

    const s = q.questSteps[selection.selectedStep];
    if (!s) return { error: "Invalid step." } as const;

    // Accept NPCs with or without id; include id if present and numeric.
    const npc = (s.highlights.npc ?? [])
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
          wanderRadius: n.wanderRadius,
        };
        // include id only when it exists and is a finite number
        return typeof n.id === "number" && Number.isFinite(n.id)
          ? { id: n.id, ...base }
          : base;
      });

    // Accept Objects with or without id; include id if present and numeric.
    const object = (s.highlights.object ?? [])
      .map((o) => {
        const locs = (o.objectLocation ?? []).filter(
          (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
        );
        const base = {
          name: o.name,
          objectLocation: locs.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            color: p.color,
            numberLabel: p.numberLabel,
          })),
          objectRadius: o.objectRadius,
        };
        // include id only when present and numeric
        return typeof o.id === "number" && Number.isFinite(o.id)
          ? { id: o.id, ...base }
          : base;
      })
      .filter((o) => o.objectLocation.length > 0); // must have some points

    if (npc.length === 0 && object.length === 0) {
      return {
        error: "Add at least one NPC or Object location.",
      } as const;
    }

    const payload = {
      playerName: playerName.trim(),
      stepId: rm.stepId,
      floor: s.floor,
      highlights: {
        npc,
        object,
      },
    };

    return { payload } as const;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#9ca3af" }}>
          Step: {sel.selectedStep + 1} / {totalSteps}
        </label>
        <div
          style={{
            fontSize: 12,
            color: "#d1d5db",
            borderLeft: "5px",
            wordWrap: "normal",
          }}
        >
          {stepDescription}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#9ca3af" }}>Player Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="In-game name"
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 4,
            color: "#e5e7eb",
            padding: "6px 8px",
            minWidth: 200,
            fontSize: 12,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          className="button--add"
          onClick={async () => {
            if (submitting) return;
            if (playerName.trim().length === 0) return;

            try {
              setSubmitting(true);

              const built = buildPayload();
              if ("error" in built) {
                alert(built.error);
                return;
              }

              const res = await submitPlot(built.payload);
              if (!res.ok) {
                const err = (res as any).error ?? "failed";
                if (err === "name_bound_to_different_ip") {
                  alert(
                    "This player name is already bound to a different User for this step"
                  );
                  return;
                }
                alert(`Submission failed: ${err}`);
                return;
              }

              alert("Submitted for approval. Thank you!");
            } catch (e) {
              console.error("Submit failed:", e);
              alert("Submit failed.");
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting || playerName.trim().length === 0}
          title="Submit plot for this step"
        >
          {submitting ? "Submitting…" : "Submit Plot"}
        </button>
      </div>
    </div>
  );
};

export default PlotControls;
