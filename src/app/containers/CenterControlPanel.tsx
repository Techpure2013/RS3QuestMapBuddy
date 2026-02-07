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
import { fetchWikiGuide } from "../../api/wikiApi";
import { MergeStore } from "../../state/mergeStore";
import { WikiMergeModal } from "../components/WikiMerge";

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
import { autoHighlight, splitColorSegments, CHAT_PATTERNS, LODESTONE_PATTERNS, ACTION_PATTERNS, KILL_PATTERNS } from "../components/FormattingToolbar";
import { QUICK_INSERT_THUMBNAILS } from "../../data/quickInsertThumbnails";

/** Sync all QuestImage.stepDescription fields with current step descriptions */
function syncQuestImageDescriptions(draft: { questSteps: { stepDescription: string }[]; questImages?: { step: string; stepDescription: string }[] }) {
  for (const img of draft.questImages ?? []) {
    const stepIdx = parseInt(img.step, 10) - 1;
    if (!isNaN(stepIdx) && stepIdx >= 0 && stepIdx < draft.questSteps.length) {
      img.stepDescription = draft.questSteps[stepIdx].stepDescription;
    }
  }
}

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
  const [isRefreshingWiki, setIsRefreshingWiki] = useState(false);
  const [wikiRefreshMessage, setWikiRefreshMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
          syncQuestImageDescriptions(draft);
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
      syncQuestImageDescriptions(draft);
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

  // Map stored quest names → wiki page names for quests with naming differences
  const WIKI_NAME_MAP = new Map<string, string>([
    ["A Fairy Tale I: Growing Pains", "A Fairy Tale I - Growing Pains"],
    ["A Fairy Tale II: Cure a Queen", "A Fairy Tale II - Cure a Queen"],
    ["A Fairy Tale III: Battle at Ork's Rift", "A Fairy Tale III - Battle at Ork's Rift"],
    ["Raksha, the Shadow Colossus", "Raksha, the Shadow Colossus (quest)"],
    ["That Old Black Magic: Skelly by Everlight", "That Old Black Magic: Skelly By Everlight"],
  ]);

  const handleWikiRefresh = useCallback(async () => {
    const questNameVal = quest?.questName?.trim();
    if (!questNameVal || !quest) {
      alert("Load a quest first.");
      return;
    }
    try {
      setIsRefreshingWiki(true);
      setWikiRefreshMessage(null);

      // Map stored name to wiki page name if different
      const wikiName = WIKI_NAME_MAP.get(questNameVal) ?? questNameVal;
      // Fetch wiki data (GET only - no server changes)
      const wikiData = await fetchWikiGuide(wikiName);
      console.log('Wiki data received:', wikiData);
      console.log('First step dialog options:', wikiData?.steps?.[0]?.dialogOptions);

      if (!wikiData || !wikiData.steps || wikiData.steps.length === 0) {
        setWikiRefreshMessage({ type: "error", text: "Wiki guide not found or empty" });
        return;
      }

      // Open merge modal for user to review changes
      MergeStore.openMerge(questNameVal, wikiData.steps, quest.questSteps || []);

      // Clear the refreshing state - modal will handle the rest
      setWikiRefreshMessage({
        type: "success",
        text: `Found ${wikiData.steps.length} steps from wiki. Review changes in the merge dialog.`
      });
    } catch (err) {
      setWikiRefreshMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to refresh" });
    } finally {
      setIsRefreshingWiki(false);
      // Clear message after 8 seconds (longer to read the publish reminder)
      setTimeout(() => setWikiRefreshMessage(null), 8000);
    }
  }, [quest]);

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
              <button
                onClick={() => void handleWikiRefresh()}
                disabled={busy || isRefreshingWiki || !quest}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
                title="Fetch latest quest steps from RuneScape Wiki"
              >
                {isRefreshingWiki ? "Refreshing..." : "🔄 Wiki Refresh"}
              </button>
            </>
          )}
          {wikiRefreshMessage && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "3px 8px",
                borderRadius: 3,
                marginLeft: 8,
                background: wikiRefreshMessage.type === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: wikiRefreshMessage.type === "success" ? "#4ade80" : "#f87171",
              }}
            >
              {wikiRefreshMessage.text}
            </span>
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
                {/* ── Auto-highlight buttons (apply to ALL steps) ── */}
                <span style={{ color: "#4b5563", fontSize: "0.85rem", userSelect: "none", padding: "0 2px" }}>|</span>
                <button
                  type="button"
                  title="Auto-highlight chat text in parentheses — ALL steps (green)"
                  onClick={() => {
                    EditorStore.patchQuest((draft) => {
                      for (const step of draft.questSteps) {
                        step.stepDescription = autoHighlight(step.stepDescription, "#00FF00", CHAT_PATTERNS);
                        if (step.additionalStepInformation) {
                          step.additionalStepInformation = step.additionalStepInformation.map(
                            (info) => autoHighlight(info, "#00FF00", CHAT_PATTERNS)
                          );
                        }
                      }
                      syncQuestImageDescriptions(draft);
                    });
                    handleStepChange(autoHighlight(localStepDesc, "#00FF00", CHAT_PATTERNS));
                  }}
                  style={{ padding: "3px 8px", fontSize: "0.7rem", background: "#1f2937", border: "1px solid #4b5563", borderLeft: "3px solid #00FF00", borderRadius: 3, color: "#e5e7eb", cursor: "pointer" }}
                >
                  Chat
                </button>
                <button
                  type="button"
                  title="Auto-highlight lodestone/fairy ring references — ALL steps (yellow)"
                  onClick={() => {
                    // Build lodestone name → image lookup
                    const lodestoneMap = new Map<string, { name: string; imageUrl: string }>();
                    for (const t of QUICK_INSERT_THUMBNAILS) {
                      if (t.category === "lodestone") {
                        lodestoneMap.set(t.name.toLowerCase(), { name: t.name, imageUrl: t.imageUrl });
                      }
                    }

                    // After coloring, insert lodestone images next to [#FFFF00]{...lodestone} blocks
                    const insertLodestoneImages = (text: string): string => {
                      // First apply existing lodestone/fairy ring pattern highlighting
                      let result = autoHighlight(text, "#FFFF00", LODESTONE_PATTERNS);

                      // Build location name patterns from lodestone thumbnails (sorted longest-first)
                      const lodestoneEntries = Array.from(lodestoneMap.entries())
                        .sort((a, b) => b[0].length - a[0].length);

                      // Build extended patterns: "Draynor Village", "Karamja Island", etc.
                      const locationSuffixes = ["Village", "City", "Town", "Castle", "Island", "Province", "Camp"];
                      const allPatterns: { pattern: RegExp; key: string }[] = [];

                      // First add extended (longer) patterns, then base names
                      for (const [key, val] of lodestoneEntries) {
                        for (const suffix of locationSuffixes) {
                          if (!val.name.toLowerCase().includes(suffix.toLowerCase())) {
                            const extName = `${val.name} ${suffix}`;
                            const escaped = extName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            allPatterns.push({ pattern: new RegExp(`\\b${escaped}\\b`, 'gi'), key });
                          }
                        }
                      }
                      // Then add base name patterns
                      for (const [key, val] of lodestoneEntries) {
                        const escaped = val.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        allPatterns.push({ pattern: new RegExp(`\\b${escaped}\\b`, 'gi'), key });
                      }

                      // Second pass: highlight standalone location names that aren't already colored
                      for (const { pattern: namePattern } of allPatterns) {
                        const segments = splitColorSegments(result);
                        let rebuilt = '';
                        for (const seg of segments) {
                          if (seg.colored) {
                            rebuilt += seg.text;
                          } else {
                            rebuilt += seg.text.replace(namePattern, (m) => `[#FFFF00]{${m}}`);
                          }
                        }
                        result = rebuilt;
                      }

                      // Third pass: insert lodestone images after ANY [#FFFF00]{...} block that matches a lodestone name
                      result = result.replace(
                        /\[#FFFF00\]\{([^}]+)\}/gi,
                        (match, inner) => {
                          // Strip " lodestone" suffix if present for matching
                          let searchName = inner.trim();
                          const lodeMatch = searchName.match(/^(.+?)\s+lodestone$/i);
                          if (lodeMatch) {
                            searchName = lodeMatch[1].trim();
                          }
                          const searchKey = searchName.toLowerCase();

                          // Try exact match
                          let found = lodestoneMap.get(searchKey);

                          // Strip location suffixes for matching
                          if (!found) {
                            const suffixRe = /\s+(Village|City|Town|Castle|Island|Province|Camp)$/i;
                            const strippedName = searchName.replace(suffixRe, '').trim().toLowerCase();
                            if (strippedName !== searchKey) {
                              found = lodestoneMap.get(strippedName);
                              if (!found) {
                                for (const [k, v] of lodestoneMap) {
                                  if (strippedName.includes(k) || k.includes(strippedName)) {
                                    found = v;
                                    break;
                                  }
                                }
                              }
                            }
                          }

                          // Try partial match
                          if (!found) {
                            for (const [k, v] of lodestoneMap) {
                              if (searchKey.includes(k) || k.includes(searchKey)) {
                                found = v;
                                break;
                              }
                            }
                          }

                          // Only append image if not already present
                          if (found && !match.includes(`![${found.name}|24]`)) {
                            return `${match} ![${found.name}|24](${found.imageUrl})`;
                          }
                          return match;
                        }
                      );

                      // Avoid duplicate images: clean up any double image insertions
                      // Pattern: image immediately followed by the same image
                      for (const [, val] of lodestoneMap) {
                        const imgTag = `![${val.name}|24](${val.imageUrl})`;
                        const doubleImg = imgTag + imgTag;
                        while (result.includes(doubleImg)) {
                          result = result.replace(doubleImg, imgTag);
                        }
                      }

                      return result;
                    };

                    EditorStore.patchQuest((draft) => {
                      for (const step of draft.questSteps) {
                        step.stepDescription = insertLodestoneImages(step.stepDescription);
                        if (step.additionalStepInformation) {
                          step.additionalStepInformation = step.additionalStepInformation.map(
                            (info: string) => insertLodestoneImages(info)
                          );
                        }
                      }
                      syncQuestImageDescriptions(draft);
                    });
                    handleStepChange(insertLodestoneImages(localStepDesc));
                  }}
                  style={{ padding: "3px 8px", fontSize: "0.7rem", background: "#1f2937", border: "1px solid #4b5563", borderLeft: "3px solid #FFFF00", borderRadius: 3, color: "#e5e7eb", cursor: "pointer" }}
                >
                  Lode
                </button>
                <button
                  type="button"
                  title="Auto-highlight action verbs — ALL steps (cyan)"
                  onClick={() => {
                    EditorStore.patchQuest((draft) => {
                      for (const step of draft.questSteps) {
                        step.stepDescription = autoHighlight(step.stepDescription, "#00FFFF", ACTION_PATTERNS);
                        if (step.additionalStepInformation) {
                          step.additionalStepInformation = step.additionalStepInformation.map(
                            (info) => autoHighlight(info, "#00FFFF", ACTION_PATTERNS)
                          );
                        }
                      }
                      syncQuestImageDescriptions(draft);
                    });
                    handleStepChange(autoHighlight(localStepDesc, "#00FFFF", ACTION_PATTERNS));
                  }}
                  style={{ padding: "3px 8px", fontSize: "0.7rem", background: "#1f2937", border: "1px solid #4b5563", borderLeft: "3px solid #00FFFF", borderRadius: 3, color: "#e5e7eb", cursor: "pointer" }}
                >
                  Action
                </button>
                <button
                  type="button"
                  title="Auto-highlight kill/combat verbs — ALL steps (red)"
                  onClick={() => {
                    EditorStore.patchQuest((draft) => {
                      for (const step of draft.questSteps) {
                        step.stepDescription = autoHighlight(step.stepDescription, "#FF0000", KILL_PATTERNS);
                        if (step.additionalStepInformation) {
                          step.additionalStepInformation = step.additionalStepInformation.map(
                            (info) => autoHighlight(info, "#FF0000", KILL_PATTERNS)
                          );
                        }
                      }
                      syncQuestImageDescriptions(draft);
                    });
                    handleStepChange(autoHighlight(localStepDesc, "#FF0000", KILL_PATTERNS));
                  }}
                  style={{ padding: "3px 8px", fontSize: "0.7rem", background: "#1f2937", border: "1px solid #4b5563", borderLeft: "3px solid #FF0000", borderRadius: 3, color: "#e5e7eb", cursor: "pointer" }}
                >
                  Kill
                </button>
                <button
                  type="button"
                  title="Auto-highlight NPC/proper nouns — ALL steps (orange)"
                  onClick={() => {
                    const edState = EditorStore.getState();
                    const steps = edState.quest?.questSteps ?? [];

                    // First try highlights (if any exist)
                    const nameSet = new Set<string>();
                    for (const s of steps) {
                      for (const n of s.highlights?.npc ?? []) { if (n.npcName && n.npcName !== "New NPC") nameSet.add(n.npcName); }
                      for (const o of s.highlights?.object ?? []) { if (o.name && o.name !== "New Object") nameSet.add(o.name); }
                    }

                    // Also extract proper nouns from step text to supplement highlights
                    {
                      const COMMON_WORDS = new Set([
                        // Articles, prepositions, conjunctions
                        "The", "A", "An", "To", "From", "With", "In", "On", "At", "By",
                        "For", "And", "Or", "But", "Of", "As", "If", "So", "Up", "Down",
                        "Into", "Out", "Through", "Over", "Under", "Between", "About",
                        "After", "Before", "During", "Until", "While", "Near", "Around",
                        // Common verbs / words in quest guides
                        "Go", "Head", "Walk", "Run", "Travel", "Return", "Continue",
                        "Take", "Give", "Get", "Make", "Find", "Look", "See", "Need",
                        "Follow", "Leave", "Move", "Turn", "Bring", "Put", "Set",
                        "Start", "Begin", "End", "Finish", "Complete", "Choose",
                        "Select", "Click", "Right", "Left", "North", "South", "East", "West",
                        "Northeast", "Northwest", "Southeast", "Southwest",
                        "Talk", "Speak", "Interact", "Use", "Climb", "Cook", "Mine",
                        "Fish", "Chop", "Search", "Open", "Enter", "Exit", "Cross",
                        "Inspect", "Investigate", "Read", "Pick", "Picklock", "Dig",
                        "Craft", "Smith", "Fletch", "Light", "Pray", "Activate",
                        "Operate", "Pull", "Push", "Squeeze", "Jump", "Swing",
                        "Kill", "Defeat", "Slay", "Fight", "Attack", "Destroy",
                        "Teleport", "Bank", "Equip", "Wear", "Wield", "Drop", "Eat", "Drink",
                        "Buy", "Sell", "Trade", "Pay", "Receive", "Obtain", "Collect",
                        "Go", "Inside", "Outside", "Nearby", "Next", "Then", "Now",
                        "This", "That", "These", "Those", "There", "Here", "Where",
                        "You", "Your", "He", "She", "They", "His", "Her", "Their", "Its",
                        "Will", "Can", "Should", "Must", "May", "Would", "Could",
                        "Have", "Has", "Had", "Do", "Does", "Did", "Is", "Are", "Was", "Were",
                        "Be", "Been", "Being", "Not", "No", "Yes", "All", "Some", "Any",
                        "Each", "Every", "Both", "Few", "Many", "Much", "More", "Most",
                        "Other", "Another", "New", "Old", "First", "Last", "Second", "Third",
                        "Same", "Different", "Item", "Items", "Quest", "Step", "Level",
                        "Note", "Warning", "Tip", "Optional", "Required", "Recommended",
                        "Once", "Again", "Also", "Just", "Only", "Back", "Off",
                        "Cut", "Chop", "Pick", "Grab", "Check", "Try", "Ask", "Tell",
                        "Wait", "Stop", "Keep", "Watch", "Pass", "Reach", "Cross",
                        "Examine", "Loot", "Claim", "Agree", "Accept", "Decline", "Refuse",
                        "Ring", "Fairy", "Lodestone",
                        // Location-indicator words (these make a phrase a place, not an NPC)
                        "Village", "City", "Town", "Castle", "Palace", "Temple", "Cave",
                        "Dungeon", "Tower", "Mine", "Forest", "Swamp", "Island", "Mountain",
                        "Port", "Monastery", "Abbey", "Church", "Chapel", "Hall", "House",
                        "Manor", "Keep", "Fort", "Fortress", "Ruins", "Garden", "Gardens",
                        "Square", "Market", "Bridge", "Gate", "Gates", "Wall", "Walls",
                        "Road", "Path", "Trail", "River", "Lake", "Sea", "Bay", "Harbour",
                        "Dock", "Docks", "Shore", "Beach", "Desert", "Jungle", "Marsh",
                        "Plateau", "Valley", "Hills", "Hill", "Woods", "Camp", "Outpost",
                        "Quarter", "District", "Arena", "Pit", "Lair", "Den", "Nest",
                        "Passage", "Tunnel", "Basement", "Cellar", "Attic", "Floor",
                        "Room", "Chamber", "Cavern", "Sanctum", "Altar", "Shrine",
                        "Store", "Shop", "Stall",
                      ]);

                      // Also make lowercase versions for case-insensitive check
                      const commonLower = new Set(Array.from(COMMON_WORDS).map(w => w.toLowerCase()));

                      for (const s of steps) {
                        const text = s.stepDescription ?? "";
                        // Find sequences of capitalized words (1-4 consecutive)
                        const capitalWordRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
                        let m: RegExpExecArray | null;
                        while ((m = capitalWordRe.exec(text)) !== null) {
                          const phrase = m[1];
                          const words = phrase.split(/\s+/);
                          // Keep the phrase if at least one word is NOT a common word
                          const hasProperNoun = words.some(w => !commonLower.has(w.toLowerCase()));
                          if (hasProperNoun && words.length <= 4) {
                            // Trim leading/trailing common words from multi-word phrases
                            let start = 0;
                            let end = words.length;
                            while (start < end && commonLower.has(words[start].toLowerCase())) start++;
                            while (end > start && commonLower.has(words[end - 1].toLowerCase())) end--;
                            if (start < end) {
                              nameSet.add(words.slice(start, end).join(" "));
                            }
                          }
                        }

                        // Also check additionalStepInformation
                        for (const info of s.additionalStepInformation ?? []) {
                          let m2: RegExpExecArray | null;
                          const re2 = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
                          while ((m2 = re2.exec(info)) !== null) {
                            const phrase = m2[1];
                            const words = phrase.split(/\s+/);
                            const hasProperNoun = words.some(w => !commonLower.has(w.toLowerCase()));
                            if (hasProperNoun && words.length <= 4) {
                              let start = 0;
                              let end = words.length;
                              while (start < end && commonLower.has(words[start].toLowerCase())) start++;
                              while (end > start && commonLower.has(words[end - 1].toLowerCase())) end--;
                              if (start < end) {
                                nameSet.add(words.slice(start, end).join(" "));
                              }
                            }
                          }
                        }
                      }
                    }

                    // Filter out lodestone location names so they don't get NPC-highlighted
                    const lodestoneNames = new Set(
                      QUICK_INSERT_THUMBNAILS
                        .filter((t) => t.category === "lodestone")
                        .map((t) => t.name.toLowerCase())
                    );
                    for (const name of nameSet) {
                      if (lodestoneNames.has(name.toLowerCase())) nameSet.delete(name);
                    }

                    console.log("NPC auto-highlight: found names:", Array.from(nameSet));
                    const allNames = Array.from(nameSet);
                    if (allNames.length === 0) return;
                    allNames.sort((a, b) => b.length - a.length);
                    const npcPatterns = allNames.map(
                      (name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
                    );
                    EditorStore.patchQuest((draft) => {
                      for (const step of draft.questSteps) {
                        step.stepDescription = autoHighlight(step.stepDescription, "#FFA500", npcPatterns);
                        if (step.additionalStepInformation) {
                          step.additionalStepInformation = step.additionalStepInformation.map(
                            (info) => autoHighlight(info, "#FFA500", npcPatterns)
                          );
                        }
                      }
                      syncQuestImageDescriptions(draft);
                    });
                    handleStepChange(autoHighlight(localStepDesc, "#FFA500", npcPatterns));
                  }}
                  style={{ padding: "3px 8px", fontSize: "0.7rem", background: "#1f2937", border: "1px solid #4b5563", borderLeft: "3px solid #FFA500", borderRadius: 3, color: "#e5e7eb", cursor: "pointer" }}
                >
                  NPC
                </button>
                <button
                  type="button"
                  title="Auto-format compass directions and floor references — ALL steps (magenta)"
                  onClick={() => {
                    // Helper function to get ordinal suffix
                    const getOrdinalSuffix = (n: number): string => {
                      if (n % 100 >= 11 && n % 100 <= 13) return "th";
                      switch (n % 10) {
                        case 1: return "st";
                        case 2: return "nd";
                        case 3: return "rd";
                        default: return "th";
                      }
                    };

                    // Auto-format directions and floors
                    const autoFormatDirectionsAndFloors = (text: string): string => {
                      const segments = splitColorSegments(text);
                      let result = '';

                      for (const seg of segments) {
                        if (seg.colored) {
                          result += seg.text;
                          continue;
                        }

                        let processed = seg.text;

                        // FIRST: Process floor references (more specific patterns)
                        // Match floor references: "ground floor", "1st floor", "2nd floor", etc.
                        processed = processed.replace(
                          /\b(ground\s+floor|(\d+)(st|nd|rd|th)\s+floor|basement|top\s+floor)\b/gi,
                          (match, _full, floorNum, _suffix) => {
                            // Check if already underlined or has superscript notation
                            const beforeMatch = processed.substring(0, processed.indexOf(match));
                            const afterMatch = processed.substring(processed.indexOf(match) + match.length);

                            // Skip if already formatted (check for __ before or after, or ^( after)
                            if (beforeMatch.endsWith('__') || afterMatch.startsWith('__') || afterMatch.startsWith('^(')) {
                              return match;
                            }

                            const lowerMatch = match.toLowerCase().trim();

                            // Special cases: basement and top floor (no UK/US difference)
                            if (lowerMatch === 'basement' || lowerMatch === 'top floor') {
                              return `__${match}__`;
                            }

                            // Ground floor case
                            if (lowerMatch === 'ground floor') {
                              return `__ground floor__^(UK) / __1st floor__^(US)`;
                            }

                            // Numbered floors (1st, 2nd, 3rd, etc.)
                            if (floorNum) {
                              const ukNum = parseInt(floorNum, 10);
                              const usNum = ukNum + 1;
                              const ukSuffix = getOrdinalSuffix(ukNum);
                              const usSuffix = getOrdinalSuffix(usNum);

                              return `__${ukNum}${ukSuffix} floor__^(UK) / __${usNum}${usSuffix} floor__^(US)`;
                            }

                            return match;
                          }
                        );

                        // SECOND: Process compass directions
                        // Match directions: north, south, east, west, northeast, etc.
                        processed = processed.replace(
                          /\b(north-?east|north-?west|south-?east|south-?west|north|south|east|west|northern|southern|eastern|western)\b/gi,
                          (match) => {
                            // Check if already underlined
                            const beforeMatch = processed.substring(0, processed.indexOf(match));
                            const afterMatch = processed.substring(processed.indexOf(match) + match.length);

                            // Skip if already formatted
                            if (beforeMatch.endsWith('__') || afterMatch.startsWith('__')) {
                              return match;
                            }

                            return `__${match}__`;
                          }
                        );

                        result += processed;
                      }

                      return result;
                    };

                    // Apply to all steps
                    EditorStore.patchQuest((draft) => {
                      for (const step of draft.questSteps) {
                        step.stepDescription = autoFormatDirectionsAndFloors(step.stepDescription);
                        if (step.additionalStepInformation) {
                          step.additionalStepInformation = step.additionalStepInformation.map(
                            (info) => autoFormatDirectionsAndFloors(info)
                          );
                        }
                      }
                      syncQuestImageDescriptions(draft);
                    });
                    handleStepChange(autoFormatDirectionsAndFloors(localStepDesc));
                  }}
                  style={{ padding: "3px 8px", fontSize: "0.7rem", background: "#1f2937", border: "1px solid #4b5563", borderLeft: "3px solid #FF69B4", borderRadius: 3, color: "#e5e7eb", cursor: "pointer" }}
                >
                  Dir
                </button>
                <span style={{ color: "#4b5563", fontSize: "0.85rem", userSelect: "none", padding: "0 2px" }}>|</span>
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

      <WikiMergeModal />
    </>
  );
};

export default CenterControls;
