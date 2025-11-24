// src/app/containers/NpcObjectToolsPanel.tsx
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
import {
  listChatheadVariants,
  resolveObjectImageUrl,
  upsertChathead,
} from "./../../api/chathead";
import { getApiBase } from "./../../utils/apiBase";

const normName = (s: string): string => s.trim().replace(/\s+/g, " ");

function extractVariantFromName(name: string): {
  baseName: string;
  detectedVariant: string | null;
} {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return {
      baseName: match[1].trim(),
      detectedVariant: match[2].trim().toLowerCase(),
    };
  }
  return { baseName: name, detectedVariant: null };
}

export const NpcObjectToolsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const clipboard = useEditorSelector((s) => s.clipboard);

  // Read variant directly from store
  const variant = useEditorSelector((s) => s.selection.chatheadVariant);

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
    EditorStore.setSelection({ targetType: t, targetIndex: 0 });
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

  const [variantUrl, setVariantUrl] = useState<string>("");
  const [availableVariants, setAvailableVariants] = useState<string[]>([]);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewImg, setPreviewImg] = useState<string>("");
  const [previewErr, setPreviewErr] = useState<string>("");

  const [cacheStats, setCacheStats] = useState<{
    sizeMB: number;
    count: number;
  }>({ sizeMB: 0, count: 0 });

  const recordedThisSessionRef = useRef<Set<string>>(new Set());

  // Update variant in store only
  const handleVariantChange = useCallback((v: string) => {
    const normalized = v.trim().toLowerCase();
    EditorStore.setSelection({ chatheadVariant: normalized });
  }, []);

  useEffect(() => {
    void (async () => {
      const stats = await getCacheStats();
      setCacheStats({ sizeMB: stats.totalSizeMB, count: stats.itemCount });
    })();
  }, []);

  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats({ sizeMB: stats.totalSizeMB, count: stats.itemCount });
  };

  const triggerQueueRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent("chatheadQueuesChanged"));
  }, []);

  // Load available variants when target changes (NOT when variant changes)
  useEffect(() => {
    const name = normName(currentTargetName);
    if (!name) {
      setAvailableVariants([]);
      return;
    }

    let mounted = true;
    const abortController = new AbortController(); // ✅ Add abort support

    (async () => {
      try {
        if (sel.targetType === "npc") {
          const step =
            EditorStore.getState().quest?.questSteps?.[sel.selectedStep];
          const npc = step?.highlights.npc?.[sel.targetIndex];
          const variants = await listChatheadVariants(
            typeof npc?.id === "number" ? { npcId: npc.id } : { name }
          );

          if (!mounted || abortController.signal.aborted) return;

          const allVariants = variants.length ? variants : ["default"];
          setAvailableVariants(allVariants);

          const currentVariant =
            EditorStore.getState().selection.chatheadVariant;
          if (!allVariants.includes(currentVariant)) {
            const { detectedVariant } = extractVariantFromName(name);
            const newVariant =
              detectedVariant && allVariants.includes(detectedVariant)
                ? detectedVariant
                : allVariants.includes("default")
                ? "default"
                : allVariants[0];

            EditorStore.setSelection({ chatheadVariant: newVariant });
          }
        } else {
          const variants = await listChatheadVariants({ name });
          if (!mounted || abortController.signal.aborted) return;

          const allVariants = variants.length ? variants : ["default"];
          setAvailableVariants(allVariants);

          const currentVariant =
            EditorStore.getState().selection.chatheadVariant;
          if (!allVariants.includes(currentVariant)) {
            const newVariant = allVariants.includes("default")
              ? "default"
              : allVariants[0];
            EditorStore.setSelection({ chatheadVariant: newVariant });
          }
        }
      } catch (err) {
        console.error("Failed to load variants:", err);
      }
    })();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [currentTargetName, sel.targetType, sel.selectedStep, sel.targetIndex]);

  // Build preview URL when target or variant changes
  useEffect(() => {
    const raw = currentTargetName;
    const name = normName(raw);
    if (!name) {
      setPreviewUrl("");
      setPreviewImg("");
      setPreviewErr("");
      return;
    }

    const API_BASE = getApiBase();

    (async () => {
      // Use the variant as-is, or fall back to default if no variants loaded yet
      const effectiveVariant =
        availableVariants.length > 0
          ? availableVariants.includes(variant)
            ? variant
            : availableVariants.includes("default")
            ? "default"
            : availableVariants[0]
          : variant || "default";

      if (sel.targetType === "npc") {
        const step =
          EditorStore.getState().quest?.questSteps?.[sel.selectedStep];
        const npc = step?.highlights.npc?.[sel.targetIndex];

        const url =
          typeof npc?.id === "number"
            ? `${API_BASE}/api/chatheads/sprite?npcId=${
                npc.id
              }&variant=${encodeURIComponent(effectiveVariant)}`
            : `${API_BASE}/api/chatheads/sprite?name=${encodeURIComponent(
                name
              )}&variant=${encodeURIComponent(effectiveVariant)}`;

        setPreviewUrl(url);
        setPreviewImg("");
        setPreviewErr("");
      } else {
        const res = await resolveObjectImageUrl({
          objectName: name,
          preferredVariant: effectiveVariant,
        });
        setPreviewUrl(res.url);
        setPreviewImg("");
        setPreviewErr("");
      }
    })();
  }, [
    currentTargetName,
    sel.targetType,
    sel.selectedStep,
    sel.targetIndex,
    variant,
    availableVariants,
  ]);

  // Load preview image when URL changes
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

          const recordKey = `${normName(currentTargetName)}|${previewUrl}|${
            sel.selectedStep
          }|${variant}`;
          if (!recordedThisSessionRef.current.has(recordKey)) {
            recordedThisSessionRef.current.add(recordKey);

            void recordObservedChathead({
              name: normName(currentTargetName),
              variant,
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
    variant,
  ]);

  const handleQueueForPublish = useCallback(async () => {
    const name = normName(currentTargetName);
    if (!name || !previewUrl || previewErr) return;
    await addPendingChathead({
      name,
      variant: (variant || "default").trim().toLowerCase(),
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
    variant,
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
        id: null as unknown as number,
        npcName: "",
        npcLocation: {
          lat: null as unknown as number,
          lng: null as unknown as number,
        },
        wanderRadius: {
          bottomLeft: {
            lat: null as unknown as number,
            lng: null as unknown as number,
          },
          topRight: {
            lat: null as unknown as number,
            lng: null as unknown as number,
          },
        },
      });
    });
    const nextIndex =
      quest?.questSteps?.[sel.selectedStep]?.highlights.npc?.length ?? 1 - 1;
    EditorStore.setSelection({ targetType: "npc", targetIndex: nextIndex });
    EditorStore.setUi({ captureMode: "single" });
  }, [sel.selectedStep, quest]);

  const onDeleteNpc = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      draft.questSteps[sel.selectedStep].highlights.npc.splice(
        sel.targetIndex,
        1
      );
    });
  }, [sel.selectedStep, sel.targetIndex]);

  const onAddObject = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      draft.questSteps[sel.selectedStep].highlights.object.push({
        name: "",
        objectLocation: [],
        objectRadius: {
          bottomLeft: {
            lat: undefined as unknown as number,
            lng: undefined as unknown as number,
          },
          topRight: {
            lat: undefined as unknown as number,
            lng: undefined as unknown as number,
          },
        },
      });
    });
    const nextIndex =
      quest?.questSteps?.[sel.selectedStep]?.highlights.object?.length ?? 1;
    EditorStore.setSelection({ targetType: "object", targetIndex: nextIndex });

    EditorStore.setUi({ captureMode: "multi-point" });
  }, [sel.selectedStep, quest]);

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

      <div className="control-group" style={{ marginTop: 8 }}>
        <label>Chathead Variant</label>
        <select
          value={variant}
          onChange={(e) => handleVariantChange(e.target.value)}
        >
          {(availableVariants.length ? availableVariants : ["default"]).map(
            (v) => (
              <option key={v} value={v}>
                {v}
              </option>
            )
          )}
        </select>
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
          {previewUrl && (
            <div
              className="preview-url"
              style={{ fontSize: 11, color: "#9ca3af", wordBreak: "break-all" }}
            >
              {previewUrl}
            </div>
          )}
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

      {sel.targetType === "npc" && (
        <div className="control-group" style={{ marginTop: 8 }}>
          <label>Add New Variant (DB)</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.9fr 1.8fr auto",
              gap: 6,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={variant}
              onChange={(e) => handleVariantChange(e.target.value)}
              placeholder="variant name"
              style={{
                padding: "4px 6px",
                fontSize: 12,
                height: 28,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#e5e7eb",
              }}
            />
            <input
              type="text"
              value={variantUrl}
              onChange={(e) => setVariantUrl(e.target.value)}
              placeholder="Source URL"
              style={{
                padding: "4px 6px",
                fontSize: 12,
                height: 28,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#e5e7eb",
              }}
            />
            <button
              className="button--add"
              onClick={async () => {
                const v = variant.trim();
                const src = variantUrl.trim();
                const name = normName(currentTargetName);
                if (!name || !v || !src) return;
                await upsertChathead({
                  name,
                  variant: v,
                  sourceUrl: src,
                  spriteSize: 48,
                });
                setVariantUrl("");
                const step =
                  EditorStore.getState().quest?.questSteps?.[sel.selectedStep];
                const npc = step?.highlights.npc?.[sel.targetIndex];
                const variants = await listChatheadVariants(
                  typeof npc?.id === "number" ? { npcId: npc.id } : { name }
                );
                setAvailableVariants(variants.length ? variants : ["default"]);
              }}
              style={{ height: 28, padding: "0 10px", fontSize: 12 }}
              title="Save new variant to database"
            >
              Save
            </button>
          </div>
        </div>
      )}

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
