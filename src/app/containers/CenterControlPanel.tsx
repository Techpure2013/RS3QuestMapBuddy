// src/app/containers/CenterControlPanel.tsx
import React, { useCallback, useState, useEffect, useRef } from "react";
import { QuestPickerModal } from "./../sections/QuestPickerModal";
import { fetchQuestBundle, saveQuestBundle } from "./../../api/bundleApi";
import { bundleToQuest, questToBundle } from "./../../state/types";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
} from "./../../state/editorStore";
import { saveActiveBundle, loadActiveBundle } from "./../../idb/bundleStore";
import {
  loadPendingChatheads,
  clearPendingChatheads,
  PendingChathead,
} from "./../../idb/chatheadQueue";
import { upsertChathead } from "./../../api/chathead";
import { useEditorSelector } from "./../../state/useEditorSelector";
import { recordQuestNpcLocations } from "./../../feature/npcPublisher";
import { clearImageCache } from "../../idb/imageCache";
import { clearObservedChatheads } from "idb/chatheadsObserved";

import { useAuth } from "./../../state/useAuth";
import { fetchMe } from "./../../api/auth";
import { buildPlotLink } from "utils/plotLinks";
import { RichText, stripFormatting } from "../../utils/RichText";
import { ColorPicker } from "../components/ColorPicker";
import { ImagePicker } from "../components/ImagePicker";
import { StepLinkPicker } from "../components/StepLinkPicker";
import { TableCreator } from "../components/TableCreator";
import { QuickInsertPicker } from "../components/QuickInsertPicker";
import { useEditorHotkeys, getHotkeyForAction } from "../hooks/useEditorHotkeys";
import { editorActions } from "../../keybinds/actions";
import { keybindStore } from "../../keybinds/keybindStore";
import { IconTable } from "@tabler/icons-react";

