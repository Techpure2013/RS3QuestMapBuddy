// src/keybinds/KeybindToast.tsx
// Toast notification component for mode changes showing relevant keybinds

import React, { useState, useEffect, useCallback, useRef } from "react";
import { keybindStore } from "./keybindStore";
import { formatKeyCombo } from "./utils";
import {
  collisionEditorState,
  transportEditorState,
} from "../map/utils/pathfinding";
import { EditorStore } from "../state/editorStore";

type ToastMode = "collision" | "transport" | "path" | null;

interface ToastHint {
  key: string;
  action: string;
}

interface ToastData {
  mode: ToastMode;
  title: string;
  hints: ToastHint[];
}

// Toast configuration for each mode
const MODE_CONFIGS: Record<
  Exclude<ToastMode, null>,
  { title: string; keybindIds: { ids: string[]; label: string }[] }
> = {
  collision: {
    title: "Collision Editor",
    keybindIds: [
      { ids: ["collision.walkable"], label: "Walkable" },
      { ids: ["collision.blocked"], label: "Blocked" },
      { ids: ["collision.rectangle"], label: "Rectangle" },
      { ids: ["collision.line"], label: "Line" },
      {
        ids: [
          "collision.nudgeUp",
          "collision.nudgeDown",
          "collision.nudgeLeft",
          "collision.nudgeRight",
        ],
        label: "Nudge",
      },
      { ids: ["collision.toggle"], label: "Exit" },
    ],
  },
  transport: {
    title: "Transport Editor",
    keybindIds: [
      { ids: ["transport.wheel"], label: "Type picker" },
      { ids: ["transport.bidirectional"], label: "Bidirectional" },
      { ids: ["transport.toggle"], label: "Exit" },
    ],
  },
  path: {
    title: "Path Edit Mode",
    keybindIds: [
      {
        ids: [
          "path.nudgeUp",
          "path.nudgeDown",
          "path.nudgeLeft",
          "path.nudgeRight",
        ],
        label: "Nudge waypoint",
      },
      { ids: ["path.toggleEdit"], label: "Exit" },
    ],
  },
};

function buildToastData(mode: Exclude<ToastMode, null>): ToastData {
  const config = MODE_CONFIGS[mode];
  const hints: ToastHint[] = [];

  for (const entry of config.keybindIds) {
    // Get the first assigned keybind from the list of IDs
    const keys: string[] = [];
    for (const id of entry.ids) {
      const kb = keybindStore.getKeybind(id);
      if (kb?.currentKey) {
        keys.push(formatKeyCombo(kb.currentKey));
      }
    }

    if (keys.length > 0) {
      // Show first key, or combine if multiple (for nudge arrows)
      hints.push({
        key: keys.length <= 2 ? keys.join("/") : keys.slice(0, 2).join("/") + "...",
        action: entry.label,
      });
    }
  }

  // Add static hints for specific modes
  if (mode === "path") {
    hints.unshift(
      { key: "Click", action: "Select waypoint" },
      { key: "Drag", action: "Move waypoint" },
      { key: "Del", action: "Delete waypoint" }
    );
  }

  return {
    mode,
    title: config.title,
    hints,
  };
}

export const KeybindToast: React.FC = () => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStates = useRef({
    collision: false,
    transport: false,
    path: false,
  });

  const showToast = useCallback((mode: Exclude<ToastMode, null>) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const data = buildToastData(mode);

    // Only show if there are hints to display
    if (data.hints.length === 0) return;

    setToast(data);
    setVisible(true);

    // Auto-hide after 3 seconds
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      // Wait for fade-out animation then clear toast
      setTimeout(() => setToast(null), 300);
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  }, []);

  // Subscribe to mode changes
  useEffect(() => {
    // Collision editor state
    const unsubCollision = collisionEditorState.subscribe(() => {
      const enabled = collisionEditorState.enabled;
      if (enabled && !prevStates.current.collision) {
        showToast("collision");
      }
      prevStates.current.collision = enabled;
    });

    // Transport editor state
    const unsubTransport = transportEditorState.subscribe(() => {
      const enabled = transportEditorState.enabled;
      if (enabled && !prevStates.current.transport) {
        showToast("transport");
      }
      prevStates.current.transport = enabled;
    });

    // Path edit mode from EditorStore
    const unsubPath = EditorStore.subscribe(
      (s) => s.ui.pathEditMode ?? false,
      (enabled) => {
        if (enabled && !prevStates.current.path) {
          showToast("path");
        }
        prevStates.current.path = enabled;
      }
    );

    return () => {
      unsubCollision();
      unsubTransport();
      unsubPath();
    };
  }, [showToast]);

  // Listen for Escape to dismiss
  useEffect(() => {
    if (!toast) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hideToast();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div
      className="keybind-toast"
      onClick={hideToast}
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s, transform 0.2s",
        background: "rgba(17, 24, 39, 0.95)",
        border: "1px solid #374151",
        borderRadius: 8,
        padding: "12px 16px",
        minWidth: 200,
        maxWidth: 400,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
        cursor: "pointer",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: "1px solid #374151",
        }}
      >
        <span style={{ fontSize: 14 }}>
          {toast.mode === "collision" && "🎨"}
          {toast.mode === "transport" && "🚂"}
          {toast.mode === "path" && "📍"}
        </span>
        <span style={{ color: "#e5e7eb", fontWeight: 600, fontSize: 13 }}>
          {toast.title}
        </span>
      </div>

      {/* Hints */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
        {toast.hints.map((hint, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
            }}
          >
            <kbd
              style={{
                display: "inline-block",
                padding: "2px 5px",
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                background: "linear-gradient(180deg, #374151, #1f2937)",
                border: "1px solid #4b5563",
                borderRadius: 3,
                boxShadow: "0 1px 0 #111827",
                color: "#e5e7eb",
                whiteSpace: "nowrap",
              }}
            >
              {hint.key}
            </kbd>
            <span style={{ color: "#9ca3af" }}>{hint.action}</span>
          </div>
        ))}
      </div>

      {/* Dismiss hint */}
      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        Click or Esc to dismiss
      </div>
    </div>
  );
};
