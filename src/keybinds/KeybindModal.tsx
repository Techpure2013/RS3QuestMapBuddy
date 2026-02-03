// src/keybinds/KeybindModal.tsx
// Modal component showing keybinds by category

import React, { useState, useEffect, useMemo } from "react";
import type { KeybindCategory, ResolvedKeybind } from "./types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "./types";
import { keybindStore } from "./keybindStore";
import { KeybindRow } from "./KeybindRow";

export const KeybindModal: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(keybindStore.modalOpen);
  const [editingKeybind, setEditingKeybind] = useState(keybindStore.editingKeybind);
  const [filter, setFilter] = useState<KeybindCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [, forceUpdate] = useState(0);

  // Subscribe to store changes
  useEffect(() => {
    return keybindStore.subscribe(() => {
      setModalOpen(keybindStore.modalOpen);
      setEditingKeybind(keybindStore.editingKeybind);
      forceUpdate((n) => n + 1);
    });
  }, []);

  // Get keybinds filtered by category and search
  const keybinds = useMemo(() => {
    let list = keybindStore.getResolvedKeybinds();

    if (filter !== "all") {
      list = list.filter((kb) => kb.category === filter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (kb) =>
          kb.label.toLowerCase().includes(term) ||
          kb.id.toLowerCase().includes(term) ||
          (kb.description?.toLowerCase().includes(term) ?? false)
      );
    }

    return list;
  }, [filter, search, modalOpen]); // modalOpen dependency to refresh on reopen

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<KeybindCategory, ResolvedKeybind[]> = {
      collision: [],
      transport: [],
      path: [],
      radius: [],
      ui: [],
      navigation: [],
      editor: [],
      general: [],
    };
    keybinds.forEach((kb) => groups[kb.category].push(kb));
    return groups;
  }, [keybinds]);

  const handleClose = () => {
    keybindStore.setModalOpen(false);
    setSearch("");
    setFilter("all");
  };

  const handleResetAll = () => {
    if (confirm("Reset all keybinds to their default values?")) {
      keybindStore.resetAll();
    }
  };

  if (!modalOpen) return null;

  return (
    <div
      className="qp-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="qp-modal"
        style={{
          background: "#111827",
          borderRadius: 8,
          width: 640,
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header */}
        <div
          className="qp-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #374151",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#f3f4f6" }}>
              Keyboard Shortcuts
            </h3>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              Press{" "}
              <kbd
                style={{
                  padding: "2px 5px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 10,
                  background: "linear-gradient(180deg, #374151, #1f2937)",
                  border: "1px solid #4b5563",
                  borderRadius: 3,
                  color: "#e5e7eb",
                }}
              >
                Shift + ?
              </kbd>
              {" "}to open/close
            </span>
          </div>
          <button
            className="qp-close"
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: 24,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="qp-body" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Filter/Search */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid #1f2937" }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as KeybindCategory | "all")}
              style={{
                padding: "6px 10px",
                fontSize: 12,
                background: "#1e293b",
                border: "1px solid #374151",
                borderRadius: 4,
                color: "#e5e7eb",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                paddingRight: 28,
              }}
            >
              <option value="all">All Categories</option>
              {CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search keybinds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: 12,
                background: "#1e293b",
                border: "1px solid #374151",
                borderRadius: 4,
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </div>

          {/* Keybind List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
            {filter === "all" ? (
              // Show grouped by category
              CATEGORY_ORDER.map((category) => {
                const items = grouped[category];
                if (items.length === 0) return null;

                return (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#6b7280",
                        marginBottom: 8,
                        paddingBottom: 4,
                        borderBottom: "1px solid #374151",
                      }}
                    >
                      {CATEGORY_LABELS[category]}
                    </div>
                    {items.map((kb) => (
                      <KeybindRow
                        key={kb.id}
                        keybind={kb}
                        isEditing={editingKeybind === kb.id}
                      />
                    ))}
                  </div>
                );
              })
            ) : (
              // Show flat list for filtered category
              keybinds.map((kb) => (
                <KeybindRow
                  key={kb.id}
                  keybind={kb}
                  isEditing={editingKeybind === kb.id}
                />
              ))
            )}

            {keybinds.length === 0 && (
              <div style={{ textAlign: "center", color: "#6b7280", padding: 24 }}>
                No keybinds found
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="qp-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid #374151",
          }}
        >
          <button
            onClick={handleResetAll}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#7f1d1d",
              color: "#fecaca",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Reset All to Defaults
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", alignSelf: "center" }}>
              Press ? or Ctrl+/ to toggle this menu
            </span>
            <button
              onClick={handleClose}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
