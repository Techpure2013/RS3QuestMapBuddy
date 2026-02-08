import React from "react";
import {
  useHighlightSettings,
  HighlightSettingsStore,
} from "../../state/highlightSettingsStore";
import type { HighlightSettingsState } from "../../state/highlightSettingsStore";

interface WordListCategoryProps {
  listKey: keyof HighlightSettingsState;
  label: string;
  description: string;
  words: string[];
  isOpen: boolean;
  onToggle: () => void;
  addInput: string;
  onAddInputChange: (value: string) => void;
}

const WordListCategory: React.FC<WordListCategoryProps> = ({
  listKey,
  label,
  description,
  words,
  isOpen,
  onToggle,
  addInput,
  onAddInputChange,
}) => {
  const handleAdd = () => {
    const trimmed = addInput.trim();
    if (trimmed) {
      HighlightSettingsStore.addWord(listKey, trimmed);
      onAddInputChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const handleReset = () => {
    if (window.confirm(`Reset ${label} to defaults?`)) {
      HighlightSettingsStore.resetList(listKey);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#9ca3af",
            width: 12,
            textAlign: "center",
          }}
        >
          {isOpen ? "▼" : "▶"}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: "#e5e7eb",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#9ca3af",
            background: "#374151",
            borderRadius: 10,
            padding: "2px 6px",
          }}
        >
          {words.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#fecaca",
            background: "#7f1d1d",
            border: "1px solid #991b1b",
            borderRadius: 4,
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {/* Content */}
      {isOpen && (
        <div
          style={{
            marginTop: 4,
            padding: 8,
            background: "rgba(31, 41, 55, 0.3)",
            border: "1px solid #374151",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
          }}
        >
          {/* Description */}
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>

          {/* Word Pills Area */}
          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              marginBottom: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: 4,
              background: "rgba(13, 17, 23, 0.3)",
              borderRadius: 4,
              border: "1px solid #374151",
            }}
          >
            {words.length === 0 ? (
              <span
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  fontStyle: "italic",
                }}
              >
                No words
              </span>
            ) : (
              words.map((word) => (
                <span
                  key={word}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#374151",
                    color: "#e5e7eb",
                    borderRadius: 12,
                    padding: "2px 8px",
                    fontSize: 11,
                    lineHeight: "18px",
                  }}
                >
                  {word}
                  <span
                    onClick={() =>
                      HighlightSettingsStore.removeWord(listKey, word)
                    }
                    style={{
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#ef4444")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#9ca3af")
                    }
                  >
                    ×
                  </span>
                </span>
              ))
            )}
          </div>

          {/* Add Input Row */}
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="text"
              value={addInput}
              onChange={(e) => onAddInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add word..."
              style={{
                flex: 1,
                fontSize: 11,
                padding: "4px 6px",
                background: "#0d1117",
                border: "1px solid #374151",
                borderRadius: 4,
                color: "#e5e7eb",
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                background: "#2563eb",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                minWidth: 28,
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HighlightSettingsPanel: React.FC = () => {
  const settings = useHighlightSettings();
  const [openCategories, setOpenCategories] = React.useState<Set<string>>(
    new Set()
  );
  const [addInputs, setAddInputs] = React.useState<Record<string, string>>({});

  const categories: Array<{
    key: keyof HighlightSettingsState;
    label: string;
    description: string;
  }> = [
    {
      key: "actionVerbs",
      label: "Action Verbs",
      description: "Highlighted in cyan by Action button",
    },
    {
      key: "killVerbs",
      label: "Kill Verbs",
      description: "Highlighted in red by Kill button",
    },
    {
      key: "rs3LocationNames",
      label: "Location Exclusions",
      description: "Excluded from NPC auto-highlight",
    },
    {
      key: "commonWordExclusions",
      label: "Object Word Exclusions",
      description: "Excluded from Object auto-highlight",
    },
    {
      key: "commonWords",
      label: "Common Words Filter",
      description: "Filtered during NPC name extraction",
    },
    {
      key: "gameTerms",
      label: "Game Terms Filter",
      description: "Filtered during NPC name extraction",
    },
  ];

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddInputChange = (key: string, value: string) => {
    setAddInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ padding: "4px 0" }}>
      {categories.map((cat) => (
        <WordListCategory
          key={cat.key}
          listKey={cat.key}
          label={cat.label}
          description={cat.description}
          words={settings[cat.key]}
          isOpen={openCategories.has(cat.key)}
          onToggle={() => toggleCategory(cat.key)}
          addInput={addInputs[cat.key] || ""}
          onAddInputChange={(value) => handleAddInputChange(cat.key, value)}
        />
      ))}
    </div>
  );
};

export default HighlightSettingsPanel;
