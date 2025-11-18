import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import Panel from "./../sections/panel";
import { NpcToolsSection } from "./../sections/NpcToolsSection";
import { ObjectToolsSection } from "./../sections/ObjectToolsSection";
import { TargetSelectionSection } from "./../sections/TargetSelectionSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
} from "../../state/editorStore";
import type { Quest, NpcHighlight, ObjectHighlight } from "../../state/types";
import { recordObservedChathead } from "../../idb/chatheadsObserved";
import { addPendingChathead } from "../../idb/chatheadQueue";
import {
  fetchImageWithCache,
  getCacheStats,
  clearImageCache,
} from "../../idb/imageCache";

const getImageUrl = (
  name: string,
  type: "npc" | "object",
  explicitOverride?: string
): string => {
  if (explicitOverride) return explicitOverride;
  const formattedName = name.replace(/\s+/g, "_");
  return type === "npc"
    ? `https://runescape.wiki/images/${formattedName}_chathead.png`
    : `https://runescape.wiki/images/${formattedName}.png`;
};

export const NpcObjectToolsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const clipboard = useEditorSelector((s) => s.clipboard);
  const captureSettings = useEditorSelector((s) => s.ui.captureMode);
  const currentTargetName = useMemo(() => {
    const step = quest?.questSteps?.[sel.selectedStep];
    if (!step) return "";
    if (sel.targetType === "npc") {
      const t = step.highlights.npc?.[sel.targetIndex] as
        | NpcHighlight
        | undefined;
      return t?.npcName ?? "";
    } else {
      const t = step.highlights.object?.[sel.targetIndex] as
        | ObjectHighlight
        | undefined;
      return t?.name ?? "";
    }
  }, [quest, sel.selectedStep, sel.targetType, sel.targetIndex]);

  const currentTargetObjectData = useMemo(() => {
    const step = quest?.questSteps?.[sel.selectedStep];
    if (!step || sel.targetType !== "object") {
      return { color: "#00FF00", numberLabel: "" };
    }
    const target = step.highlights.object?.[sel.targetIndex];
    const lastPoint =
      target?.objectLocation && target.objectLocation.length > 0
        ? target.objectLocation[target.objectLocation.length - 1]
        : undefined;
    return {
      color: lastPoint?.color ?? "#00FF00",
      numberLabel: lastPoint?.numberLabel ?? "",
    };
  }, [quest, sel.selectedStep, sel.targetType, sel.targetIndex]);

  const handleTargetTypeChange = useCallback((t: "npc" | "object") => {
    // switch selection
    EditorStore.setSelection({ targetType: t, targetIndex: 0 });

    // switch capture mode to match type
    EditorStore.setUi({
      captureMode: t === "npc" ? "single" : "multi-point",
    });
  }, []);

  const handleTargetIndexChange = useCallback(
    (i: number, type: "npc" | "object") => {
      if (type !== sel.targetType) {
        EditorStore.setSelection({ targetType: type, targetIndex: i });
      } else {
        EditorStore.setSelection({ targetIndex: i });
      }
      EditorStore.setUi({
        captureMode: type === "npc" ? "single" : "multi-point",
      });
      requestFlyToCurrentTargetAt(5, "selection");
    },
    [sel.targetType]
  );
  const handleCopyList = useCallback(() => {
    const step = quest?.questSteps?.[sel.selectedStep];
    if (!step) return;

    if (sel.targetType === "npc") {
      const list = step.highlights.npc ?? [];
      EditorStore.setClipboard({
        type: "npc-list",
        data: JSON.parse(JSON.stringify(list)) as NpcHighlight[],
      });
    } else {
      const list = step.highlights.object ?? [];
      EditorStore.setClipboard({
        type: "object-list",
        data: JSON.parse(JSON.stringify(list)) as ObjectHighlight[],
      });
    }
  }, [quest, sel.selectedStep, sel.targetType]);

  const handlePasteList = useCallback(() => {
    if (clipboard.type !== "npc-list" && clipboard.type !== "object-list")
      return;

    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[sel.selectedStep];
      if (!step) return;

      if (clipboard.type === "npc-list") {
        step.highlights.npc = clipboard.data as NpcHighlight[];
      } else {
        step.highlights.object = clipboard.data as ObjectHighlight[];
      }
    });
  }, [clipboard, sel.selectedStep]);

  const handleCopySelected = useCallback(() => {
    const step = quest?.questSteps?.[sel.selectedStep];
    if (!step) return;

    if (sel.targetType === "npc") {
      const item = step.highlights.npc?.[sel.targetIndex];
      if (item) {
        EditorStore.setClipboard({
          type: "npc",
          data: JSON.parse(JSON.stringify(item)) as NpcHighlight,
        });
      }
    } else {
      const item = step.highlights.object?.[sel.targetIndex];
      if (item) {
        EditorStore.setClipboard({
          type: "object",
          data: JSON.parse(JSON.stringify(item)) as ObjectHighlight,
        });
      }
    }
  }, [quest, sel.selectedStep, sel.targetType, sel.targetIndex]);

  const handlePasteSelected = useCallback(() => {
    if (
      clipboard.type === "none" ||
      clipboard.type.endsWith("-list") ||
      clipboard.type !== sel.targetType
    ) {
      return;
    }

    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[sel.selectedStep];
      if (!step) return;

      if (clipboard.type === "npc") {
        const target = step.highlights.npc?.[sel.targetIndex];
        if (target) {
          step.highlights.npc[sel.targetIndex] = clipboard.data as NpcHighlight;
        }
      } else {
        const target = step.highlights.object?.[sel.targetIndex];
        if (target) {
          step.highlights.object[sel.targetIndex] =
            clipboard.data as ObjectHighlight;
        }
      }
    });
  }, [clipboard, sel.selectedStep, sel.targetType, sel.targetIndex]);
  const handleTargetNameChange = useCallback(
    (name: string) => {
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[sel.selectedStep];
        if (!step) return;
        if (sel.targetType === "npc") {
          const t = step.highlights.npc?.[sel.targetIndex] as
            | NpcHighlight
            | undefined;
          if (t) t.npcName = name;
        } else {
          const t = step.highlights.object?.[sel.targetIndex] as
            | ObjectHighlight
            | undefined;
          if (t) t.name = name;
        }
      });
    },
    [sel.selectedStep, sel.targetType, sel.targetIndex]
  );

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewImg, setPreviewImg] = useState<string>("");
  const [previewErr, setPreviewErr] = useState<string>("");
  const [cacheStats, setCacheStats] = useState<{
    sizeMB: number;
    count: number;
  }>({ sizeMB: 0, count: 0 });

  const recordedThisSessionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats({ sizeMB: stats.totalSizeMB, count: stats.itemCount });
  };

  const triggerQueueRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent("chatheadQueuesChanged"));
  }, []);

  useEffect(() => {
    const name = currentTargetName.trim();
    if (!name) {
      setPreviewUrl("");
      setPreviewImg("");
      setPreviewErr("");
      return;
    }
    const url = getImageUrl(name, sel.targetType);
    setPreviewUrl(url);
    setPreviewImg("");
    setPreviewErr("");
  }, [currentTargetName, sel.targetType]);

  useEffect(() => {
    let canceled = false;
    if (!previewUrl) return;

    (async () => {
      try {
        const blob = await fetchImageWithCache(previewUrl);
        if (canceled) return;

        const reader = new FileReader();
        reader.onload = () => {
          if (canceled) return;
          setPreviewImg(reader.result as string);
          setPreviewErr("");

          const recordKey = `${currentTargetName.trim()}|${previewUrl}|${
            sel.selectedStep
          }`;
          if (!recordedThisSessionRef.current.has(recordKey)) {
            recordedThisSessionRef.current.add(recordKey);

            void recordObservedChathead({
              name: currentTargetName.trim(),
              variant: "default",
              sourceUrl: previewUrl,
              step: sel.selectedStep + 1,
              stepDescription:
                quest?.questSteps[sel.selectedStep]?.stepDescription,
            }).then(() => {
              triggerQueueRefresh();
            });
          }

          void loadCacheStats();
        };
        reader.onerror = () => {
          if (canceled) return;
          setPreviewImg("");
          setPreviewErr("Failed to read image");
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (canceled) return;
        console.error("Failed to load preview:", err);
        setPreviewImg("");
        setPreviewErr("Failed to load image");
      }
    })();

    return () => {
      canceled = true;
    };
  }, [
    previewUrl,
    currentTargetName,
    sel.selectedStep,
    quest,
    triggerQueueRefresh,
  ]);

  const handleQueueForPublish = useCallback(async () => {
    const name = currentTargetName.trim();
    if (!name || !previewUrl || previewErr) return;
    await addPendingChathead({
      name,
      variant: "default",
      sourceUrl: previewUrl,
      step: sel.selectedStep + 1,
      stepDescription: quest?.questSteps[sel.selectedStep]?.stepDescription,
    });
    triggerQueueRefresh();
    alert("Queued chathead for publish.");
  }, [
    currentTargetName,
    previewUrl,
    previewErr,
    sel.selectedStep,
    quest,
    triggerQueueRefresh,
  ]);

  const handleClearCache = useCallback(async () => {
    if (!confirm("Clear all cached images? This cannot be undone.")) return;
    await clearImageCache();
    await loadCacheStats();
    alert("Image cache cleared!");
  }, []);

  const onResetNpcLocation = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      const t =
        draft.questSteps[sel.selectedStep]?.highlights.npc?.[sel.targetIndex];
      if (t) t.npcLocation = { lat: 0, lng: 0 };
    });
  }, [sel.selectedStep, sel.targetIndex]);

  const onAddNpc = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      draft.questSteps[sel.selectedStep].highlights.npc.push({
        id: undefined,
        npcName: "",
        npcLocation: { lat: 0, lng: 0 },
        wanderRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
    });
    EditorStore.setSelection({
      targetType: "npc",
      // Don't change targetIndex - this prevents the fly-to
    });
  }, [sel.selectedStep]);

  const onDeleteNpc = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      draft.questSteps[sel.selectedStep].highlights.npc.splice(
        sel.targetIndex,
        1
      );
    });
  }, [sel.selectedStep, sel.targetIndex]);
  const onAddObject = useCallback(() => {
    const lengthBefore =
      EditorStore.getState().quest?.questSteps[sel.selectedStep]?.highlights
        .object.length || 0;

    EditorStore.patchQuest((draft) => {
      draft.questSteps[sel.selectedStep].highlights.object.push({
        name: "",
        objectLocation: [],
        objectRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
    });

    EditorStore.setSelection({
      targetType: "object",
      targetIndex: lengthBefore,
    });
  }, [sel.selectedStep]);
  return (
    <>
      <TargetSelectionSection
        quest={quest as Quest | null}
        selectedStep={sel.selectedStep}
        targetType={sel.targetType}
        onTargetTypeChange={handleTargetTypeChange}
        targetIndex={sel.targetIndex}
        onTargetIndexChange={handleTargetIndexChange}
        clipboard={clipboard}
        onCopyList={handleCopyList}
        onPasteList={handlePasteList}
        onCopySelected={handleCopySelected}
        onPasteSelected={handlePasteSelected}
        onDeleteObjectLocation={(locIdx: number) => {
          EditorStore.patchQuest((draft) => {
            const t =
              draft.questSteps[sel.selectedStep]?.highlights.object?.[
                sel.targetIndex
              ];
            if (!t?.objectLocation) return;
            if (locIdx < 0 || locIdx >= t.objectLocation.length) return;
            t.objectLocation.splice(locIdx, 1);
          });
        }}
        targetNameValue={currentTargetName}
        onTargetNameChange={handleTargetNameChange}
      />

      <div className="image-cache-stats">
        <div className="cache-info">
          Image Cache: {cacheStats.count} items ({cacheStats.sizeMB.toFixed(1)}{" "}
          MB)
        </div>
        <button
          onClick={() => void handleClearCache()}
          className="button--delete"
        >
          Clear Cache
        </button>
      </div>

      <div className="chathead-preview-section">
        <div className="preview-image-container">
          {previewImg ? (
            <img
              src={previewImg}
              alt={currentTargetName}
              className="preview-chathead"
            />
          ) : (
            <div
              className="preview-placeholder"
              title={previewErr || "No preview"}
            >
              {previewErr ? "Error" : "No Image"}
            </div>
          )}
        </div>
        <div className="preview-info">
          <div className="preview-name">
            Preview for "{currentTargetName || "<unnamed>"}"
          </div>
          {previewUrl && <div className="preview-url">{previewUrl}</div>}
        </div>
        <button
          className="button--add"
          onClick={() => void handleQueueForPublish()}
          disabled={!previewImg || !!previewErr}
          title={
            !previewImg
              ? "No image to queue"
              : "Queue this chathead for publish"
          }
        >
          Queue for publish
        </button>
      </div>

      {sel.targetType === "npc" ? (
        <NpcToolsSection
          onResetNpcLocation={onResetNpcLocation}
          onAddNpc={onAddNpc}
          onDeleteNpc={onDeleteNpc}
        />
      ) : (
        <ObjectToolsSection
          selectedObjectColor={currentTargetObjectData.color}
          onSelectedObjectColorChange={(color) => {
            EditorStore.patchQuest((draft) => {
              const t =
                draft.questSteps[sel.selectedStep]?.highlights.object?.[
                  sel.targetIndex
                ];
              if (!t) return;
              const list = t.objectLocation ?? (t.objectLocation = []);
              if (list.length === 0) {
                list.push({ lat: 0, lng: 0, color, numberLabel: "" });
              } else {
                list[list.length - 1].color = color;
              }
            });
          }}
          objectNumberLabel={currentTargetObjectData.numberLabel}
          onObjectNumberLabelChange={(label) => {
            EditorStore.patchQuest((draft) => {
              const t =
                draft.questSteps[sel.selectedStep]?.highlights.object?.[
                  sel.targetIndex
                ];
              if (!t) return;
              const list = t.objectLocation ?? (t.objectLocation = []);
              if (list.length === 0) {
                list.push({
                  lat: 0,
                  lng: 0,
                  color: "#FFFFFF",
                  numberLabel: label,
                });
              } else {
                list[list.length - 1].numberLabel = label;
              }
            });
          }}
          onAddObject={onAddObject}
          onDeleteObject={() =>
            EditorStore.patchQuest((draft) => {
              draft.questSteps[sel.selectedStep].highlights.object.splice(
                sel.targetIndex,
                1
              );
            })
          }
        />
      )}
    </>
  );
};

export default NpcObjectToolsPanel;
