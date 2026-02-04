import React, { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "editor-hotkey-settings";

export interface HotkeyMapping {
  id: string;
  label: string;
  description: string;
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export const DEFAULT_HOTKEYS: HotkeyMapping[] = [
  // Text formatting
  { id: "bold", label: "Bold", description: "**text**", key: "b", ctrl: true, shift: false, alt: false },
  { id: "italic", label: "Italic", description: "*text*", key: "i", ctrl: true, shift: false, alt: false },
  { id: "underline", label: "Underline", description: "__text__", key: "u", ctrl: true, shift: false, alt: false },
  { id: "superscript", label: "Superscript", description: "^(text)", key: ".", ctrl: true, shift: true, alt: false },
  { id: "link", label: "Link", description: "[text](url)", key: "k", ctrl: true, shift: false, alt: false },
  { id: "color", label: "Color Picker", description: "Open color picker", key: "h", ctrl: true, shift: true, alt: false },
  { id: "image", label: "Image", description: "Insert image", key: "g", ctrl: true, shift: true, alt: false },
  { id: "steplink", label: "Step Link", description: "Link to step", key: "j", ctrl: true, shift: true, alt: false },
  { id: "table", label: "Table", description: "Create table", key: "t", ctrl: true, shift: true, alt: false },
  { id: "clear", label: "Clear Formatting", description: "Remove all formatting", key: "\\", ctrl: true, shift: false, alt: false },
  // Editor actions
  { id: "save", label: "Save Quest", description: "Save current quest", key: "s", ctrl: true, shift: false, alt: false },
  { id: "undo", label: "Undo", description: "Undo step description edit", key: "z", ctrl: true, shift: false, alt: false },
  { id: "redo", label: "Redo", description: "Redo step description edit", key: "z", ctrl: true, shift: true, alt: false },
  // Target & Step actions
  { id: "toggleTarget", label: "Toggle NPC/Object", description: "Switch between NPC and Object", key: "Tab", ctrl: false, shift: false, alt: true },
  { id: "addNpc", label: "Add NPC", description: "Add new NPC to step", key: "n", ctrl: true, shift: true, alt: false },
  { id: "addObject", label: "Add Object", description: "Add new object to step", key: "o", ctrl: true, shift: true, alt: false },
  { id: "addStep", label: "Add Step", description: "Add new step after current", key: "Enter", ctrl: true, shift: true, alt: false },
];

export function loadHotkeys(): HotkeyMapping[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new hotkeys added in updates
      return DEFAULT_HOTKEYS.map(def => {
        const saved = parsed.find((h: HotkeyMapping) => h.id === def.id);
        return saved ? { ...def, ...saved } : def;
      });
    }
  } catch (e) {
    console.error("Failed to load hotkey settings:", e);
  }
  return DEFAULT_HOTKEYS;
}

export function saveHotkeys(hotkeys: HotkeyMapping[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hotkeys));
  } catch (e) {
    console.error("Failed to save hotkey settings:", e);
  }
}

export function getHotkeyDisplay(hotkey: HotkeyMapping): string {
  const parts: string[] = [];
  if (hotkey.ctrl) parts.push("Ctrl");
  if (hotkey.shift) parts.push("Shift");
  if (hotkey.alt) parts.push("Alt");
  parts.push(hotkey.key.toUpperCase());
  return parts.join(" + ");
}

export function matchesHotkey(e: KeyboardEvent, hotkey: HotkeyMapping): boolean {
  return (
    e.key.toLowerCase() === hotkey.key.toLowerCase() &&
    e.ctrlKey === hotkey.ctrl &&
    e.shiftKey === hotkey.shift &&
    e.altKey === hotkey.alt
  );
}

interface HotkeySettingsProps {
  onClose: () => void;
}

