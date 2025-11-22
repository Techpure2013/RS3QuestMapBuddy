import React, { useCallback, useMemo, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import type { NpcLocation, Quest } from "../../state/types";
import { saveStepPlot } from "../../api/plotApi";
import { TargetSelectionSection } from "../sections/TargetSelectionSection";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="panel-section" style={{ marginBottom: 12 }}>
    <label className="EditDescriptionLabel">
      <strong>{title}</strong>
    </label>
    <div style={{ marginTop: 8 }}>{children}</div>
  </div>
);

const PlotPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);
  const clipboard = useEditorSelector((s) => s.clipboard);
  const restricted = ui.restrictedMode;

  const step = quest?.questSteps?.[sel.selectedStep];
  const [playerName, setPlayerName] = useState<string>(
    restricted?.defaultPlayerName ?? ""
  );

  const canNpc = Boolean(restricted?.allowNpc);
  const canObj = Boolean(restricted?.allowObject);
  const canRadius = Boolean(restricted?.allowRadius);

  const targetNameValue = useMemo(() => {
    if (!step) return "";
    return sel.targetType === "npc"
      ? step.highlights.npc?.[sel.targetIndex]?.npcName ?? ""
      : step.highlights.object?.[sel.targetIndex]?.name ?? "";
  }, [step, sel]);

  const onTargetTypeChange = useCallback((t: "npc" | "object") => {
    EditorStore.setSelection({ targetType: t, targetIndex: 0 });
    EditorStore.setUi({ captureMode: t === "npc" ? "single" : "multi-point" });
  }, []);

  const onTargetIndexChange = useCallback(
    (i: number, type: "npc" | "object") => {
      if (type !== sel.targetType) {
        EditorStore.setSelection({ targetType: type, targetIndex: i });
      } else {
        EditorStore.setSelection({ targetIndex: i });
      }
      EditorStore.setUi({
        captureMode: type === "npc" ? "single" : "multi-point",
      });
    },
    [sel.targetType]
  );

  const onTargetNameChange = useCallback(
    (name: string) => {
      EditorStore.patchQuest((draft) => {
        const s = draft.questSteps[sel.selectedStep];
        if (!s) return;
        if (sel.targetType === "npc") {
          const t = s.highlights.npc?.[sel.targetIndex];
          if (t) t.npcName = name;
        } else {
          const t = s.highlights.object?.[sel.targetIndex];
          if (t) t.name = name;
        }
      });
    },
    [sel.selectedStep, sel.targetIndex, sel.targetType]
  );

  const setNpcMode = useCallback(() => {
    if (!canNpc) return;
    EditorStore.setSelection({ targetType: "npc", targetIndex: 0 });
    EditorStore.setUi({ captureMode: "single" });
  }, [canNpc]);

  const setObjectMode = useCallback(() => {
    if (!canObj) return;
    EditorStore.setSelection({ targetType: "object", targetIndex: 0 });
    EditorStore.setUi({ captureMode: "multi-point" });
  }, [canObj]);

  const toggleRadius = useCallback(() => {
    if (!canRadius) return;
    const next =
      ui.captureMode === "radius"
        ? sel.targetType === "npc"
          ? "single"
          : "multi-point"
        : "radius";
    EditorStore.setUi({ captureMode: next });
  }, [canRadius, ui.captureMode, sel.targetType]);

  const removeObjectLocation = useCallback(
    (locIdx: number) => {
      EditorStore.patchQuest((draft) => {
        const t =
          draft.questSteps[sel.selectedStep]?.highlights.object?.[
            sel.targetIndex
          ];
        if (!t?.objectLocation) return;
        if (locIdx < 0 || locIdx >= t.objectLocation.length) return;
        t.objectLocation.splice(locIdx, 1);
      });
    },
    [sel.selectedStep, sel.targetIndex]
  );

  const onCopyList = useCallback(() => {
    if (!step) return;
    if (sel.targetType === "npc") {
      EditorStore.setClipboard({
        type: "npc-list",
        data: JSON.parse(JSON.stringify(step.highlights.npc ?? [])),
      });
    } else {
      EditorStore.setClipboard({
        type: "object-list",
        data: JSON.parse(JSON.stringify(step.highlights.object ?? [])),
      });
    }
  }, [step, sel.targetType]);

  const onPasteList = useCallback(() => {
    if (!step) return;
    if (clipboard.type === "npc-list") {
      EditorStore.patchQuest((draft) => {
        draft.questSteps[sel.selectedStep].highlights.npc = clipboard.data;
      });
    } else if (clipboard.type === "object-list") {
      EditorStore.patchQuest((draft) => {
        draft.questSteps[sel.selectedStep].highlights.object = clipboard.data;
      });
    }
  }, [clipboard, step, sel.selectedStep]);

  const onCopySelected = useCallback(() => {
    if (!step) return;
    if (sel.targetType === "npc") {
      const item = step.highlights.npc?.[sel.targetIndex];
      if (item)
        EditorStore.setClipboard({
          type: "npc",
          data: JSON.parse(JSON.stringify(item)),
        });
    } else {
      const item = step.highlights.object?.[sel.targetIndex];
      if (item)
        EditorStore.setClipboard({
          type: "object",
          data: JSON.parse(JSON.stringify(item)),
        });
    }
  }, [step, sel.targetIndex, sel.targetType]);

  const onPasteSelected = useCallback(() => {
    if (!step) return;
    if (clipboard.type === "npc" && sel.targetType === "npc") {
      EditorStore.patchQuest((draft) => {
        if (
          draft.questSteps[sel.selectedStep].highlights.npc?.[sel.targetIndex]
        ) {
          draft.questSteps[sel.selectedStep].highlights.npc[sel.targetIndex] =
            clipboard.data;
        }
      });
    } else if (clipboard.type === "object" && sel.targetType === "object") {
      EditorStore.patchQuest((draft) => {
        if (
          draft.questSteps[sel.selectedStep].highlights.object?.[
            sel.targetIndex
          ]
        ) {
          draft.questSteps[sel.selectedStep].highlights.object[
            sel.targetIndex
          ] = clipboard.data;
        }
      });
    }
  }, [clipboard, step, sel.selectedStep, sel.targetIndex, sel.targetType]);

  const submitPlot = useCallback(async () => {
    const sp = new URLSearchParams(location.search);
    const stepIdFromUrl = Number(sp.get("stepId") ?? "");
    restricted.stepId = stepIdFromUrl > 0 ? stepIdFromUrl : -1;
    if (!restricted?.enabled) {
      alert("Restricted plotting is not enabled.");
      return;
    }
    if (restricted.stepId <= 0) {
      alert(
        "Server stepId not available. Contact admin to enable stepId in bundle."
      );
      return;
    }
    if (!quest || !step) {
      alert("Load a quest first.");
      return;
    }
    if (playerName.trim().length === 0) {
      alert("Enter your in-game name.");
      return;
    }

    const npc = (step.highlights.npc ?? []).filter(
      (n) =>
        typeof n.id === "number" &&
        n.npcLocation &&
        Number.isFinite((n.npcLocation as NpcLocation).lat) &&
        Number.isFinite((n.npcLocation as NpcLocation).lng)
    );

    const object = (step.highlights.object ?? [])
      .filter((o) => typeof o.id === "number")
      .map((o) => ({
        id: o.id!,
        name: o.name,
        objectLocation: (o.objectLocation ?? []).filter(
          (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
        ),
        objectRadius: o.objectRadius,
      }))
      .filter((o) => o.objectLocation.length > 0);

    if (npc.length === 0 && object.length === 0) {
      alert("Add at least one NPC or Object with a valid id.");
      return;
    }

    const res = await saveStepPlot({
      playerName: playerName.trim(),
      stepId: restricted.stepId,
      floor: step.floor,
      highlights: {
        npc: npc.map((n) => ({
          id: n.id!,
          npcName: n.npcName,
          npcLocation: {
            lat: (n.npcLocation as NpcLocation).lat,
            lng: (n.npcLocation as NpcLocation).lng,
          },
          wanderRadius: n.wanderRadius,
        })),
        object: object.map((o) => ({
          id: o.id,
          name: o.name,
          objectLocation: o.objectLocation.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            color: p.color,
            numberLabel: p.numberLabel,
          })),
          objectRadius: o.objectRadius,
        })),
      },
    }).catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : "failed",
    }));

    if ((res as any)?.ok !== true) {
      const err = (res as any)?.error ?? "failed";
      if (err === "name_bound_to_different_ip") {
        alert(
          "This player name is already bound to a different IP for this step."
        );
        return;
      }
      alert(`Save failed: ${err}`);
      return;
    }

    alert("Plot saved. Thank you!");
  }, [restricted, quest, step, playerName]);

  if (!restricted?.enabled) {
    return (
      <div className="panel-section">
        <strong>Plotting</strong>
        <div style={{ marginTop: 6, color: "#9ca3af", fontSize: 12 }}>
          Restricted plotting mode is not enabled.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <Section title={`Step ${sel.selectedStep + 1} (Locked)`}>
        <div className="button-group" style={{ display: "flex", gap: 6 }}>
          <button
            onClick={setNpcMode}
            disabled={!canNpc}
            className="control-btn"
            style={{
              background: sel.targetType === "npc" ? "#2563eb" : undefined,
              borderColor: sel.targetType === "npc" ? "#2563eb" : undefined,
              color: sel.targetType === "npc" ? "#fff" : undefined,
            }}
          >
            NPC Mode
          </button>
          <button
            onClick={setObjectMode}
            disabled={!canObj}
            className="control-btn"
            style={{
              background: sel.targetType === "object" ? "#2563eb" : undefined,
              borderColor: sel.targetType === "object" ? "#2563eb" : undefined,
              color: sel.targetType === "object" ? "#fff" : undefined,
            }}
          >
            Object Mode
          </button>
          <button
            onClick={toggleRadius}
            disabled={!canRadius}
            className="control-btn"
            style={{
              background: ui.captureMode === "radius" ? "#10b981" : undefined,
              borderColor: ui.captureMode === "radius" ? "#10b981" : undefined,
              color: ui.captureMode === "radius" ? "#fff" : undefined,
            }}
            title="Toggle radius capture"
          >
            Radius
          </button>
        </div>
      </Section>

      <Section title="Targets">
        <TargetSelectionSection
          quest={quest as Quest | null}
          selectedStep={sel.selectedStep}
          targetType={sel.targetType}
          onTargetTypeChange={onTargetTypeChange}
          targetIndex={sel.targetIndex}
          onTargetIndexChange={onTargetIndexChange}
          clipboard={clipboard}
          onCopyList={onCopyList}
          onPasteList={onPasteList}
          onCopySelected={onCopySelected}
          onPasteSelected={onPasteSelected}
          onDeleteObjectLocation={removeObjectLocation}
          targetNameValue={targetNameValue}
          onTargetNameChange={onTargetNameChange}
        />
      </Section>

      <Section title="Submit Plot">
        <div className="control-group" style={{ marginBottom: 8 }}>
          <label>Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your in‑game name"
          />
        </div>
        <div className="button-group">
          <button className="button--add" onClick={() => void submitPlot()}>
            Submit Plot
          </button>
        </div>
        <div style={{ marginTop: 8, color: "#9ca3af", fontSize: 12 }}>
          This will submit only step {sel.selectedStep + 1} (DB id{" "}
          {restricted.stepId > 0 ? restricted.stepId : "unknown"}).
        </div>
      </Section>
    </div>
  );
};

export default PlotPanel;
