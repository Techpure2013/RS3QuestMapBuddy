import React, { useState } from "react";
import { stripFormatting } from "../../utils/RichText";
import { ColorPicker } from "./ColorPicker";
import { ImagePicker } from "./ImagePicker";
import { StepLinkPicker } from "./StepLinkPicker";

const FORMAT_BUTTONS = [
  { label: "B", title: "Bold (**text**)", prefix: "**", suffix: "**", style: { fontWeight: 700 } },
  { label: "I", title: "Italic (*text*)", prefix: "*", suffix: "*", style: { fontStyle: "italic" } },
  { label: "U", title: "Underline (__text__)", prefix: "__", suffix: "__", style: { textDecoration: "underline" } },
  { label: "S", title: "Strikethrough (~~text~~)", prefix: "~~", suffix: "~~", style: { textDecoration: "line-through" } },
  { label: "x\u00B2", title: "Superscript (^text or ^(text))", prefix: "^(", suffix: ")", style: { fontSize: "0.7em" } },
  { label: "\uD83D\uDD17", title: "Link ([text](url))", prefix: "[", suffix: "]()", style: {} },
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

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newText =
      value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      value.substring(end);

    onChange(newText);

    // Restore cursor position after the wrapped text
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleClearFormatting = () => {
    const stripped = stripFormatting(value);
    if (stripped !== value) {
      onChange(stripped);
    }
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
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={toggleStyle}
        title={isCollapsed ? "Show formatting toolbar" : "Hide formatting toolbar"}
      >
        <span style={{ fontSize: "0.7rem" }}>{isCollapsed ? "▶" : "▼"}</span>
        Format
      </button>
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
              title={btn.title}
              onClick={() => wrapSelection(btn.prefix, btn.suffix)}
              style={{ ...buttonStyle, ...btn.style }}
            >
              {btn.label}
            </button>
          ))}
          {/* Clear formatting button */}
          <button
            type="button"
            title="Remove all formatting"
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
              title="Color ([#hex]{text} or [r,g,b]{text})"
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
              title="Insert image (![alt](url) or ![alt|size](url))"
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
          {/* Step link picker button */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              title="Link to another step (step(N){text})"
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
        </div>
      )}
    </div>
  );
};

export default FormattingToolbar;