export const HotkeySettings: React.FC<HotkeySettingsProps> = ({ onClose }) => {
  const [hotkeys, setHotkeys] = useState<HotkeyMapping[]>(loadHotkeys);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<Partial<HotkeyMapping> | null>(null);

  const handleKeyCapture = useCallback((e: KeyboardEvent) => {
    if (!editingId) return;

    // Ignore modifier-only presses
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    setPendingKey({
      key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
    });
  }, [editingId]);

  useEffect(() => {
    if (editingId) {
      window.addEventListener("keydown", handleKeyCapture);
      return () => window.removeEventListener("keydown", handleKeyCapture);
    }
  }, [editingId, handleKeyCapture]);

  const startEditing = (id: string) => {
    setEditingId(id);
    setPendingKey(null);
  };

  const confirmEdit = () => {
    if (!editingId || !pendingKey) return;

    const updated = hotkeys.map(h =>
      h.id === editingId
        ? { ...h, ...pendingKey }
        : h
    );
    setHotkeys(updated);
    saveHotkeys(updated);
    setEditingId(null);
    setPendingKey(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPendingKey(null);
  };

  const resetToDefaults = () => {
    setHotkeys(DEFAULT_HOTKEYS);
    saveHotkeys(DEFAULT_HOTKEYS);
  };

  const resetSingle = (id: string) => {
    const defaultHotkey = DEFAULT_HOTKEYS.find(h => h.id === id);
    if (!defaultHotkey) return;

    const updated = hotkeys.map(h => h.id === id ? defaultHotkey : h);
    setHotkeys(updated);
    saveHotkeys(updated);
  };

  const buttonStyle: React.CSSProperties = {
    padding: "4px 10px",
    fontSize: "0.75rem",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 4,
    color: "#e5e7eb",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: 8,
          padding: 20,
          width: 500,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#e5e7eb", fontSize: "1.1rem" }}>Keyboard Shortcuts</h3>
          <button onClick={onClose} style={{ ...buttonStyle, background: "#7f1d1d", border: "1px solid #991b1b" }}>
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: 0 }}>
            Click on a shortcut to customize it. Press the new key combination when editing.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {hotkeys.map((hotkey) => (
            <div
              key={hotkey.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: editingId === hotkey.id ? "#374151" : "#111827",
                border: `1px solid ${editingId === hotkey.id ? "#6366f1" : "#374151"}`,
                borderRadius: 6,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e5e7eb", fontSize: "0.85rem", fontWeight: 500 }}>
                  {hotkey.label}
                </div>
                <div style={{ color: "#6b7280", fontSize: "0.7rem" }}>
                  {hotkey.description}
                </div>
              </div>

              {editingId === hotkey.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      padding: "4px 12px",
                      background: "#4f46e5",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      minWidth: 100,
                      textAlign: "center",
                    }}
                  >
                    {pendingKey
                      ? getHotkeyDisplay({ ...hotkey, ...pendingKey } as HotkeyMapping)
                      : "Press keys..."}
                  </div>
                  <button
                    onClick={confirmEdit}
                    disabled={!pendingKey}
                    style={{
                      ...buttonStyle,
                      background: pendingKey ? "#059669" : "#374151",
                      border: `1px solid ${pendingKey ? "#10b981" : "#4b5563"}`,
                      opacity: pendingKey ? 1 : 0.5,
                    }}
                  >
                    ✓
                  </button>
                  <button onClick={cancelEdit} style={buttonStyle}>
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => startEditing(hotkey.id)}
                    style={{
                      padding: "4px 12px",
                      background: "#374151",
                      border: "1px solid #4b5563",
                      borderRadius: 4,
                      color: "#e5e7eb",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      cursor: "pointer",
                      minWidth: 100,
                      textAlign: "center",
                    }}
                    title="Click to change"
                  >
                    {getHotkeyDisplay(hotkey)}
                  </button>
                  <button
                    onClick={() => resetSingle(hotkey.id)}
                    style={{ ...buttonStyle, padding: "4px 8px" }}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button
            onClick={resetToDefaults}
            style={{
              ...buttonStyle,
              background: "#7f1d1d",
              border: "1px solid #991b1b",
              color: "#fca5a5",
            }}
          >
            Reset All to Defaults
          </button>
          <button
            onClick={onClose}
            style={{
              ...buttonStyle,
              background: "#059669",
              border: "1px solid #10b981",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotkeySettings;
