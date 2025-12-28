// src/app/containers/ExportsPanel.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  ExportsStore,
  useExportsStore,
  type SavedNpc,
  type SavedObject,
} from "../../state/exportsStore";
import { EditorStore } from "../../state/editorStore";
import { useEditorSelector } from "../../state/useEditorSelector";
import type { NpcHighlight, ObjectHighlight } from "../../state/types";
import { IconTrash, IconDownload, IconUpload, IconX } from "@tabler/icons-react";

const ExportsPanel: React.FC = () => {
  const exports = useExportsStore();
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const [activeTab, setActiveTab] = useState<"npcs" | "objects">("npcs");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFromFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          const result = ExportsStore.importFromData(data, true);
          alert(
            `Imported ${result.npcsAdded} NPCs and ${result.objectsAdded} Objects`
          );
        } catch (err) {
          console.error("Failed to import file:", err);
          alert("Failed to import file. Make sure it's a valid exports JSON.");
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be selected again
      event.target.value = "";
    },
    []
  );

  const handleImportNpc = useCallback(
    (savedNpc: SavedNpc) => {
      if (!quest) {
        alert("No quest loaded. Load a quest first.");
        return;
      }
      // Strip the savedAt and sourceQuest fields
      const { savedAt, sourceQuest, ...npcData } = savedNpc;
      const npc: NpcHighlight = {
        ...npcData,
        floor: sel.floor,
      };
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[sel.selectedStep];
        if (!step) return;
        step.highlights.npc.push(npc);
      });
      // Select the newly added NPC
      const newIndex =
        quest.questSteps[sel.selectedStep]?.highlights.npc.length ?? 0;
      EditorStore.setSelection({
        targetType: "npc",
        targetIndex: newIndex,
      });
    },
    [quest, sel.selectedStep, sel.floor]
  );

  const handleImportObject = useCallback(
    (savedObj: SavedObject) => {
      if (!quest) {
        alert("No quest loaded. Load a quest first.");
        return;
      }
      // Strip the savedAt and sourceQuest fields
      const { savedAt, sourceQuest, ...objData } = savedObj;
      const obj: ObjectHighlight = {
        ...objData,
        floor: sel.floor,
      };
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[sel.selectedStep];
        if (!step) return;
        step.highlights.object.push(obj);
      });
      // Select the newly added object
      const newIndex =
        quest.questSteps[sel.selectedStep]?.highlights.object.length ?? 0;
      EditorStore.setSelection({
        targetType: "object",
        targetIndex: newIndex,
      });
    },
    [quest, sel.selectedStep, sel.floor]
  );

  const handleExportToFile = useCallback(() => {
    const data = ExportsStore.getState();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rs3qb-exports-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 12px",
    background: isActive ? "#1e3a5f" : "#0f172a",
    border: "none",
    borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
    color: isActive ? "#e5e7eb" : "#9ca3af",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    transition: "all 0.15s ease",
  });

  const itemStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    background: "#0f172a",
    borderRadius: 6,
    marginBottom: 6,
    border: "1px solid #1e293b",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 11,
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  };

  return (
    <div className="exports-panel">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: "none" }}
      />

      {/* Header with import/export buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          {exports.npcs.length} NPCs, {exports.objects.length} Objects saved
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={handleImportFromFile}
            style={{
              ...buttonStyle,
              background: "#065f46",
              color: "#a7f3d0",
            }}
            title="Import from JSON file"
          >
            <IconUpload size={14} />
            Import
          </button>
          <button
            onClick={handleExportToFile}
            style={{
              ...buttonStyle,
              background: "#1e3a5f",
              color: "#93c5fd",
            }}
            title="Download all exports as JSON file"
          >
            <IconDownload size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab("npcs")}
          style={tabStyle(activeTab === "npcs")}
        >
          NPCs ({exports.npcs.length})
        </button>
        <button
          onClick={() => setActiveTab("objects")}
          style={tabStyle(activeTab === "objects")}
        >
          Objects ({exports.objects.length})
        </button>
      </div>

      {/* Clear button */}
      {((activeTab === "npcs" && exports.npcs.length > 0) ||
        (activeTab === "objects" && exports.objects.length > 0)) && (
        <button
          onClick={() => {
            if (
              confirm(
                `Clear all saved ${activeTab}? This cannot be undone.`
              )
            ) {
              if (activeTab === "npcs") {
                ExportsStore.clearNpcs();
              } else {
                ExportsStore.clearObjects();
              }
            }
          }}
          style={{
            ...buttonStyle,
            background: "#7f1d1d",
            color: "#fecaca",
            marginBottom: 8,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <IconTrash size={14} />
          Clear All {activeTab === "npcs" ? "NPCs" : "Objects"}
        </button>
      )}

      {/* Content */}
      <div
        style={{
          maxHeight: 300,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {activeTab === "npcs" && (
          <>
            {exports.npcs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  color: "#6b7280",
                  fontSize: 12,
                }}
              >
                No NPCs saved yet.
                <br />
                Use "Save to Library" in the NPC tools to add some.
              </div>
            ) : (
              exports.npcs.map((npc, index) => (
                <div key={`npc-${index}-${npc.savedAt}`} style={itemStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#e5e7eb",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {npc.npcName || "Unnamed NPC"}
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>
                      {npc.sourceQuest && (
                        <span style={{ marginRight: 8 }}>
                          From: {npc.sourceQuest}
                        </span>
                      )}
                      {formatDate(npc.savedAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleImportNpc(npc)}
                      style={{
                        ...buttonStyle,
                        background: "#065f46",
                        color: "#a7f3d0",
                      }}
                      title="Import to current step"
                    >
                      Import
                    </button>
                    <button
                      onClick={() => ExportsStore.removeNpc(index)}
                      style={{
                        ...buttonStyle,
                        background: "#7f1d1d",
                        color: "#fecaca",
                        padding: "4px 6px",
                      }}
                      title="Remove from library"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "objects" && (
          <>
            {exports.objects.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  color: "#6b7280",
                  fontSize: 12,
                }}
              >
                No Objects saved yet.
                <br />
                Use "Save to Library" in the Object tools to add some.
              </div>
            ) : (
              exports.objects.map((obj, index) => (
                <div key={`obj-${index}-${obj.savedAt}`} style={itemStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#e5e7eb",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {obj.name || "Unnamed Object"}
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>
                      {obj.objectLocation?.length ?? 0} points
                      {obj.sourceQuest && (
                        <span style={{ marginLeft: 8 }}>
                          From: {obj.sourceQuest}
                        </span>
                      )}
                      <span style={{ marginLeft: 8 }}>
                        {formatDate(obj.savedAt)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleImportObject(obj)}
                      style={{
                        ...buttonStyle,
                        background: "#065f46",
                        color: "#a7f3d0",
                      }}
                      title="Import to current step"
                    >
                      Import
                    </button>
                    <button
                      onClick={() => ExportsStore.removeObject(index)}
                      style={{
                        ...buttonStyle,
                        background: "#7f1d1d",
                        color: "#fecaca",
                        padding: "4px 6px",
                      }}
                      title="Remove from library"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExportsPanel;
