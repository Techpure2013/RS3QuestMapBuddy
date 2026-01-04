// src/keybinds/TransportWheel.tsx
// Radial transport type picker - hold key to show, release to select

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  transportEditorState,
  type TransportType,
} from "../map/utils/pathfinding";
import { keybindStore } from "./keybindStore";
import { keyEventMatches } from "./utils";

interface WheelItem {
  type: TransportType;
  label: string;
  icon: string;
}

// Transport types organized for the wheel
const WHEEL_ITEMS: WheelItem[] = [
  { type: "stairs", label: "Stairs", icon: "🪜" },
  { type: "ladder", label: "Ladder", icon: "🔺" },
  { type: "trapdoor", label: "Trapdoor", icon: "🕳️" },
  { type: "rope", label: "Rope", icon: "🪢" },
  { type: "teleport", label: "Teleport", icon: "✨" },
  { type: "fairy_ring", label: "Fairy Ring", icon: "🧚" },
  { type: "spirit_tree", label: "Spirit Tree", icon: "🌳" },
  { type: "lodestone", label: "Lodestone", icon: "💠" },
  { type: "portal", label: "Portal", icon: "🌀" },
  { type: "agility", label: "Shortcut", icon: "🏃" },
  { type: "door", label: "Door", icon: "🚪" },
  { type: "gate", label: "Gate", icon: "🚧" },
];

const WHEEL_RADIUS = 120;
const ITEM_SIZE = 56;

export const TransportWheel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<TransportType>(
    transportEditorState.transportType
  );
  const mousePos = useRef({ x: 0, y: 0 });
  const isKeyDown = useRef(false);

  // Get the wheel keybind
  const getWheelKeybind = useCallback(() => {
    return keybindStore.getKeybind("transport.wheel");
  }, []);

  // Calculate which segment the mouse is hovering over
  const calculateHoveredIndex = useCallback(
    (mouseX: number, mouseY: number, cx: number, cy: number): number | null => {
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Must be outside dead zone (center) but within wheel radius + margin
      if (distance < 30 || distance > WHEEL_RADIUS + 50) {
        return null;
      }

      // Calculate angle (0 is right, going clockwise)
      let angle = Math.atan2(dy, dx);
      // Convert to degrees and adjust so 0 is at top
      angle = ((angle * 180) / Math.PI + 90 + 360) % 360;

      // Calculate segment
      const segmentAngle = 360 / WHEEL_ITEMS.length;
      const index = Math.floor(angle / segmentAngle);
      return index % WHEEL_ITEMS.length;
    },
    []
  );

  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (visible) {
        const idx = calculateHoveredIndex(
          e.clientX,
          e.clientY,
          centerPos.x,
          centerPos.y
        );
        setHoveredIndex(idx);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [visible, centerPos, calculateHoveredIndex]);

  // Handle key down/up for wheel activation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if already showing or if not in transport editor mode
      if (isKeyDown.current || !transportEditorState.enabled) return;

      const wheelKeybind = getWheelKeybind();
      if (!wheelKeybind?.currentKey) return;

      if (keyEventMatches(e, wheelKeybind.currentKey)) {
        e.preventDefault();
        e.stopPropagation();
        isKeyDown.current = true;
        setCenterPos(mousePos.current);
        setSelectedType(transportEditorState.transportType);
        setHoveredIndex(null);
        setVisible(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isKeyDown.current) return;

      const wheelKeybind = getWheelKeybind();
      if (!wheelKeybind?.currentKey) return;

      // Check if the released key matches (just the base key, ignore modifiers for keyup)
      if (e.key.toLowerCase() === wheelKeybind.currentKey.key.toLowerCase()) {
        e.preventDefault();
        e.stopPropagation();
        isKeyDown.current = false;

        // Apply selection if hovering over an item
        if (hoveredIndex !== null) {
          const item = WHEEL_ITEMS[hoveredIndex];
          transportEditorState.setTransportType(item.type);
        }

        setVisible(false);
        setHoveredIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [getWheelKeybind, hoveredIndex]);

  // Subscribe to transport editor state for current type
  useEffect(() => {
    return transportEditorState.subscribe(() => {
      setSelectedType(transportEditorState.transportType);
    });
  }, []);

  if (!visible) return null;

  const angleStep = 360 / WHEEL_ITEMS.length;

  return (
    <div
      className="transport-wheel-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        pointerEvents: "none",
      }}
    >
      {/* Center indicator */}
      <div
        className="transport-wheel"
        style={{
          position: "absolute",
          left: centerPos.x,
          top: centerPos.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Center circle with current selection */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "rgba(17, 24, 39, 0.95)",
            border: "2px solid #374151",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 24 }}>
            {hoveredIndex !== null
              ? WHEEL_ITEMS[hoveredIndex].icon
              : WHEEL_ITEMS.find((i) => i.type === selectedType)?.icon || "🚂"}
          </span>
        </div>

        {/* Wheel segments */}
        {WHEEL_ITEMS.map((item, index) => {
          // Calculate position on the circle
          const angle = (index * angleStep - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * WHEEL_RADIUS;
          const y = Math.sin(angle) * WHEEL_RADIUS;

          const isHovered = hoveredIndex === index;
          const isSelected = item.type === selectedType;

          return (
            <div
              key={item.type}
              className="wheel-item"
              style={{
                position: "absolute",
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`,
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                borderRadius: "50%",
                background: isHovered
                  ? "rgba(59, 130, 246, 0.9)"
                  : isSelected
                  ? "rgba(34, 197, 94, 0.8)"
                  : "rgba(17, 24, 39, 0.9)",
                border: `2px solid ${
                  isHovered ? "#60a5fa" : isSelected ? "#22c55e" : "#374151"
                }`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isHovered
                  ? "0 0 20px rgba(59, 130, 246, 0.5)"
                  : "0 4px 12px rgba(0, 0, 0, 0.3)",
                transition: "transform 0.1s, background 0.1s, border-color 0.1s",
                cursor: "default",
                pointerEvents: "auto",
              }}
            >
              <span style={{ fontSize: 20, marginBottom: 2 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: 8,
                  color: isHovered ? "#fff" : "#9ca3af",
                  textAlign: "center",
                  lineHeight: 1,
                  maxWidth: 48,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}

        {/* Instruction text */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: WHEEL_RADIUS + 70,
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "#6b7280",
            whiteSpace: "nowrap",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          Release to select
        </div>
      </div>
    </div>
  );
};
