import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  QUICK_INSERT_THUMBNAILS,
  THUMBNAIL_CATEGORIES,
  type QuickInsertThumbnail,
} from "../../data/quickInsertThumbnails";
import {
  loadCustomThumbnails,
  addCustomThumbnail,
  deleteCustomThumbnail,
  exportCustomThumbnails,
  importCustomThumbnails,
  type CustomThumbnail,
} from "../../data/customThumbnails";

export interface QuickInsertPickerProps {
  onSelect: (markup: string) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

type CategoryType = QuickInsertThumbnail["category"] | "custom";

const ALL_CATEGORIES: Record<CategoryType, { label: string; icon: string }> = {
  ...THUMBNAIL_CATEGORIES,
  custom: {
    label: "Custom",
    icon: "⭐",
  },
};

export const QuickInsertPicker: React.FC<QuickInsertPickerProps> = ({
  onSelect,
  onClose,
  anchorRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("lodestone");
  const [search, setSearch] = useState("");
  const [customThumbnails, setCustomThumbnails] = useState<CustomThumbnail[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newThumbnail, setNewThumbnail] = useState({
    name: "",
    imageUrl: "",
    defaultSize: 24,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate position from anchor button
  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setAnchorPos({ top: rect.bottom + 4, left: rect.left });
  }, [anchorRef]);

  // Load custom thumbnails on mount
  useEffect(() => {
    setCustomThumbnails(loadCustomThumbnails());
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddForm) {
          setShowAddForm(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showAddForm]);

  // Get all thumbnails (predefined + custom)
  const allThumbnails: (QuickInsertThumbnail | CustomThumbnail)[] = [
    ...QUICK_INSERT_THUMBNAILS,
    ...customThumbnails,
  ];

  // Filter thumbnails by category and search
  const filteredThumbnails = allThumbnails.filter((t) => {
    const isCustom = "isCustom" in t && t.isCustom;
    const matchesCategory =
      activeCategory === "custom"
        ? isCustom
        : !isCustom && t.category === activeCategory;
    const matchesSearch =
      search.trim() === "" ||
      t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get categories that have items (include custom always)
  const availableCategories = [
    ...Object.keys(THUMBNAIL_CATEGORIES).filter((cat) =>
      QUICK_INSERT_THUMBNAILS.some((t) => t.category === cat)
    ),
    "custom",
  ] as CategoryType[];

  const handleSelect = (thumbnail: QuickInsertThumbnail | CustomThumbnail) => {
    const markup = `![${thumbnail.name}|${thumbnail.defaultSize}](${thumbnail.imageUrl})`;
    onSelect(markup);
  };

  const handleAddCustom = () => {
    if (!newThumbnail.name.trim() || !newThumbnail.imageUrl.trim()) return;

    const added = addCustomThumbnail({
      name: newThumbnail.name.trim(),
      imageUrl: newThumbnail.imageUrl.trim(),
      defaultSize: newThumbnail.defaultSize,
      category: "misc",
      wikiUrl: newThumbnail.imageUrl.trim(),
    });

    setCustomThumbnails((prev) => [...prev, added]);
    setNewThumbnail({ name: "", imageUrl: "", defaultSize: 24 });
    setShowAddForm(false);
    setActiveCategory("custom");
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this custom icon?")) return;
    deleteCustomThumbnail(id);
    setCustomThumbnails((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExport = () => {
    const json = exportCustomThumbnails();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rs3quest-custom-icons.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const count = importCustomThumbnails(content, 'merge');
        setCustomThumbnails(loadCustomThumbnails());
        alert(`Successfully imported ${count} icon(s)!`);
      } catch (err) {
        alert('Failed to import: Invalid file format');
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    e.target.value = '';
  };

  const pickerContent = (
    <div
      ref={containerRef}
      style={{
        position: anchorPos ? "fixed" : "absolute",
        top: anchorPos ? anchorPos.top : "100%",
        left: anchorPos ? anchorPos.left : 0,
        marginTop: anchorPos ? 0 : 4,
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: 8,
        zIndex: 10000,
        width: 360,
        maxHeight: 450,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "#e5e7eb", fontWeight: 600, fontSize: "0.85rem" }}>
            Quick Insert
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {activeCategory === "custom" && customThumbnails.length > 0 && (
              <button
                type="button"
                onClick={handleExport}
                style={{
                  background: "#1e3a5f",
                  border: "1px solid #3b82f6",
                  borderRadius: 4,
                  color: "#93c5fd",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                }}
                title="Export custom icons to share"
              >
                ↓ Export
              </button>
            )}
            {activeCategory === "custom" && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#1e3a5f",
                    border: "1px solid #3b82f6",
                    borderRadius: 4,
                    color: "#93c5fd",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                  }}
                  title="Import custom icons from file"
                >
                  ↑ Import
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: "none" }}
                />
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setActiveCategory("custom");
              }}
              style={{
                background: showAddForm ? "#065f46" : "#14532d",
                border: "1px solid #22c55e",
                borderRadius: 4,
                color: showAddForm ? "#6ee7b7" : "#86efac",
                cursor: "pointer",
                fontSize: "0.75rem",
                padding: "2px 8px",
              }}
              title="Add custom icon"
            >
              + Add
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: "1rem",
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search */}
        {!showAddForm && (
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "#374151",
              border: "1px solid #4b5563",
              borderRadius: 4,
              color: "#e5e7eb",
              fontSize: "0.8rem",
              boxSizing: "border-box",
            }}
          />
        )}
      </div>

      {/* Add Custom Form */}
      {showAddForm && (
        <div
          style={{
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: 10,
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 8 }}>
            Add Custom Icon
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              placeholder="Name (e.g., 'My Icon')"
              value={newThumbnail.name}
              onChange={(e) =>
                setNewThumbnail({ ...newThumbnail, name: e.target.value })
              }
              style={{
                padding: "6px 8px",
                background: "#374151",
                border: "1px solid #4b5563",
                borderRadius: 4,
                color: "#e5e7eb",
                fontSize: "0.8rem",
              }}
            />
            <input
              type="text"
              placeholder="Image URL (https://...)"
              value={newThumbnail.imageUrl}
              onChange={(e) =>
                setNewThumbnail({ ...newThumbnail, imageUrl: e.target.value })
              }
              style={{
                padding: "6px 8px",
                background: "#374151",
                border: "1px solid #4b5563",
                borderRadius: 4,
                color: "#e5e7eb",
                fontSize: "0.8rem",
              }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                Size:
              </label>
              <input
                type="number"
                min={12}
                max={128}
                value={newThumbnail.defaultSize}
                onChange={(e) =>
                  setNewThumbnail({
                    ...newThumbnail,
                    defaultSize: parseInt(e.target.value, 10) || 24,
                  })
                }
                style={{
                  width: 60,
                  padding: "4px 6px",
                  background: "#374151",
                  border: "1px solid #4b5563",
                  borderRadius: 4,
                  color: "#e5e7eb",
                  fontSize: "0.8rem",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>px</span>
            </div>
            {/* Preview */}
            {newThumbnail.imageUrl && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 6,
                  background: "#374151",
                  borderRadius: 4,
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                  Preview:
                </span>
                <img
                  src={newThumbnail.imageUrl}
                  alt="preview"
                  style={{
                    width: newThumbnail.defaultSize,
                    height: newThumbnail.defaultSize,
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!newThumbnail.name.trim() || !newThumbnail.imageUrl.trim()}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  background:
                    newThumbnail.name.trim() && newThumbnail.imageUrl.trim()
                      ? "#065f46"
                      : "#374151",
                  border: "1px solid #047857",
                  borderRadius: 4,
                  color:
                    newThumbnail.name.trim() && newThumbnail.imageUrl.trim()
                      ? "#6ee7b7"
                      : "#6b7280",
                  cursor:
                    newThumbnail.name.trim() && newThumbnail.imageUrl.trim()
                      ? "pointer"
                      : "not-allowed",
                  fontSize: "0.8rem",
                }}
              >
                Add Icon
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "6px 12px",
                  background: "#374151",
                  border: "1px solid #4b5563",
                  borderRadius: 4,
                  color: "#9ca3af",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        {availableCategories.map((cat) => {
          const catInfo = ALL_CATEGORIES[cat];
          const isActive = activeCategory === cat;
          const customCount = cat === "custom" ? customThumbnails.length : 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "4px 8px",
                fontSize: "0.7rem",
                background: isActive ? "#3b82f6" : "#374151",
                border: isActive ? "1px solid #60a5fa" : "1px solid #4b5563",
                borderRadius: 4,
                color: isActive ? "#fff" : "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {catInfo.icon.startsWith("http") ? (
                <img
                  src={catInfo.icon}
                  alt=""
                  style={{ width: 14, height: 14, objectFit: "contain" }}
                />
              ) : (
                <span>{catInfo.icon}</span>
              )}
              <span>{catInfo.label}</span>
              {cat === "custom" && customCount > 0 && (
                <span
                  style={{
                    background: isActive ? "#1e40af" : "#4b5563",
                    padding: "1px 5px",
                    borderRadius: 10,
                    fontSize: "0.65rem",
                  }}
                >
                  {customCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Thumbnail Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
          overflowY: "auto",
          flex: 1,
          padding: 4,
        }}
      >
        {filteredThumbnails.map((thumbnail) => {
          const isCustom = "isCustom" in thumbnail && thumbnail.isCustom;
          return (
            <div key={thumbnail.id} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => handleSelect(thumbnail)}
                title={thumbnail.name}
                style={{
                  width: 48,
                  height: 48,
                  padding: 4,
                  background: "#374151",
                  border: isCustom ? "1px solid #f59e0b" : "1px solid #4b5563",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#4b5563";
                  e.currentTarget.style.borderColor = isCustom ? "#fbbf24" : "#6b7280";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#374151";
                  e.currentTarget.style.borderColor = isCustom ? "#f59e0b" : "#4b5563";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <img
                  src={thumbnail.imageUrl}
                  alt={thumbnail.name}
                  style={{
                    maxWidth: 36,
                    maxHeight: 36,
                    objectFit: "contain",
                  }}
                  loading="lazy"
                />
              </button>
              {/* Delete button for custom thumbnails */}
              {isCustom && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustom(thumbnail.id, e)}
                  title="Delete custom icon"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    padding: 0,
                    background: "#7f1d1d",
                    border: "1px solid #991b1b",
                    borderRadius: "50%",
                    color: "#fca5a5",
                    cursor: "pointer",
                    fontSize: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredThumbnails.length === 0 && !showAddForm && (
        <div
          style={{
            textAlign: "center",
            color: "#6b7280",
            padding: 16,
            fontSize: "0.8rem",
          }}
        >
          {activeCategory === "custom"
            ? "No custom icons yet. Click '+ Add' to create one!"
            : "No thumbnails found"}
        </div>
      )}

      {/* Footer hint */}
      <div
        style={{
          marginTop: 8,
          fontSize: "0.65rem",
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        Click to insert • Hover for name
        {activeCategory === "custom" && customThumbnails.length > 0 && (
          <> • Custom icons have gold border</>
        )}
      </div>
    </div>
  );

  return anchorPos
    ? ReactDOM.createPortal(pickerContent, document.body)
    : pickerContent;
};

export default QuickInsertPicker;
