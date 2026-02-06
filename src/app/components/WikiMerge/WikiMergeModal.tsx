// src/app/components/WikiMerge/WikiMergeModal.tsx
// Side-by-side comparison modal for wiki merge with field-level selection and drag-and-drop

import React, { useEffect, useCallback, useRef, useState } from "react";
import { MergeStore } from "../../../state/mergeStore";
import { useMergeIsOpen } from "../../../state/useMergeSelector";
import { EditorStore } from "../../../state/editorStore";
import { saveActiveBundle } from "../../../idb/bundleStore";
import { questToBundle } from "../../../state/types";
import type { WikiQuestStep } from "../../../api/wikiApi";
import type { QuestStep } from "../../../state/types";

// Field names for selection and drag-drop
type FieldName = "description" | "itemsNeeded" | "itemsRecommended" | "dialogOptions" | "additionalInfo";

const FIELD_LABELS: Record<FieldName, string> = {
  description: "Description",
  itemsNeeded: "Items Needed",
  itemsRecommended: "Items Recommended",
  dialogOptions: "Dialog Options",
  additionalInfo: "Additional Info",
};

// Pending drop data structure
interface PendingDrop {
  sourceStep: number;
  sourceField: FieldName;
  content: string | string[];
}

// Drag data structure
interface DragData {
  sourceStepIndex: number;
  fieldName: FieldName;
  content: string | string[];
}

// Get field content from step
function getFieldContent(step: WikiQuestStep | QuestStep, field: FieldName): string | string[] | null {
  switch (field) {
    case "description":
      return step.stepDescription || null;
    case "itemsNeeded":
      return step.itemsNeeded?.length ? step.itemsNeeded : null;
    case "itemsRecommended":
      return step.itemsRecommended?.length ? step.itemsRecommended : null;
    case "dialogOptions":
      return step.dialogOptions?.length ? step.dialogOptions : null;
    case "additionalInfo":
      return step.additionalStepInformation?.length ? step.additionalStepInformation : null;
    default:
      return null;
  }
}

// Check if field has content
function hasFieldContent(step: WikiQuestStep | QuestStep | null, field: FieldName): boolean {
  if (!step) return false;
  const content = getFieldContent(step, field);
  if (content === null) return false;
  if (Array.isArray(content)) return content.length > 0;
  return !!content;
}

