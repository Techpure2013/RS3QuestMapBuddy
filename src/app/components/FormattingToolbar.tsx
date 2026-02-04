import React, { useState, useCallback, useEffect } from "react";
import { stripFormatting } from "../../utils/RichText";
import { ColorPicker } from "./ColorPicker";
import { ImagePicker } from "./ImagePicker";
import { StepLinkPicker } from "./StepLinkPicker";
import { TableCreator } from "./TableCreator";
import { QuickInsertPicker } from "./QuickInsertPicker";
import { keybindStore } from "../../keybinds/keybindStore";
import { useEditorHotkeys, getHotkeyForAction } from "../hooks/useEditorHotkeys";

const FORMAT_BUTTONS = [
  { id: "bold", label: "B", title: "Bold (**text**)", prefix: "**", suffix: "**", style: { fontWeight: 700 }, cursorOffset: 0 },
  { id: "italic", label: "I", title: "Italic (*text*)", prefix: "*", suffix: "*", style: { fontStyle: "italic" }, cursorOffset: 0 },
  { id: "underline", label: "U", title: "Underline (__text__)", prefix: "__", suffix: "__", style: { textDecoration: "underline" }, cursorOffset: 0 },
  { id: "superscript", label: "x\u00B2", title: "Superscript (^text or ^(text))", prefix: "^(", suffix: ")", style: { fontSize: "0.7em" }, cursorOffset: 0 },
  { id: "link", label: "\uD83D\uDD17", title: "Link ([text](url))", prefix: "[", suffix: "]()", style: {}, cursorOffset: 1 },
] as const;

export interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  /** Start collapsed (default: false) */
  defaultCollapsed?: boolean;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  textareaRef,
  value,
  onChange,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showStepLinkPicker, setShowStepLinkPicker] = useState(false);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [showQuickInsert, setShowQuickInsert] = useState(false);

  // Subscribe to keybind changes to update tooltips
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return keybindStore.subscribe(() => forceUpdate((n) => n + 1));
  }, []);

  const wrapSelection = useCallback((prefix: string, suffix: string, cursorOffset: number = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value; // Use textarea value directly for freshness
    const selectedText = currentValue.substring(start, end);

    const newText =
      currentValue.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentValue.substring(end);

    onChange(newText);

    // Restore cursor position after the wrapped text (minus cursorOffset)
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length - cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [textareaRef, onChange]);

  const handleClearFormatting = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const currentValue = textarea.value;
    const stripped = stripFormatting(currentValue);
    if (stripped !== currentValue) {
      onChange(stripped);
    }
  }, [textareaRef, onChange]);

  // Hotkey actions
  const hotkeyActions = {
    onBold: useCallback(() => wrapSelection("**", "**", 0), [wrapSelection]),
    onItalic: useCallback(() => wrapSelection("*", "*", 0), [wrapSelection]),
    onUnderline: useCallback(() => wrapSelection("__", "__", 0), [wrapSelection]),
    onSuperscript: useCallback(() => wrapSelection("^(", ")", 0), [wrapSelection]),
    onLink: useCallback(() => wrapSelection("[", "]()", 1), [wrapSelection]),
    onColor: useCallback(() => setShowColorPicker(true), []),
    onImage: useCallback(() => setShowImagePicker(true), []),
    onStepLink: useCallback(() => setShowStepLinkPicker(true), []),
    onTable: useCallback(() => setShowTableCreator(true), []),
    onClear: handleClearFormatting,
  };

  // Register hotkeys (scoped to textarea)
  useEditorHotkeys(hotkeyActions, true, textareaRef as React.RefObject<HTMLElement>);

  // Helper to build tooltip with hotkey
  const getTooltip = (baseTitle: string, actionId: string) => {
    const hotkey = getHotkeyForAction(actionId);
    return hotkey ? `${baseTitle} (${hotkey})` : baseTitle;
  };

  const buttonStyle: React.CSSProperties = {
    padding: "3px 8px",
    fontSize: "0.75rem",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 3,
    color: "#e5e7eb",
    cursor: "pointer",
    minWidth: 28,
  };

  const toggleStyle: React.CSSProperties = {
    padding: "2px 6px",
    fontSize: "0.65rem",
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 3,
    color: "#9ca3af",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={toggleStyle}
          title={isCollapsed ? "Show formatting toolbar" : "Hide formatting toolbar"}
        >
          <span style={{ fontSize: "0.7rem" }}>{isCollapsed ? "▶" : "▼"}</span>
          Format
        </button>
      </div>
      {!isCollapsed && (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 4,
            flexWrap: "wrap",
          }}
        >
          {FORMAT_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              title={getTooltip(btn.title, btn.id)}
              onClick={() => wrapSelection(btn.prefix, btn.suffix, btn.cursorOffset)}
              style={{ ...buttonStyle, ...btn.style }}
            >
              {btn.label}
            </button>
          ))}
          {/* Clear formatting button */}
          <button
            type="button"
            title={getTooltip("Remove all formatting", "clear")}
            onClick={handleClearFormatting}
            style={{
              ...buttonStyle,
              background: "#7f1d1d",
              border: "1px solid #991b1b",
              color: "#fca5a5",
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
                ...buttonStyle,
                background: "linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7)",
                border: showColorPicker ? "2px solid #fff" : "1px solid #4b5563",
                color: "#fff",
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
                ...buttonStyle,
                background: "#065f46",
                border: showImagePicker ? "2px solid #fff" : "1px solid #047857",
                color: "#6ee7b7",
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
                  const newText = value.substring(0, end) + markup + value.substring(end);
                  onChange(newText);

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
                ...buttonStyle,
                background: "#7c2d12",
                border: showQuickInsert ? "2px solid #fff" : "1px solid #c2410c",
                color: "#fdba74",
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
                  const newText = value.substring(0, end) + markup + value.substring(end);
                  onChange(newText);

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
                ...buttonStyle,
                background: "#0f766e",
                border: showStepLinkPicker ? "2px solid #fff" : "1px solid #14b8a6",
                color: "#5eead4",
              }}
            >
              ⤴ Step
            </button>
            {showStepLinkPicker && (
              <StepLinkPicker
                selectedText={(() => {
                  const textarea = textareaRef.current;
                  if (!textarea) return "";
                  return value.substring(textarea.selectionStart, textarea.selectionEnd);
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
              ...buttonStyle,
              background: "#7c3aed",
              border: "1px solid #8b5cf6",
              color: "#ddd6fe",
            }}
          >
            ⊞ Table
          </button>
          {/* Hotkey settings button */}
          <button
            type="button"
            title="Customize keyboard shortcuts"
            onClick={() => keybindStore.setModalOpen(true)}
            style={{
              ...buttonStyle,
              background: "#1e40af",
              border: "1px solid #3b82f6",
              color: "#93c5fd",
            }}
          >
            ⌨
          </button>
        </div>
      )}
      {/* Table Creator Modal */}
      {showTableCreator && (
        <TableCreator
          onInsert={(markup) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const end = textarea.selectionEnd;
            const newText = value.substring(0, end) + markup + value.substring(end);
            onChange(newText);

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
    </div>
  );
};

export default FormattingToolbar;