export const CenterControls: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const { isAuthed, email, refresh, signOut } = useAuth();
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);

  const questName = quest?.questName ?? "(none)";
  const stepDescription =
    quest?.questSteps?.[selection.selectedStep]?.stepDescription ?? "";
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [localStepDesc, setLocalStepDesc] = useState(stepDescription);
  const [hasStepChanges, setHasStepChanges] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showStepLinkPicker, setShowStepLinkPicker] = useState(false);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [showQuickInsert, setShowQuickInsert] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to keybind changes to update tooltips
  const [, forceKeybindUpdate] = useState(0);
  useEffect(() => {
    return keybindStore.subscribe(() => forceKeybindUpdate((n) => n + 1));
  }, []);

  // Undo/Redo stack for step description
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isUndoRedoRef = useRef(false); // Flag to prevent adding undo entry during undo/redo
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ show: boolean }>;
      setShowEditor(ce.detail.show);
    };
    window.addEventListener("toggleStepEditorVisibility", handler);
    return () => {
      window.removeEventListener("toggleStepEditorVisibility", handler);
    };
  }, []);
  // Sync auth state
  useEffect(() => {
    void refresh();
  }, [refresh]);
  // Sync step description and reset undo/redo on step change
  useEffect(() => {
    setLocalStepDesc(stepDescription);
    setHasStepChanges(false);
    // Reset undo/redo stacks when switching steps
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [selection.selectedStep, stepDescription]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localStepDesc]);

  const handleStepChange = (text: string, skipUndo: boolean = false) => {
    // Push current state to undo stack (unless this is an undo/redo operation)
    if (!skipUndo && !isUndoRedoRef.current && localStepDesc !== text) {
      undoStackRef.current.push(localStepDesc);
      // Limit stack size to 50 entries
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift();
      }
      // Clear redo stack on new change
      redoStackRef.current = [];
    }
    isUndoRedoRef.current = false;

    setLocalStepDesc(text);
    const changed = text !== stepDescription;
    setHasStepChanges(changed);
    setSaveStatus("idle");

    // Clear existing auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new auto-save timer (1.5 seconds after last change)
    if (changed) {
      autoSaveTimerRef.current = setTimeout(() => {
        setSaveStatus("saving");
        EditorStore.patchQuest((draft) => {
          const step = draft.questSteps[selection.selectedStep];
          if (step) step.stepDescription = text;
        });
        setHasStepChanges(false);
        setSaveStatus("saved");
        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 1500);
    }
  };

  // Cleanup timer on unmount or step change
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selection.selectedStep]);

  const handleStepSave = () => {
    // Clear auto-save timer since we're saving manually
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaveStatus("saving");
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[selection.selectedStep];
      if (step) step.stepDescription = localStepDesc;
    });
    setHasStepChanges(false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleStepDiscard = () => {
    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setLocalStepDesc(stepDescription);
    setHasStepChanges(false);
    setSaveStatus("idle");
  };

  // Wrap selected text with formatting markers
  // cursorOffset: how many characters back from the end to place cursor (default 0 = end)
  const wrapSelection = (prefix: string, suffix: string, cursorOffset: number = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = localStepDesc;
    const selectedText = text.substring(start, end);

    const newText =
      text.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      text.substring(end);

    handleStepChange(newText);

    // Restore cursor position after the wrapped text (minus cursorOffset)
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length - cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const formatButtons = [
    { id: "bold", label: "B", title: "Bold (**text**)", prefix: "**", suffix: "**", style: { fontWeight: 700 }, cursorOffset: 0 },
    { id: "italic", label: "I", title: "Italic (*text*)", prefix: "*", suffix: "*", style: { fontStyle: "italic" }, cursorOffset: 0 },
    { id: "underline", label: "U", title: "Underline (__text__)", prefix: "__", suffix: "__", style: { textDecoration: "underline" }, cursorOffset: 0 },
    { id: "superscript", label: "x²", title: "Superscript (^text or ^(text))", prefix: "^(", suffix: ")", style: { fontSize: "0.7em" }, cursorOffset: 0 },
    { id: "link", label: "🔗", title: "Link ([text](url))", prefix: "[", suffix: "]()", style: {}, cursorOffset: 1 },
  ] as const;

  // Helper to build tooltip with hotkey
  const getTooltip = (baseTitle: string, actionId: string) => {
    const hotkey = getHotkeyForAction(actionId);
    return hotkey ? `${baseTitle} (${hotkey})` : baseTitle;
  };

  // Hotkey actions for the editor
  const handleClearFormatting = useCallback(() => {
    const stripped = stripFormatting(localStepDesc);
    if (stripped !== localStepDesc) {
      handleStepChange(stripped);
    }
  }, [localStepDesc]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previousState = undoStackRef.current.pop()!;
    redoStackRef.current.push(localStepDesc);
    isUndoRedoRef.current = true;
    handleStepChange(previousState, true);
  }, [localStepDesc]);

  // Redo handler
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push(localStepDesc);
    isUndoRedoRef.current = true;
    handleStepChange(nextState, true);
  }, [localStepDesc]);

  // Toggle between NPC and Object target
  const handleToggleTarget = useCallback(() => {
    const currentType = selection.targetType;
    const newType = currentType === "npc" ? "object" : "npc";
    EditorStore.setSelection({ targetType: newType, targetIndex: 0 });
    requestFlyToCurrentTargetAt(5, "selection");
  }, [selection.targetType]);

  // Add NPC to current step
  const handleAddNpc = useCallback(() => {
    if (!quest) return;
    // Calculate the new index BEFORE patching (it will be at the current length)
    const step = quest.questSteps[selection.selectedStep];
    const newIndex = step?.highlights?.npc?.length ?? 0;

    EditorStore.patchQuest((draft) => {
      const draftStep = draft.questSteps[selection.selectedStep];
      if (!draftStep) return;
      if (!draftStep.highlights) draftStep.highlights = { npc: [], object: [] };
      if (!draftStep.highlights.npc) draftStep.highlights.npc = [];
      draftStep.highlights.npc.push({
        npcName: "New NPC",
        npcLocation: { lat: 0, lng: 0 },
      });
    });
    // Select the new NPC, enable coordinate capture, and focus name input
    EditorStore.setSelection({ targetType: "npc", targetIndex: newIndex });
    EditorStore.setUi({ captureMode: "single", focusTargetName: true });
  }, [quest, selection.selectedStep]);

  // Add Object to current step
  const handleAddObject = useCallback(() => {
    if (!quest) return;
    // Calculate the new index BEFORE patching (it will be at the current length)
    const step = quest.questSteps[selection.selectedStep];
    const newIndex = step?.highlights?.object?.length ?? 0;

    EditorStore.patchQuest((draft) => {
      const draftStep = draft.questSteps[selection.selectedStep];
      if (!draftStep) return;
      if (!draftStep.highlights) draftStep.highlights = { npc: [], object: [] };
      if (!draftStep.highlights.object) draftStep.highlights.object = [];
      draftStep.highlights.object.push({
        name: "New Object",
        objectLocation: [],
      });
    });
    // Select the new object, enable coordinate capture, and focus name input
    EditorStore.setSelection({ targetType: "object", targetIndex: newIndex });
    EditorStore.setUi({ captureMode: "multi-point", focusTargetName: true });
  }, [quest, selection.selectedStep]);

  // Add new step after current
  const handleAddStep = useCallback(() => {
    if (!quest) return;
    const insertIndex = selection.selectedStep + 1;
    EditorStore.patchQuest((draft) => {
      const newStep = {
        stepDescription: "",
        floor: draft.questSteps[selection.selectedStep]?.floor ?? 0,
        highlights: { npc: [], object: [] },
      };
      draft.questSteps.splice(insertIndex, 0, newStep);
    });
    // Select the new step
    EditorStore.setSelection({ selectedStep: insertIndex, targetIndex: 0 });
  }, [quest, selection.selectedStep]);

  // Formatting callbacks
  const handleBold = useCallback(() => wrapSelection("**", "**", 0), [wrapSelection]);
  const handleItalic = useCallback(() => wrapSelection("*", "*", 0), [wrapSelection]);
  const handleUnderlineFormat = useCallback(() => wrapSelection("__", "__", 0), [wrapSelection]);
  const handleSuperscript = useCallback(() => wrapSelection("^(", ")", 0), [wrapSelection]);
  const handleLink = useCallback(() => wrapSelection("[", "]()", 1), [wrapSelection]);
  const handleColor = useCallback(() => setShowColorPicker(true), []);
  const handleImage = useCallback(() => setShowImagePicker(true), []);
  const handleStepLink = useCallback(() => setShowStepLinkPicker(true), []);
  const handleTable = useCallback(() => setShowTableCreator(true), []);

  const hotkeyActions = {
    onBold: handleBold,
    onItalic: handleItalic,
    onUnderline: handleUnderlineFormat,
    onSuperscript: handleSuperscript,
    onLink: handleLink,
    onColor: handleColor,
    onImage: handleImage,
    onStepLink: handleStepLink,
    onTable: handleTable,
    onClear: handleClearFormatting,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleTarget: handleToggleTarget,
    onAddNpc: handleAddNpc,
    onAddObject: handleAddObject,
    onAddStep: handleAddStep,
    onSave: handleStepSave,
  };

  // Register hotkeys (scoped to textarea for text formatting)
  useEditorHotkeys(hotkeyActions, true, textareaRef as React.RefObject<HTMLElement>);

  // Register editor callbacks with the global keybind system
  useEffect(() => {
    editorActions.registerCallbacks({
      // Formatting
      bold: handleBold,
      italic: handleItalic,
      underline: handleUnderlineFormat,
      superscript: handleSuperscript,
      link: handleLink,
      color: handleColor,
      image: handleImage,
      stepLink: handleStepLink,
      table: handleTable,
      clearFormatting: handleClearFormatting,
      // Actions
      undo: handleUndo,
      redo: handleRedo,
      toggleTarget: handleToggleTarget,
      addNpc: handleAddNpc,
      addObject: handleAddObject,
      addStep: handleAddStep,
    });

    return () => {
      editorActions.unregisterCallbacks();
    };
  }, [
    handleBold, handleItalic, handleUnderlineFormat,
    handleSuperscript, handleLink, handleColor, handleImage, handleStepLink,
    handleTable, handleClearFormatting, handleUndo, handleRedo,
    handleToggleTarget, handleAddNpc, handleAddObject, handleAddStep
  ]);

  // Enhanced quest picker with cleanup
  const handlePick = useCallback(async (name: string) => {
    try {
      setBusy(true);

      // Step 1: Clear image cache
      console.log("🧹 Clearing image cache...");
      await clearImageCache();
      console.log("🧹 Clearing Observed Queue cache...");
      await clearObservedChatheads();
      window.dispatchEvent(new CustomEvent("chatheadQueuesChanged"));
      // Step 2: Load new quest
      console.log(`📦 Loading quest: ${name}...`);
      const bundle = await fetchQuestBundle(name);
      const flat = bundleToQuest(bundle);

      // Step 3: Find first valid target in step 0
      const firstStep = flat.questSteps[0];
      let targetType: "npc" | "object" = "npc";
      let targetIndex = 0;
      let floor = firstStep?.floor ?? 0;

      const isValidLocation = (loc: { lat: number; lng: number } | undefined) =>
        loc && (loc.lat !== 0 || loc.lng !== 0);

      if (firstStep) {
        // Check NPCs first
        const firstNpc = firstStep.highlights.npc?.[0];
        const hasValidNpc = firstNpc && isValidLocation(firstNpc.npcLocation);

        // Check Objects second
        const firstObject = firstStep.highlights.object?.[0];
        const hasValidObject =
          firstObject &&
          firstObject.objectLocation?.some((loc: any) => isValidLocation(loc));

        if (hasValidNpc) {
          targetType = "npc";
          targetIndex = 0;
          console.log(`🎯 Auto-selected first NPC: ${firstNpc.npcName}`);
        } else if (hasValidObject) {
          targetType = "object";
          targetIndex = 0;
          console.log(`🎯 Auto-selected first Object: ${firstObject.name}`);
        } else {
          console.log("⚠️ No valid targets found in step 1");
        }
      }

      // Step 4: Reset all state
      console.log("🔄 Resetting editor state...");
      EditorStore.setQuest(flat);
      EditorStore.setSelection({
        selectedStep: 0,
        targetIndex,
        targetType,
        floor,
      });
      requestFlyToCurrentTargetAt(5, "quest-load");
      EditorStore.setClipboard({ type: "none", data: null });
      EditorStore.setHighlights({
        highlightedNpc: null,
        highlightedObject: null,
        selectedObjectFromSearch: null,
        selectedArea: null,
      });

      // Step 5: Save to local cache
      await saveActiveBundle(bundle);

      console.log("✅ Quest loaded successfully");
      setOpen(false);
    } catch (e) {
      console.error("❌ Failed to load quest:", e);
      alert("Failed to load quest. See console.");
    } finally {
      setBusy(false);
    }
  }, []);

  const publishAllChatheads = useCallback(async () => {
    const pending = await loadPendingChatheads();
    if (pending.length === 0) {
      return { published: 0, failed: 0, deduplicated: 0 };
    }

    const uniqueMap = new Map<string, PendingChathead>();
    for (const item of pending) {
      const key = item.npcId
        ? `id:${item.npcId}|${item.variant}|${item.sourceUrl}`
        : `name:${item.name?.toLowerCase()}|${item.variant}|${item.sourceUrl}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    const uniqueChatheads = Array.from(uniqueMap.values());
    const deduplicatedCount = pending.length - uniqueChatheads.length;

    let published = 0;
    let failed = 0;

    for (const item of uniqueChatheads) {
      try {
        await upsertChathead({
          npcId: item.npcId,
          name: item.name,
          variant: item.variant,
          sourceUrl: item.sourceUrl,
          spriteSize: 48,
        });
        published++;
      } catch (err) {
        failed++;
        console.error(`Failed to publish chathead:`, err);
      }
    }

    await clearPendingChatheads();
    window.dispatchEvent(new CustomEvent("chatheadQueuesChanged"));

    return { published, failed, deduplicated: deduplicatedCount };
  }, []);

  const handlePublish = useCallback(async () => {
    const me = await fetchMe();
    if (!me.ok) {
      alert("You must be logged in to publish.");
      return;
    }

    try {
      setBusy(true);

      const chatheadResult = await publishAllChatheads();
      console.log(`Chatheads: ${chatheadResult.published} published`);

      const currentQuest = EditorStore.getState().quest;
      let npcResult = { recorded: 0, skipped: 0, failed: 0 };

      if (currentQuest) {
        npcResult = await recordQuestNpcLocations(currentQuest);
        console.log(`NPC Locations: ${npcResult.recorded} recorded`);
      }

      let normalized = EditorStore.getState().quest
        ? questToBundle(EditorStore.getState().quest!)
        : null;

      if (!normalized) {
        const active = await loadActiveBundle().catch(() => null);
        if (!active) {
          alert("Nothing to publish. Load a quest or save edits first.");
          return;
        }
        normalized = active;
      }

      await saveQuestBundle(normalized);
      await saveActiveBundle(normalized);

      alert(
        `Published!\nChatheads: ${chatheadResult.published}\nQuest: ${normalized.quest.name}`
      );
    } catch (e) {
      console.error("Publish failed:", e);
      alert(`Publish failed: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
    }
  }, [publishAllChatheads]);

  const handleSaveEdits = useCallback(async () => {
    try {
      const q = EditorStore.getState().quest;
      if (!q) {
        alert("No quest loaded.");
        return;
      }
      const normalized = questToBundle(q);
      await saveActiveBundle(normalized);
      alert("Edits saved locally.");
    } catch (e) {
      console.error("Save failed:", e);
      alert("Save failed.");
    }
  }, []);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          background: "rgba(11, 18, 32, 0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #374151",
          padding: "10px 16px",
        }}
      >
        {/* Row 1: Quest Controls */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 10,
            borderBottom: "1px solid #374151",
          }}
        >
          <div
            style={{
              padding: "5px 10px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 4,
              color: "#9ca3af",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            Quest: <strong style={{ color: "#e5e7eb" }}>{questName}</strong>
          </div>

          <button
            onClick={() => setOpen(true)}
            disabled={busy}
            style={{ fontSize: "0.75rem", padding: "5px 12px" }}
          >
            {busy ? "Loading…" : "Open Quest"}
          </button>
          {isAuthed && (
            <>
              <button
                onClick={async () => {
                  try {
                    setBusy(true);
                    await clearImageCache();
                    await EditorStore.newQuest();
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                New Quest
              </button>
              <button
                onClick={() => void handleSaveEdits()}
                disabled={busy}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                Save Edits
              </button>
              <button
                className="button--add"
                onClick={() => void handlePublish()}
                disabled={busy}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                Publish
              </button>
              <button
                onClick={async () => {
                  const name = quest?.questName?.trim() ?? "";
                  if (!name) {
                    alert("Load a quest first.");
                    return;
                  }
                  const url = buildPlotLink(name, selection.selectedStep);
                  await navigator.clipboard.writeText(url).catch(() => {});
                  alert(`Plot link copied:\n${url}`);
                }}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                Copy Plot Link
              </button>
            </>
          )}

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {isAuthed ? (
              <>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  Logged in as{" "}
                  <strong style={{ color: "#e5e7eb" }}>
                    {email ?? "admin"}
                  </strong>
                </span>
                <button
                  onClick={async () => {
                    await signOut();
                  }}
                  style={{ fontSize: "0.75rem", padding: "5px 12px" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  const base =
                    window.__APP_CONFIG__?.API_BASE ??
                    (window.location.hostname === "127.0.0.1" ||
                    window.location.hostname === "localhost"
                      ? "http://127.0.0.1:42069"
                      : window.location.origin);
                  window.location.href = `${base}/api/auth/google/login`;
                }}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                Login with Google
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Step Editor - Now with auto-growing textarea */}
        {showEditor && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
            }}
          >
            <div style={{ position: "relative" }}>
              <label
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Step {selection.selectedStep + 1}
                {hasStepChanges && saveStatus === "idle" && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "0.625rem",
                      color: "#f59e0b",
                      background: "rgba(245, 158, 11, 0.1)",
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    Typing...
                  </span>
                )}
                {saveStatus === "saving" && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "0.625rem",
                      color: "#60a5fa",
                      background: "rgba(96, 165, 250, 0.1)",
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    Saving...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "0.625rem",
                      color: "#34d399",
                      background: "rgba(52, 211, 153, 0.1)",
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    ✓ Saved
                  </span>
                )}
              </label>
              {/* Formatting Toolbar */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                {formatButtons.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    title={getTooltip(btn.title, btn.id)}
                    onClick={() => wrapSelection(btn.prefix, btn.suffix, btn.cursorOffset)}
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                      background: "#374151",
                      border: "1px solid #4b5563",
                      borderRadius: 3,
                      color: "#e5e7eb",
                      cursor: "pointer",
                      minWidth: 28,
                      ...btn.style,
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
                {/* Clear formatting button */}
                <button
                  type="button"
                  title={getTooltip("Remove all formatting", "clear")}
                  onClick={() => {
                    const stripped = stripFormatting(localStepDesc);
                    if (stripped !== localStepDesc) {
                      handleStepChange(stripped);
                    }
                  }}
                  style={{
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    background: "#7f1d1d",
                    border: "1px solid #991b1b",
                    borderRadius: 3,
                    color: "#fca5a5",
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear
                </button>
                {/* Color picker button */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    title={getTooltip("Color ([#hex]{text} or [r,g,b]{text})", "color")}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                      background: "linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7)",
                      border: showColorPicker ? "2px solid #fff" : "1px solid #4b5563",
                      borderRadius: 3,
                      color: "#fff",
                      cursor: "pointer",
                      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
                    Color
                  </button>
                  {showColorPicker && (
                    <ColorPicker
                      onSelect={(colorCode) => {
                        wrapSelection(`${colorCode}{`, "}");
                        setShowColorPicker(false);
                      }}
                      onClose={() => setShowColorPicker(false)}
                    />
                  )}
                </div>
                {/* Image picker button */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    title={getTooltip("Insert image (![alt](url) or ![alt|size](url))", "image")}
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                      background: "#065f46",
                      border: showImagePicker ? "2px solid #fff" : "1px solid #047857",
                      borderRadius: 3,
                      color: "#6ee7b7",
                      cursor: "pointer",
                    }}
                  >
                    🖼 Image
                  </button>
                  {showImagePicker && (
                    <ImagePicker
                      onSelect={(markup) => {
                        const textarea = textareaRef.current;
                        if (!textarea) return;

                        // Insert after selected text (or at cursor if no selection)
                        const end = textarea.selectionEnd;
                        const newText = localStepDesc.substring(0, end) + markup + localStepDesc.substring(end);
                        handleStepChange(newText);

                        setShowImagePicker(false);

                        requestAnimationFrame(() => {
                          textarea.focus();
                          const newPos = end + markup.length;
                          textarea.setSelectionRange(newPos, newPos);
                        });
                      }}
                      onClose={() => setShowImagePicker(false)}
                    />
                  )}
                </div>
                {/* Quick Insert picker button */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    title="Quick insert (lodestones, prayers, map icons)"
                    onClick={() => setShowQuickInsert(!showQuickInsert)}
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                      background: "#7c2d12",
                      border: showQuickInsert ? "2px solid #fff" : "1px solid #c2410c",
                      borderRadius: 3,
                      color: "#fdba74",
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Quick
                  </button>
                  {showQuickInsert && (
                    <QuickInsertPicker
                      onSelect={(markup) => {
                        const textarea = textareaRef.current;
                        if (!textarea) return;

                        const end = textarea.selectionEnd;
                        const newText = localStepDesc.substring(0, end) + markup + localStepDesc.substring(end);
                        handleStepChange(newText);

                        setShowQuickInsert(false);

                        requestAnimationFrame(() => {
                          textarea.focus();
                          const newPos = end + markup.length;
                          textarea.setSelectionRange(newPos, newPos);
                        });
                      }}
                      onClose={() => setShowQuickInsert(false)}
                    />
                  )}
                </div>
                {/* Step link picker button */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    title={getTooltip("Link to another step (step(N){text})", "steplink")}
                    onClick={() => setShowStepLinkPicker(!showStepLinkPicker)}
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                      background: "#0f766e",
                      border: showStepLinkPicker ? "2px solid #fff" : "1px solid #14b8a6",
                      borderRadius: 3,
                      color: "#5eead4",
                      cursor: "pointer",
                    }}
                  >
                    ⤴ Step
                  </button>
                  {showStepLinkPicker && (
                    <StepLinkPicker
                      selectedText={(() => {
                        const textarea = textareaRef.current;
                        if (!textarea) return "";
                        return localStepDesc.substring(textarea.selectionStart, textarea.selectionEnd);
                      })()}
                      onSelect={(stepNumber) => {
                        wrapSelection(`step(${stepNumber}){`, "}");
                        setShowStepLinkPicker(false);
                      }}
                      onClose={() => setShowStepLinkPicker(false)}
                    />
                  )}
                </div>
                {/* Table creator button */}
                <button
                  type="button"
                  title={getTooltip("Create table (paste from wiki or build manually)", "table")}
                  onClick={() => setShowTableCreator(true)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    background: "#7c3aed",
                    border: "1px solid #8b5cf6",
                    borderRadius: 3,
                    color: "#ddd6fe",
                    cursor: "pointer",
                  }}
                >
                  ⊞ Table
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={localStepDesc}
                onChange={(e) => handleStepChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault();
                    handleStepSave();
                  }
                  if (e.key === "Escape" && hasStepChanges) {
                    e.preventDefault();
                    handleStepDiscard();
                  }
                }}
                onDoubleClick={(e) => {
                  // Remove trailing space from double-click word selection
                  const textarea = e.currentTarget;
                  // Use setTimeout to let browser selection happen first
                  setTimeout(() => {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = textarea.value;
                    const selectedText = text.substring(start, end);

                    // If selection ends with whitespace, trim it
                    if (selectedText && /\s+$/.test(selectedText)) {
                      const trimmed = selectedText.replace(/\s+$/, '');
                      textarea.setSelectionRange(start, start + trimmed.length);
                    }
                  }, 0);
                }}
                placeholder="Describe this step..."
                style={{
                  width: "100%",
                  minHeight: 70,
                  maxHeight: 250,
                  resize: "none",
                  overflow: "hidden",
                  border: hasStepChanges
                    ? "1px solid #f59e0b"
                    : "1px solid #374151",
                  padding: "8px 10px",
                  background: "#1f2937",
                  borderRadius: 4,
                  color: "#e5e7eb",
                  fontSize: "0.8125rem",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
              {/* Rich Text Preview */}
              {localStepDesc && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 4,
                    fontSize: "0.8125rem",
                    lineHeight: 1.5,
                    color: "#e5e7eb",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.625rem",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Preview
                  </span>
                  <RichText
                    onStepClick={(step) => {
                      // Step numbers in UI are 1-indexed, but internally 0-indexed
                      const stepIndex = step - 1;
                      if (stepIndex >= 0 && quest?.questSteps && stepIndex < quest.questSteps.length) {
                        EditorStore.autoSelectFirstValidTargetForStep(stepIndex);
                      }
                    }}
                  >
                    {localStepDesc}
                  </RichText>
                </div>
              )}
            </div>

            {hasStepChanges && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={handleStepDiscard}
                  style={{
                    fontSize: "0.6875rem",
                    whiteSpace: "nowrap",
                    padding: "5px 10px",
                  }}
                  title="Discard changes (Esc)"
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <QuestPickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onPick={handlePick}
      />

      {showTableCreator && (
        <TableCreator
          onInsert={(markup) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const end = textarea.selectionEnd;
            const newText = localStepDesc.substring(0, end) + markup + localStepDesc.substring(end);
            handleStepChange(newText);

            setShowTableCreator(false);

            requestAnimationFrame(() => {
              textarea.focus();
              const newPos = end + markup.length;
              textarea.setSelectionRange(newPos, newPos);
            });
          }}
          onClose={() => setShowTableCreator(false)}
        />
      )}

    </>
  );
};

export default CenterControls;