// Draggable field component for wiki side
const WikiField: React.FC<{
  stepIndex: number;
  field: FieldName;
  content: string | string[];
  isSelected: boolean;
  onToggleSelect: () => void;
  onDragStart: (data: DragData) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}> = ({ stepIndex, field, content, isSelected, onToggleSelect, onDragStart, onDragEnd, isDragging }) => {
  const handleDragStart = (e: React.DragEvent) => {
    const data: DragData = { sourceStepIndex: stepIndex, fieldName: field, content };
    e.dataTransfer.setData("application/json", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(data);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking the checkbox itself
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      return;
    }
    onToggleSelect();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        marginBottom: 8,
        padding: 8,
        background: isSelected ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${isSelected ? "#22c55e" : "#374151"}`,
        borderRadius: 4,
        cursor: "pointer",
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 2, cursor: "pointer", accentColor: "#22c55e" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2, fontWeight: 500 }}>
            {FIELD_LABELS[field]}
          </div>
          {typeof content === "string" ? (
            <div style={{ fontSize: 13, color: "#e5e7eb", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
              {content}
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#d1d5db" }}>
              {content.map((item, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          style={{
            fontSize: 14,
            color: "#6b7280",
            cursor: "grab",
            userSelect: "none",
            padding: "4px",
          }}
          title="Drag to target"
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </div>
      </div>
    </div>
  );
};

// Drop zone component for local side
const LocalField: React.FC<{
  stepIndex: number;
  field: FieldName;
  content: string | string[] | null;
  pendingDrop: PendingDrop | null;
  onDrop: (targetStep: number, targetField: FieldName, data: DragData) => void;
  onClearDrop: () => void;
  dragActive: boolean;
}> = ({ stepIndex, field, content, pendingDrop, onDrop, onClearDrop, dragActive }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const data: DragData = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(stepIndex, field, data);
    } catch {
      // Invalid drop data
    }
  };

  const hasContent = content !== null && (typeof content === "string" ? content.length > 0 : content.length > 0);
  const showDropZone = dragActive || isOver || pendingDrop;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        marginBottom: 8,
        padding: 8,
        background: pendingDrop
          ? "rgba(234, 179, 8, 0.15)"
          : isOver
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(255, 255, 255, 0.03)",
        border: `1px ${isOver ? "dashed" : "solid"} ${
          pendingDrop ? "#eab308" : isOver ? "#3b82f6" : "#374151"
        }`,
        borderRadius: 4,
        minHeight: showDropZone && !hasContent ? 40 : undefined,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2, fontWeight: 500 }}>
        {FIELD_LABELS[field]}
        {pendingDrop && (
          <span
            onClick={onClearDrop}
            style={{
              marginLeft: 8,
              background: "#eab308",
              color: "#000",
              padding: "1px 6px",
              borderRadius: 3,
              fontSize: 9,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Click to remove pending import"
          >
            From Step {pendingDrop.sourceStep + 1} ({FIELD_LABELS[pendingDrop.sourceField]}) ✕
          </span>
        )}
      </div>
      {hasContent ? (
        typeof content === "string" ? (
          <div style={{ fontSize: 13, color: "#e5e7eb", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
            {content}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#d1d5db" }}>
            {content!.map((item, i) => (
              <li key={i} style={{ marginBottom: 2 }}>{item}</li>
            ))}
          </ul>
        )
      ) : (
        <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
          {isOver ? "Drop here..." : "(empty)"}
        </div>
      )}
    </div>
  );
};

// Insert zone component for inserting before/after local step
const InsertZone: React.FC<{
  stepIndex: number;
  position: "before" | "after";
  onDrop: (targetStep: number, position: "before" | "after", data: DragData) => void;
  dragActive: boolean;
  hasPending: boolean;
  pendingInfo?: { sourceStep: number; sourceField: FieldName };
  onClearPending?: () => void;
}> = ({ stepIndex, position, onDrop, dragActive, hasPending, pendingInfo, onClearPending }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const data: DragData = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(stepIndex, position, data);
    } catch {
      // Invalid drop data
    }
  };

  if (!dragActive && !isOver && !hasPending) {
    return null;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: "6px 12px",
        marginBottom: position === "before" ? 4 : 0,
        marginTop: position === "after" ? 4 : 0,
        background: hasPending
          ? "rgba(234, 179, 8, 0.15)"
          : isOver
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(59, 130, 246, 0.05)",
        border: `1px dashed ${hasPending ? "#eab308" : isOver ? "#3b82f6" : "#3b82f655"}`,
        borderRadius: 4,
        fontSize: 11,
        color: hasPending ? "#eab308" : isOver ? "#3b82f6" : "#6b7280",
        textAlign: "center",
        transition: "all 0.15s ease",
      }}
    >
      {hasPending && pendingInfo ? (
        <span>
          Insert from Step {pendingInfo.sourceStep + 1} ({FIELD_LABELS[pendingInfo.sourceField]})
          <span
            onClick={onClearPending}
            style={{ marginLeft: 6, cursor: "pointer", fontWeight: 600 }}
          >
            ✕
          </span>
        </span>
      ) : (
        `Insert ${position}`
      )}
    </div>
  );
};

// Wiki step card with field-level selection
const WikiStepCard: React.FC<{
  step: WikiQuestStep | null;
  stepIndex: number;
  selectedFields: Set<FieldName>;
  onToggleField: (field: FieldName) => void;
  onSelectAll: () => void;
  onFullOverwrite: () => void;
  onDragStart: (data: DragData) => void;
  onDragEnd: () => void;
  draggingField: DragData | null;
}> = ({ step, stepIndex, selectedFields, onToggleField, onSelectAll, onFullOverwrite, onDragStart, onDragEnd, draggingField }) => {
  if (!step) {
    return (
      <div
        style={{
          padding: 12,
          marginBottom: 8,
          background: "rgba(34, 197, 94, 0.05)",
          border: "1px solid #22c55e33",
          borderRadius: 6,
          color: "#6b7280",
          fontStyle: "italic",
        }}
      >
        No corresponding step
      </div>
    );
  }

  const fields: FieldName[] = ["description", "itemsNeeded", "itemsRecommended", "dialogOptions", "additionalInfo"];
  const availableFields = fields.filter((f) => hasFieldContent(step, f));
  const allSelected = availableFields.length > 0 && availableFields.every((f) => selectedFields.has(f));

  return (
    <div
      style={{
        padding: 12,
        marginBottom: 8,
        background: selectedFields.size > 0 ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.08)",
        border: `1px solid ${selectedFields.size > 0 ? "#22c55e88" : "#22c55e55"}`,
        borderRadius: 6,
      }}
    >
      {/* Step header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <span
          style={{
            background: "#22c55e",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Step {stepIndex + 1}
        </span>
        {availableFields.length > 0 && (
          <>
            <button
              onClick={onSelectAll}
              style={{
                padding: "2px 6px",
                fontSize: 10,
                background: allSelected ? "#22c55e" : "#374151",
                border: "none",
                borderRadius: 3,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={onFullOverwrite}
              style={{
                padding: "2px 6px",
                fontSize: 10,
                background: "#3b82f6",
                border: "none",
                borderRadius: 3,
                color: "#fff",
                cursor: "pointer",
              }}
              title="Replace entire local step with wiki step"
            >
              Full Overwrite
            </button>
          </>
        )}
        {selectedFields.size > 0 && (
          <span style={{ fontSize: 10, color: "#22c55e" }}>
            {selectedFields.size} selected
          </span>
        )}
      </div>

      {availableFields.length === 0 ? (
        <div style={{ color: "#6b7280", fontStyle: "italic", fontSize: 13 }}>Empty step</div>
      ) : (
        availableFields.map((field) => {
          const content = getFieldContent(step, field);
          if (!content) return null;
          const isDragging = draggingField?.sourceStepIndex === stepIndex && draggingField?.fieldName === field;
          return (
            <WikiField
              key={field}
              stepIndex={stepIndex}
              field={field}
              content={content}
              isSelected={selectedFields.has(field)}
              onToggleSelect={() => onToggleField(field)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={isDragging}
            />
          );
        })
      )}
    </div>
  );
};

// Local step card with drop zones
const LocalStepCard: React.FC<{
  step: QuestStep | null;
  stepIndex: number;
  pendingDrops: Map<string, PendingDrop>;
  pendingInserts: Map<string, { position: "before" | "after"; data: DragData }>;
  onFieldDrop: (targetStep: number, targetField: FieldName, data: DragData) => void;
  onInsertDrop: (targetStep: number, position: "before" | "after", data: DragData) => void;
  onClearFieldDrop: (key: string) => void;
  onClearInsertDrop: (key: string) => void;
  dragActive: boolean;
}> = ({ step, stepIndex, pendingDrops, pendingInserts, onFieldDrop, onInsertDrop, onClearFieldDrop, onClearInsertDrop, dragActive }) => {
  const fields: FieldName[] = ["description", "itemsNeeded", "itemsRecommended", "dialogOptions", "additionalInfo"];

  const beforeKey = `insert-${stepIndex}-before`;
  const afterKey = `insert-${stepIndex}-after`;
  const pendingBefore = pendingInserts.get(beforeKey);
  const pendingAfter = pendingInserts.get(afterKey);

  if (!step) {
    return (
      <div
        style={{
          padding: 12,
          marginBottom: 8,
          background: "rgba(59, 130, 246, 0.05)",
          border: "1px solid #3b82f633",
          borderRadius: 6,
          color: "#6b7280",
          fontStyle: "italic",
        }}
      >
        <InsertZone
          stepIndex={stepIndex}
          position="before"
          onDrop={onInsertDrop}
          dragActive={dragActive}
          hasPending={!!pendingBefore}
          pendingInfo={pendingBefore ? { sourceStep: pendingBefore.data.sourceStepIndex, sourceField: pendingBefore.data.fieldName } : undefined}
          onClearPending={() => onClearInsertDrop(beforeKey)}
        />
        No corresponding step
        <InsertZone
          stepIndex={stepIndex}
          position="after"
          onDrop={onInsertDrop}
          dragActive={dragActive}
          hasPending={!!pendingAfter}
          pendingInfo={pendingAfter ? { sourceStep: pendingAfter.data.sourceStepIndex, sourceField: pendingAfter.data.fieldName } : undefined}
          onClearPending={() => onClearInsertDrop(afterKey)}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 12,
        marginBottom: 8,
        background: "rgba(59, 130, 246, 0.08)",
        border: "1px solid #3b82f655",
        borderRadius: 6,
      }}
    >
      {/* Insert Before zone */}
      <InsertZone
        stepIndex={stepIndex}
        position="before"
        onDrop={onInsertDrop}
        dragActive={dragActive}
        hasPending={!!pendingBefore}
        pendingInfo={pendingBefore ? { sourceStep: pendingBefore.data.sourceStepIndex, sourceField: pendingBefore.data.fieldName } : undefined}
        onClearPending={() => onClearInsertDrop(beforeKey)}
      />

      {/* Step header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <span
          style={{
            background: "#3b82f6",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Step {stepIndex + 1}
        </span>
      </div>

      {/* Field drop zones */}
      {fields.map((field) => {
        const content = getFieldContent(step, field);
        const dropKey = `local-${stepIndex}-${field}`;
        const pending = pendingDrops.get(dropKey);
        return (
          <LocalField
            key={field}
            stepIndex={stepIndex}
            field={field}
            content={content}
            pendingDrop={pending || null}
            onDrop={onFieldDrop}
            onClearDrop={() => onClearFieldDrop(dropKey)}
            dragActive={dragActive}
          />
        );
      })}

      {/* Insert After zone */}
      <InsertZone
        stepIndex={stepIndex}
        position="after"
        onDrop={onInsertDrop}
        dragActive={dragActive}
        hasPending={!!pendingAfter}
        pendingInfo={pendingAfter ? { sourceStep: pendingAfter.data.sourceStepIndex, sourceField: pendingAfter.data.fieldName } : undefined}
        onClearPending={() => onClearInsertDrop(afterKey)}
      />
    </div>
  );
};

export const WikiMergeModal: React.FC = () => {
  const isOpen = useMergeIsOpen();
  const { questName, wikiSteps, localSteps } = MergeStore.getState();

  // Selected fields per wiki step: Map<stepIndex, Set<fieldName>>
  const [selectedFields, setSelectedFields] = useState<Map<number, Set<FieldName>>>(new Map());

  // Pending field drops: key = "local-{stepIndex}-{fieldName}", value = dropped content
  const [pendingDrops, setPendingDrops] = useState<Map<string, PendingDrop>>(new Map());

  // Pending insert drops: key = "insert-{stepIndex}-{before|after}"
  const [pendingInserts, setPendingInserts] = useState<Map<string, { position: "before" | "after"; data: DragData }>>(new Map());

  // Currently dragging field
  const [draggingField, setDraggingField] = useState<DragData | null>(null);



  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [isOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFields(new Map());
      setPendingDrops(new Map());
      setPendingInserts(new Map());
      setDraggingField(null);
    }
  }, [isOpen]);

  // Calculate pending count
  const pendingCount = selectedFields.size + pendingDrops.size + pendingInserts.size;
  const totalSelectedFields = Array.from(selectedFields.values()).reduce((sum, set) => sum + set.size, 0);

  // Close handler
  const handleClose = () => {
    if (pendingCount > 0 || totalSelectedFields > 0) {
      const confirm = window.confirm(
        `You have pending import selections. Discard changes?`
      );
      if (!confirm) return;
    }
    MergeStore.closeMerge();
  };

  // Toggle field selection for a wiki step
  const handleToggleField = (stepIndex: number, field: FieldName) => {
    setSelectedFields((prev) => {
      const next = new Map(prev);
      const stepFields = next.get(stepIndex) || new Set();
      const newStepFields = new Set(stepFields);
      if (newStepFields.has(field)) {
        newStepFields.delete(field);
      } else {
        newStepFields.add(field);
      }
      if (newStepFields.size === 0) {
        next.delete(stepIndex);
      } else {
        next.set(stepIndex, newStepFields);
      }
      return next;
    });
  };

  // Select/deselect all fields for a wiki step
  const handleSelectAll = (stepIndex: number) => {
    const step = wikiSteps[stepIndex];
    if (!step) return;
    const fields: FieldName[] = ["description", "itemsNeeded", "itemsRecommended", "dialogOptions", "additionalInfo"];
    const availableFields = fields.filter((f) => hasFieldContent(step, f));

    setSelectedFields((prev) => {
      const next = new Map(prev);
      const currentSelected = next.get(stepIndex) || new Set();
      const allSelected = availableFields.every((f) => currentSelected.has(f));

      if (allSelected) {
        next.delete(stepIndex);
      } else {
        next.set(stepIndex, new Set(availableFields));
      }
      return next;
    });
  };

  // Full overwrite - immediately apply all wiki step fields to local step
  const handleFullOverwrite = (wikiIndex: number) => {
    const wikiStep = wikiSteps[wikiIndex];
    if (!wikiStep) return;

    const quest = EditorStore.getState().quest;
    if (!quest) return;

    // Create updated steps array
    const updatedSteps = [...quest.questSteps];

    // Ensure the local step exists (create if needed)
    while (updatedSteps.length <= wikiIndex) {
      updatedSteps.push({
        stepDescription: "",
        itemsNeeded: [],
        itemsRecommended: [],
        dialogOptions: [],
        additionalStepInformation: [],
        highlights: { npc: [], object: [] },
        floor: 0,
      });
    }

    // Overwrite with wiki data
    const localStep = { ...updatedSteps[wikiIndex] };
    if (wikiStep.stepDescription) localStep.stepDescription = wikiStep.stepDescription;
    if (wikiStep.itemsNeeded?.length) localStep.itemsNeeded = [...wikiStep.itemsNeeded];
    if (wikiStep.itemsRecommended?.length) localStep.itemsRecommended = [...wikiStep.itemsRecommended];
    if (wikiStep.dialogOptions?.length) localStep.dialogOptions = [...wikiStep.dialogOptions];
    if (wikiStep.additionalStepInformation?.length) localStep.additionalStepInformation = [...wikiStep.additionalStepInformation];

    updatedSteps[wikiIndex] = localStep;

    // Apply to store
    EditorStore.patchQuest((draft) => {
      draft.questSteps = updatedSteps;
    });

    // Save to IndexedDB
    const updatedQuest = EditorStore.getState().quest;
    if (updatedQuest) {
      saveActiveBundle(questToBundle(updatedQuest));
    }

    // Clear any selections for this step
    setSelectedFields((prev) => {
      const next = new Map(prev);
      next.delete(wikiIndex);
      return next;
    });
  };

  // Full quest overwrite - immediately apply ALL wiki steps to local steps
  const handleFullQuestOverwrite = () => {
    if (wikiSteps.length === 0) return;

    const confirm = window.confirm(
      `This will overwrite ALL ${localSteps.length} local steps with ${wikiSteps.length} wiki steps. Continue?`
    );
    if (!confirm) return;

    const quest = EditorStore.getState().quest;
    if (!quest) return;

    // Create new steps array from wiki data
    const updatedSteps: QuestStep[] = wikiSteps.map((wikiStep) => {
      const newStep: QuestStep = {
        stepDescription: wikiStep.stepDescription || "",
        itemsNeeded: wikiStep.itemsNeeded?.length ? [...wikiStep.itemsNeeded] : [],
        itemsRecommended: wikiStep.itemsRecommended?.length ? [...wikiStep.itemsRecommended] : [],
        dialogOptions: wikiStep.dialogOptions?.length ? [...wikiStep.dialogOptions] : [],
        additionalStepInformation: wikiStep.additionalStepInformation?.length ? [...wikiStep.additionalStepInformation] : [],
        highlights: { npc: [], object: [] },
        floor: 0,
      };
      return newStep;
    });

    // Apply to store
    EditorStore.patchQuest((draft) => {
      draft.questSteps = updatedSteps;
    });

    // Save to IndexedDB
    const updatedQuest = EditorStore.getState().quest;
    if (updatedQuest) {
      saveActiveBundle(questToBundle(updatedQuest));
    }

    // Clear all selections and close
    setSelectedFields(new Map());
    setPendingDrops(new Map());
    setPendingInserts(new Map());
    MergeStore.closeMerge();
  };

  // Handle field drop onto local step field
  const handleFieldDrop = (targetStep: number, targetField: FieldName, data: DragData) => {
    const key = `local-${targetStep}-${targetField}`;
    setPendingDrops((prev) => {
      const next = new Map(prev);
      next.set(key, {
        sourceStep: data.sourceStepIndex,
        sourceField: data.fieldName,
        content: data.content,
      });
      return next;
    });
  };

  // Handle drop onto insert zone
  const handleInsertDrop = (targetStep: number, position: "before" | "after", data: DragData) => {
    const key = `insert-${targetStep}-${position}`;
    setPendingInserts((prev) => {
      const next = new Map(prev);
      next.set(key, { position, data });
      return next;
    });
  };

  // Clear a pending field drop
  const handleClearFieldDrop = (key: string) => {
    setPendingDrops((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Clear a pending insert drop
  const handleClearInsertDrop = (key: string) => {
    setPendingInserts((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Clear all selections and drops
  const handleClearAll = () => {
    setSelectedFields(new Map());
    setPendingDrops(new Map());
    setPendingInserts(new Map());
  };

  // Apply logic: build final steps array
  const handleApply = () => {
    const quest = EditorStore.getState().quest;
    if (!quest) {
      console.error("[WikiMergeModal] No quest loaded");
      return;
    }

    // Start with local steps copy
    const finalSteps: QuestStep[] = localSteps.map((step) => ({ ...step }));

    // Track insertions to apply at the end (to avoid index shifting issues)
    const insertsBefore: Map<number, QuestStep[]> = new Map();
    const insertsAfter: Map<number, QuestStep[]> = new Map();

    // Process selected fields - merge into corresponding local step
    selectedFields.forEach((fields, wikiIndex) => {
      const wikiStep = wikiSteps[wikiIndex];
      if (!wikiStep) return;

      // Ensure local step exists at this index
      if (!finalSteps[wikiIndex]) {
        finalSteps[wikiIndex] = wikiStepToQuestStep(wikiStep);
      }

      const localStep = finalSteps[wikiIndex];
      fields.forEach((field) => {
        const content = getFieldContent(wikiStep, field);
        if (content !== null) {
          applyFieldContent(localStep, field, content);
        }
      });
    });

    // Process pending drops - merge dropped content into target field
    pendingDrops.forEach((drop, key) => {
      const match = key.match(/^local-(\d+)-(.+)$/);
      if (!match) return;
      const targetIndex = parseInt(match[1], 10);
      const targetField = match[2] as FieldName;

      // Ensure target step exists
      if (!finalSteps[targetIndex]) {
        finalSteps[targetIndex] = {
          stepDescription: "",
          itemsNeeded: [],
          itemsRecommended: [],
          dialogOptions: [],
          additionalStepInformation: [],
          highlights: { npc: [], object: [] },
          floor: 0,
        };
      }

      applyFieldContent(finalSteps[targetIndex], targetField, drop.content);
    });

    // Process insert drops
    pendingInserts.forEach((insert, key) => {
      const match = key.match(/^insert-(\d+)-(before|after)$/);
      if (!match) return;
      const targetIndex = parseInt(match[1], 10);
      const position = match[2] as "before" | "after";

      // Create a new step from the dragged content
      const newStep: QuestStep = {
        stepDescription: "",
        itemsNeeded: [],
        itemsRecommended: [],
        dialogOptions: [],
        additionalStepInformation: [],
        highlights: { npc: [], object: [] },
        floor: 0,
      };
      applyFieldContent(newStep, insert.data.fieldName, insert.data.content);

      if (position === "before") {
        const existing = insertsBefore.get(targetIndex) || [];
        existing.push(newStep);
        insertsBefore.set(targetIndex, existing);
      } else {
        const existing = insertsAfter.get(targetIndex) || [];
        existing.push(newStep);
        insertsAfter.set(targetIndex, existing);
      }
    });

    // Build final array with insertions
    const result: QuestStep[] = [];
    for (let i = 0; i < finalSteps.length; i++) {
      // Insert before
      const before = insertsBefore.get(i);
      if (before) {
        result.push(...before);
      }

      // The step itself
      if (finalSteps[i]) {
        result.push(finalSteps[i]);
      }

      // Insert after
      const after = insertsAfter.get(i);
      if (after) {
        result.push(...after);
      }
    }

    // Apply to EditorStore
    EditorStore.patchQuest((draft) => {
      draft.questSteps = result;
    });

    // Save to IndexedDB
    const updatedQuest = EditorStore.getState().quest;
    if (updatedQuest) {
      saveActiveBundle(questToBundle(updatedQuest));
    }

    MergeStore.closeMerge();
  };

  if (!isOpen) return null;

  // Calculate step counts for display
  const maxSteps = Math.max(wikiSteps.length, localSteps.length);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "95vw",
          height: "90vh",
          maxWidth: 1600,
          background: "#111827",
          borderRadius: 8,
          border: "1px solid #374151",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            background: "#1f2937",
            borderBottom: "1px solid #374151",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, color: "#e5e7eb", flex: 1 }}>
            Wiki Merge: <span style={{ color: "#93c5fd" }}>{questName}</span>
          </h2>

          <button
            onClick={handleFullQuestOverwrite}
            style={{
              padding: "6px 12px",
              background: "#dc2626",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              marginRight: 8,
            }}
            title="Replace ALL local steps with wiki steps"
          >
            Full Quest Overwrite
          </button>

          <button
            onClick={handleClose}
            style={{
              padding: "6px 12px",
              background: "#374151",
              border: "none",
              borderRadius: 4,
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            X
          </button>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: "8px 16px",
            background: "#1f293766",
            borderBottom: "1px solid #374151",
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          <strong style={{ color: "#e5e7eb" }}>How to use:</strong>{" "}
          Check fields to import, or drag fields to specific locations on the right.
          Drop on a field to merge, or use Insert zones to add new steps.
        </div>

        {/* Column Headers */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #374151",
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "8px 16px",
              background: "rgba(34, 197, 94, 0.1)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>
              Wiki Steps ({wikiSteps.length}) - Select or Drag
            </span>
          </div>
          {/* Divider */}
          <div
            style={{
              width: 2,
              background: "#374151",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              padding: "8px 16px",
              background: "rgba(59, 130, 246, 0.1)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>
              Local Steps ({localSteps.length}) - Drop Targets
            </span>
          </div>
        </div>

        {/* Main content - two columns */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: Wiki steps */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 12,
            }}
          >
            {Array.from({ length: maxSteps }, (_, i) => (
              <WikiStepCard
                key={`wiki-${i}`}
                step={wikiSteps[i] || null}
                stepIndex={i}
                selectedFields={selectedFields.get(i) || new Set()}
                onToggleField={(field) => handleToggleField(i, field)}
                onSelectAll={() => handleSelectAll(i)}
                onFullOverwrite={() => handleFullOverwrite(i)}
                onDragStart={setDraggingField}
                onDragEnd={() => setDraggingField(null)}
                draggingField={draggingField}
              />
            ))}

            {wikiSteps.length === 0 && (
              <div style={{ color: "#6b7280", textAlign: "center", padding: 24 }}>
                No wiki steps available
              </div>
            )}
          </div>

          {/* Middle divider */}
          <div
            style={{
              width: 2,
              background: "#374151",
              flexShrink: 0,
            }}
          />

          {/* Right: Local steps */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 12,
            }}
          >
            {Array.from({ length: maxSteps }, (_, i) => (
              <LocalStepCard
                key={`local-${i}`}
                step={localSteps[i] || null}
                stepIndex={i}
                pendingDrops={pendingDrops}
                pendingInserts={pendingInserts}
                onFieldDrop={handleFieldDrop}
                onInsertDrop={handleInsertDrop}
                onClearFieldDrop={handleClearFieldDrop}
                onClearInsertDrop={handleClearInsertDrop}
                dragActive={!!draggingField}
              />
            ))}

            {localSteps.length === 0 && (
              <div style={{ color: "#6b7280", textAlign: "center", padding: 24 }}>
                No local steps available
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            background: "#1f2937",
            borderTop: "1px solid #374151",
            gap: 12,
          }}
        >
          {/* Status */}
          <div style={{ flex: 1, fontSize: 13, color: "#9ca3af" }}>
            {totalSelectedFields > 0 || pendingDrops.size > 0 || pendingInserts.size > 0 ? (
              <span>
                <span style={{ color: "#22c55e", fontWeight: 500 }}>{totalSelectedFields}</span> fields selected
                {pendingDrops.size > 0 && (
                  <span>, <span style={{ color: "#eab308", fontWeight: 500 }}>{pendingDrops.size}</span> field drops</span>
                )}
                {pendingInserts.size > 0 && (
                  <span>, <span style={{ color: "#3b82f6", fontWeight: 500 }}>{pendingInserts.size}</span> inserts</span>
                )}
              </span>
            ) : (
              <span>Select fields with checkboxes or drag to specific locations</span>
            )}
          </div>

          {/* Keyboard hints */}
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            <span>Esc Close</span>
          </div>

          {/* Action buttons */}
          {(totalSelectedFields > 0 || pendingDrops.size > 0 || pendingInserts.size > 0) && (
            <button
              onClick={handleClearAll}
              style={{
                padding: "8px 16px",
                background: "#374151",
                border: "none",
                borderRadius: 4,
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Clear All
            </button>
          )}
          <button
            onClick={handleClose}
            style={{
              padding: "8px 16px",
              background: "#374151",
              border: "none",
              borderRadius: 4,
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={totalSelectedFields === 0 && pendingDrops.size === 0 && pendingInserts.size === 0}
            style={{
              padding: "8px 16px",
              background: totalSelectedFields > 0 || pendingDrops.size > 0 || pendingInserts.size > 0 ? "#22c55e" : "#374151",
              border: "none",
              borderRadius: 4,
              color: totalSelectedFields > 0 || pendingDrops.size > 0 || pendingInserts.size > 0 ? "#fff" : "#6b7280",
              cursor: totalSelectedFields > 0 || pendingDrops.size > 0 || pendingInserts.size > 0 ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Import Selected
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper: Convert WikiQuestStep to QuestStep
function wikiStepToQuestStep(wiki: WikiQuestStep): QuestStep {
  return {
    stepDescription: wiki.stepDescription || "",
    itemsNeeded: wiki.itemsNeeded || [],
    itemsRecommended: wiki.itemsRecommended || [],
    dialogOptions: wiki.dialogOptions || [],
    additionalStepInformation: wiki.additionalStepInformation || [],
    highlights: { npc: [], object: [] },
    floor: 0,
  };
}

// Helper: Apply field content to a step
function applyFieldContent(step: QuestStep, field: FieldName, content: string | string[]) {
  switch (field) {
    case "description":
      step.stepDescription = typeof content === "string" ? content : content.join("\n");
      break;
    case "itemsNeeded":
      step.itemsNeeded = Array.isArray(content) ? content : [content];
      break;
    case "itemsRecommended":
      step.itemsRecommended = Array.isArray(content) ? content : [content];
      break;
    case "dialogOptions":
      step.dialogOptions = Array.isArray(content) ? content : [content];
      break;
    case "additionalInfo":
      step.additionalStepInformation = Array.isArray(content) ? content : [content];
      break;
  }
}

export default WikiMergeModal;
