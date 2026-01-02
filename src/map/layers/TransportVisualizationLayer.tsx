// src/map/layers/TransportVisualizationLayer.tsx
// Visualizes all transport data on the map

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  getAllTransportsForVisualization,
  loadTransportationData,
  updateTransportCoordinates,
  deleteTransport,
  deleteNetworkNode,
  reloadTransports,
  type TransportLink,
} from "../utils/pathfinding";

// Selection state for editing
interface SelectedTransport {
  link: TransportLink;
  coordinateType: "from" | "to"; // Which end we're adjusting
}

// Display modes for transport visualization
export type TransportDisplayMode = "nodes" | "links" | "all";

// Transport type categories
export type TransportCategory =
  | "all"
  | "vertical"     // stairs, ladders, trapdoors
  | "teleport"     // lodestones, spells, jewelry, portals
  | "fairy_ring"
  | "spirit_tree"
  | "aerial"       // gliders, balloons, eagles
  | "ground"       // minecarts, carts
  | "water"        // boats, canoes, ships
  | "shortcuts";   // agility, doors, gates

interface TransportVisualizationLayerProps {
  floor: number;
  enabled: boolean;
  showGlobal?: boolean;
  showPositionBased?: boolean;
  filterType?: string | null;
  displayMode?: TransportDisplayMode;
  category?: TransportCategory;
  editMode?: boolean; // Enable click-to-adjust functionality
  onTransportUpdated?: () => void; // Callback when a transport is updated
  refreshKey?: number; // External key to force refresh (e.g., after creating a transport)
}

// Color mapping for transport types
const TYPE_COLORS: Record<string, string> = {
  // Vertical movement
  stairs: "#8b5cf6",
  ladder: "#a78bfa",
  trapdoor: "#7c3aed",
  rope: "#6d28d9",
  // Teleports
  teleport: "#06b6d4",
  lodestone: "#0891b2",
  fairy_ring: "#14b8a6",
  spirit_tree: "#10b981",
  portal: "#22d3d8",
  jewelry_teleport: "#67e8f9",
  // Aerial
  gnome_glider: "#f59e0b",
  balloon: "#fbbf24",
  eagle: "#f97316",
  magic_carpet: "#fb923c",
  // Ground/Rail
  minecart: "#a3522f",
  gnome_cart: "#92400e",
  // Water
  boat: "#0ea5e9",
  canoe: "#38bdf8",
  charter_ship: "#0284c7",
  // Shortcuts
  agility: "#10b981",
  door: "#6b7280",
  gate: "#9ca3af",
  // Other
  other: "#6b7280",
};

function getTransportType(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("lodestone")) return "lodestone";
  if (nameLower.includes("fairy ring") || nameLower.includes("fairy_ring")) return "fairy_ring";
  if (nameLower.includes("spirit tree") || nameLower.includes("spirit_tree")) return "spirit_tree";
  if (nameLower.includes("glider")) return "gnome_glider";
  if (nameLower.includes("balloon")) return "balloon";
  if (nameLower.includes("eagle")) return "eagle";
  if (nameLower.includes("minecart")) return "minecart";
  if (nameLower.includes("stairs") || nameLower.includes("staircase")) return "stairs";
  if (nameLower.includes("ladder")) return "ladder";
  if (nameLower.includes("trapdoor")) return "trapdoor";
  // Check for agility obstacles BEFORE rope (since "rope swing" is agility, not rope)
  // But don't match "climb" alone as that could be "Climbing rope" which is vertical movement
  if (nameLower.includes("balance") || nameLower.includes("swing") || nameLower.includes("jump") ||
      nameLower.includes("squeeze") || nameLower.includes("crawl") || nameLower.includes("vault") ||
      nameLower.includes("handholds") || nameLower.includes("ledge") || nameLower.includes("gap") ||
      nameLower.includes("zip") || nameLower.includes("obstacle") || nameLower.includes("shortcut") ||
      nameLower.includes("stepping") || nameLower.includes("log balance") || nameLower.includes("pipe") ||
      nameLower.includes("net") || nameLower.includes("branch") || nameLower.includes("agility") ||
      nameLower.includes("tightrope") || nameLower.includes("plank")) {
    return "agility";
  }
  // Rope for vertical climbing (not rope swings which are caught above)
  if (nameLower.includes("rope") || nameLower.includes("winch")) return "rope";
  if (nameLower.includes("boat") || nameLower.includes("ship")) return "boat";
  if (nameLower.includes("canoe")) return "canoe";
  if (nameLower.includes("door")) return "door";
  if (nameLower.includes("gate")) return "gate";
  if (nameLower.includes("teleport") || nameLower.includes("spell")) return "teleport";
  if (nameLower.includes("portal")) return "portal";
  return "other";
}

function getTypeColor(name: string): string {
  const type = getTransportType(name);
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

function matchesCategory(name: string, category: TransportCategory): boolean {
  if (category === "all") return true;

  const type = getTransportType(name);

  switch (category) {
    case "vertical":
      return ["stairs", "ladder", "trapdoor", "rope"].includes(type);
    case "teleport":
      return ["teleport", "lodestone", "portal", "jewelry_teleport"].includes(type);
    case "fairy_ring":
      return type === "fairy_ring";
    case "spirit_tree":
      return type === "spirit_tree";
    case "aerial":
      return ["gnome_glider", "balloon", "eagle", "magic_carpet"].includes(type);
    case "ground":
      return ["minecart", "gnome_cart"].includes(type);
    case "water":
      return ["boat", "canoe", "charter_ship"].includes(type);
    case "shortcuts":
      return ["agility", "door", "gate"].includes(type);
    default:
      return true;
  }
}

// Check if transport is a network type (has many interconnected nodes)
function isNetworkTransport(name: string): boolean {
  const type = getTransportType(name);
  return ["fairy_ring", "spirit_tree", "gnome_glider", "balloon", "minecart", "eagle"].includes(type);
}

const TransportVisualizationLayerComponent: React.FC<TransportVisualizationLayerProps> = ({
  floor,
  enabled,
  showGlobal = true,
  showPositionBased = true,
  filterType = null,
  displayMode = "nodes",
  category = "all",
  editMode = false,
  onTransportUpdated,
  refreshKey = 0,
}) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // Force re-render after updates
  const [selectedTransport, setSelectedTransport] = useState<SelectedTransport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedMarkerRef = useRef<L.CircleMarker | L.Marker | null>(null);

  // Ensure pane exists
  useEffect(() => {
    if (!map.getPane("transportPane")) {
      map.createPane("transportPane");
      const pane = map.getPane("transportPane");
      if (pane) {
        pane.style.zIndex = "590";
        pane.style.pointerEvents = "auto";
      }
    }
  }, [map]);

  // Load transport data on initial mount
  useEffect(() => {
    if (!enabled) return;
    loadTransportationData().then(() => {
      setLoaded(true);
    });
  }, [enabled]);

  // Reload transport data when refreshKey changes (e.g., after creating/editing a transport)
  useEffect(() => {
    if (!enabled || refreshKey === 0) return; // Skip initial load
    reloadTransports().then(() => {
      console.log('%c🔄 Transport data reloaded after change', 'color: lime');
    });
  }, [enabled, refreshKey]);

  // Handle map click to set new position
  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    if (!selectedTransport || !editMode || isSaving) return;

    // IMPORTANT: Stop propagation to prevent other click handlers (like plotting) from firing
    L.DomEvent.stop(e);

    const { link, coordinateType } = selectedTransport;

    // If no database ID, can't update
    if (!link.id) {
      console.warn("Cannot update transport without database ID");
      setSelectedTransport(null);
      return;
    }

    // Convert click position to game coordinates
    // Visual bounds are [y-0.5, x+0.5] to [y+0.5, x+1.5]
    // So subtract 0.5 from lng before floor to get correct tile
    const newX = Math.floor(e.latlng.lng - 0.5);
    const newY = Math.floor(e.latlng.lat + 0.5);

    // Check if Shift is held - if so, update the second corner (x2, y2) for multi-tile bounds
    const isShiftHeld = e.originalEvent.shiftKey;
    const isMultiTile = link.fromX2 !== undefined || link.fromY2 !== undefined;

    let updates: Record<string, number | null>;

    if (coordinateType === "from") {
      if (isShiftHeld) {
        // Shift+Click: Set second corner for multi-tile bounds
        updates = { from_x2: newX, from_y2: newY };
        console.log(`Setting second corner (x2, y2) to (${newX}, ${newY})`);
      } else if (isMultiTile) {
        // Regular click on multi-tile: move the first corner, keep relative size
        const dx = link.fromX2 !== undefined ? link.fromX2 - link.fromX : 0;
        const dy = link.fromY2 !== undefined ? link.fromY2 - link.fromY : 0;
        updates = {
          from_x: newX,
          from_y: newY,
          from_x2: newX + dx,
          from_y2: newY + dy,
        };
        console.log(`Moving multi-tile from (${newX}, ${newY}) to (${newX + dx}, ${newY + dy})`);
      } else {
        // Single-tile: just move the position
        updates = { from_x: newX, from_y: newY };
        console.log(`Updating from position to (${newX}, ${newY})`);
      }
    } else {
      updates = { to_x: newX, to_y: newY };
      console.log(`Updating to position to (${newX}, ${newY})`);
    }

    console.log(`Updating transport ${link.id} ${coordinateType}${isShiftHeld ? ' (second corner)' : ''}`);

    setIsSaving(true);

    try {
      const result = await updateTransportCoordinates(link.id, updates);

      if (result) {
        console.log(`%c✅ Transport updated successfully`, 'color: lime');
        console.log(`%c📍 New coordinates: from=(${result.from_x}, ${result.from_y}) to=(${result.to_x}, ${result.to_y})`, 'color: cyan');
        // Trigger refresh callback
        onTransportUpdated?.();
        // Force re-render by incrementing counter (data was already reloaded by updateTransportCoordinates)
        setRefreshCounter(c => c + 1);
      } else {
        console.error("Failed to update transport - check network tab for errors");
      }
    } catch (err) {
      console.error("Error updating transport:", err);
    } finally {
      setIsSaving(false);
      setSelectedTransport(null);
    }
  }, [selectedTransport, editMode, isSaving, onTransportUpdated]);

  // Map click handler for edit mode
  useEffect(() => {
    if (!editMode || !enabled) return;

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [map, editMode, enabled, handleMapClick]);

  // Clear selection when edit mode is disabled
  useEffect(() => {
    if (!editMode) {
      setSelectedTransport(null);
    }
  }, [editMode]);

  // Handle Delete key to remove selected transport
  useEffect(() => {
    if (!editMode || !selectedTransport) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      console.log(`%c⌨️ Key pressed: ${e.key}`, 'color: cyan');
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        console.log(`%c🗑️ Delete key detected, selected transport:`, 'color: yellow', selectedTransport);

        const { link } = selectedTransport;
        if (!link.id) {
          console.warn("Cannot delete transport without database ID");
          return;
        }

        // Check if this is a network transport (Spirit Tree, Fairy Ring, etc.)
        const isNetwork = isNetworkTransport(link.name);

        let deleteChoice: "single" | "all" | "cancel" = "cancel";

        if (isNetwork) {
          // For network transports, ask if user wants to delete just this link or all connections from this node
          const choice = window.confirm(
            `Delete ALL connections from this ${getTransportType(link.name)} node?\n\n` +
            `Node: (${link.fromX}, ${link.fromY}, F${link.fromLevel})\n\n` +
            `Click OK to delete ALL connections from this node.\n` +
            `Click Cancel to delete just this single link.`
          );

          if (choice) {
            deleteChoice = "all";
          } else {
            // Ask again for single deletion
            const singleDelete = window.confirm(
              `Delete just this single link?\n\n"${link.name}"\nFrom: (${link.fromX}, ${link.fromY})\nTo: (${link.toX}, ${link.toY})`
            );
            deleteChoice = singleDelete ? "single" : "cancel";
          }
        } else {
          // Regular transport - simple confirm
          const confirmDelete = window.confirm(
            `Delete transport "${link.name}"?\n\nFrom: (${link.fromX}, ${link.fromY}, F${link.fromLevel})\nTo: (${link.toX}, ${link.toY}, F${link.toLevel})`
          );
          deleteChoice = confirmDelete ? "single" : "cancel";
        }

        if (deleteChoice === "cancel") return;

        setIsSaving(true);

        try {
          if (deleteChoice === "all") {
            // Delete all connections from this network node
            console.log(`%c🗑️ Deleting all transports from (${link.fromX}, ${link.fromY}, F${link.fromLevel})`, 'color: yellow');
            const result = await deleteNetworkNode(link.fromX, link.fromY, link.fromLevel);
            console.log(`%c🗑️ Network node deleted: ${result.deleted} removed, ${result.failed} failed`, 'color: orange');
          } else {
            // Delete single transport
            console.log(`%c🗑️ Attempting to delete transport ID: ${link.id}`, 'color: yellow');
            const success = await deleteTransport(link.id);
            if (success) {
              console.log(`%c🗑️ Transport deleted successfully: ${link.name} (ID: ${link.id})`, 'color: orange');
            } else {
              console.error(`%c❌ Failed to delete transport ID: ${link.id} - check Network tab`, 'color: red');
            }
          }

          // Trigger UI refresh
          onTransportUpdated?.();
          setRefreshCounter(c => c + 1);
        } catch (err) {
          console.error(`%c❌ Error deleting transport`, 'color: red', err);
        } finally {
          setIsSaving(false);
          setSelectedTransport(null);
        }
      } else if (e.key === "Escape") {
        setSelectedTransport(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editMode, selectedTransport, onTransportUpdated]);

  // Handle transport marker click
  const handleTransportClick = useCallback((link: TransportLink, coordinateType: "from" | "to") => {
    if (!editMode) return;

    if (!link.id) {
      console.warn("This transport has no database ID and cannot be edited");
      return;
    }

    console.log(`%c🎯 Selected transport: ${link.name} (${coordinateType}) - ID: ${link.id}`, 'color: lime; font-weight: bold');
    console.log(`%c   Press Delete to remove, click map to move, Escape to cancel`, 'color: gray');
    setSelectedTransport({ link, coordinateType });
  }, [editMode]);

  // Render transports
  const renderTransports = useCallback(() => {
    if (!enabled || !loaded) return;

    // Create or clear layer group
    if (!layerGroupRef.current) {
      layerGroupRef.current = new L.LayerGroup().addTo(map);
    }
    layerGroupRef.current.clearLayers();

    const data = getAllTransportsForVisualization();
    const layer = layerGroupRef.current;

    // Track unique positions for "nodes" mode
    // In edit mode, we also track the links for click handlers
    interface NodeData {
      x: number;
      y: number;
      x2?: number; // Optional second corner for multi-tile
      y2?: number;
      level: number;
      names: string[];
      color: string;
      isNetwork: boolean;
      isMultiTile: boolean; // Whether this is a multi-tile transport
      links: { link: TransportLink; coordinateType: "from" | "to" }[]; // For edit mode
    }
    const uniqueNodes = new Map<string, NodeData>();

    let linkCount = 0;
    let nodeCount = 0;

    // Process position-based transports
    if (showPositionBased) {
      for (const { links } of data.positionBased) {
        for (const link of links) {
          // Filter by floor - only show transports that START on current floor
          if (link.fromLevel !== floor) continue;

          // Filter by category
          if (!matchesCategory(link.name, category)) continue;

          // Filter by type string if specified
          if (filterType && !link.name.toLowerCase().includes(filterType.toLowerCase())) continue;

          const color = getTypeColor(link.name);
          const isNetwork = isNetworkTransport(link.name);

          // In "nodes" mode, just collect unique positions
          if (displayMode === "nodes" || (displayMode === "all" && isNetwork)) {
            // Check if this is a multi-tile transport
            const isMultiTile = !!(link.fromX2 !== undefined || link.fromY2 !== undefined);

            // Add "from" position (use bounding box for multi-tile)
            const fromKey = isMultiTile
              ? `${link.fromX},${link.fromY},${link.fromX2},${link.fromY2},${link.fromLevel}`
              : `${link.fromX},${link.fromY},${link.fromLevel}`;
            if (!uniqueNodes.has(fromKey)) {
              uniqueNodes.set(fromKey, {
                x: link.fromX,
                y: link.fromY,
                x2: link.fromX2,
                y2: link.fromY2,
                level: link.fromLevel,
                names: [],
                color,
                isNetwork,
                isMultiTile,
                links: []
              });
            }
            const fromNode = uniqueNodes.get(fromKey)!;
            if (!fromNode.names.some(n => n.split(' -> ')[0] === link.name.split(' -> ')[0])) {
              fromNode.names.push(link.name);
            }
            // Track link for edit mode (only if it has an ID)
            if (link.id) {
              fromNode.links.push({ link, coordinateType: "from" });
            }

            // For non-network transports, also show destination (only if on same floor)
            if (!isNetwork && link.toLevel === floor) {
              const toKey = `${link.toX},${link.toY},${link.toLevel}`;
              if (!uniqueNodes.has(toKey)) {
                uniqueNodes.set(toKey, {
                  x: link.toX,
                  y: link.toY,
                  level: link.toLevel,
                  names: [],
                  color,
                  isNetwork: false,
                  isMultiTile: false, // Destinations are single-tile
                  links: []
                });
              }
              const toNode = uniqueNodes.get(toKey)!;
              toNode.names.push(`→ ${link.name}`);
              // Track link for edit mode (only if it has an ID)
              if (link.id) {
                toNode.links.push({ link, coordinateType: "to" });
              }
            }
          }

          // In "links" or "all" mode for non-network transports, draw arrows (only if on same floor)
          if ((displayMode === "links" || (displayMode === "all" && !isNetwork)) && link.toLevel === floor) {
            // Draw line from tile center to tile center
            // Visual offset: down 0.5, left 0.5 from +1 base = +0.5 X offset
            const fromLatLng = L.latLng(link.fromY, link.fromX + 1);
            const toLatLng = L.latLng(link.toY, link.toX + 1);

            // Draw line
            const line = L.polyline([fromLatLng, toLatLng], {
              color,
              weight: 2,
              opacity: 0.6,
              dashArray: link.fromLevel !== link.toLevel ? "4, 4" : undefined,
              pane: "transportPane",
            });

            line.bindTooltip(`
              <strong>${link.name}</strong><br>
              From: (${link.fromX}, ${link.fromY}, F${link.fromLevel})<br>
              To: (${link.toX}, ${link.toY}, F${link.toLevel})<br>
              Time: ${link.time} ticks
            `, { sticky: true });

            layer.addLayer(line);
            linkCount++;
          }
        }
      }
    }

    // Render collected nodes
    for (const [, node] of uniqueNodes) {
      if (node.level !== floor) continue;

      // Check if this node contains the selected transport
      const isSelected = selectedTransport && node.links.some(
        l => l.link.id === selectedTransport.link.id &&
             l.coordinateType === selectedTransport.coordinateType
      );

      // Check if any links are editable (have database IDs)
      const hasEditableLinks = node.links.length > 0;

      // Build tooltip with all transport names at this location
      const editableCount = node.links.length;
      const tooltipContent = node.names.length > 3
        ? `<strong>${node.names.length} transports</strong><br>${node.names.slice(0, 3).join('<br>')}...<br><em>+${node.names.length - 3} more</em>`
        : `<strong>${node.names.join('<br>')}</strong>`;

      const editHint = editMode && hasEditableLinks
        ? node.isMultiTile
          ? `<br><em style="color: #88ff88;">Click to select, then: Click=move, Shift+Click=resize</em>`
          : `<br><em style="color: #88ff88;">Click to adjust (${editableCount} editable)</em>`
        : editMode
        ? `<br><em style="color: #ff8888;">No database ID - not editable</em>`
        : "";

      const selectedHint = isSelected
        ? node.isMultiTile
          ? `<br><strong style="color: #ffff00;">SELECTED - Click to move, Shift+Click to resize, Delete to remove</strong>`
          : `<br><strong style="color: #ffff00;">SELECTED - Click map to move, Delete to remove</strong>`
        : "";

      // Position info for tooltip
      const positionInfo = node.isMultiTile
        ? `Area: (${node.x}, ${node.y}) to (${node.x2}, ${node.y2}), F${node.level}`
        : `Position: (${node.x}, ${node.y}, F${node.level})`;

      let marker: L.CircleMarker | L.Rectangle;

      if (node.isMultiTile && node.x2 !== undefined && node.y2 !== undefined) {
        // Render multi-tile transport as a rectangle
        // Visual offset: down 0.5, left 0.5 from +1 base
        const minX = Math.min(node.x, node.x2);
        const maxX = Math.max(node.x, node.x2);
        const minY = Math.min(node.y, node.y2);
        const maxY = Math.max(node.y, node.y2);

        // Tile bounds: SW at (minY-0.5, minX+0.5), NE at (maxY+0.5, maxX+1.5)
        const bounds = L.latLngBounds(
          [minY - 0.5, minX + 0.5],
          [maxY + 0.5, maxX + 1.5]
        );

        marker = L.rectangle(bounds, {
          color: isSelected ? "#FFFFFF" : node.color,
          fillColor: isSelected ? "#FF4444" : node.color,
          fillOpacity: isSelected ? 0.6 : 0.4,
          weight: isSelected ? 3 : 2,
          pane: "transportPane",
        });
      } else {
        // Render single-tile transport
        // Visual offset: down 0.5, left 0.5 from +1 base
        // Tile bounds: [y-0.5, x+0.5] to [y+0.5, x+1.5]
        const bounds = L.latLngBounds(
          [node.y - 0.5, node.x + 0.5],
          [node.y + 0.5, node.x + 1.5]
        );

        const radius = node.isNetwork ? 6 : 4;

        // Use circleMarker for network transports (many overlapping nodes), rectangle for others
        if (node.isNetwork) {
          // Center of tile: (y, x + 1)
          const latLng = L.latLng(node.y, node.x + 1);
          marker = L.circleMarker(latLng, {
            radius: isSelected ? radius + 3 : radius,
            color: isSelected ? "#FFFFFF" : node.color,
            fillColor: isSelected ? "#FF4444" : node.color,
            fillOpacity: isSelected ? 1 : 0.8,
            weight: isSelected ? 3 : 2,
            pane: "transportPane",
          });
        } else {
          marker = L.rectangle(bounds, {
            color: isSelected ? "#FFFFFF" : node.color,
            fillColor: isSelected ? "#FF4444" : node.color,
            fillOpacity: isSelected ? 0.7 : 0.5,
            weight: isSelected ? 3 : 2,
            pane: "transportPane",
          });
        }
      }

      marker.bindTooltip(`
        ${tooltipContent}<br>
        <em>${positionInfo}</em>
        ${editHint}
        ${selectedHint}
      `, { sticky: true });

      // Add click handler in edit mode
      if (editMode && hasEditableLinks) {
        marker.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          // Select the first editable link at this position
          const firstEditable = node.links[0];
          handleTransportClick(firstEditable.link, firstEditable.coordinateType);
        });
        // Add CSS class for cursor - marker element may not exist yet
        marker.on("add", () => {
          const el = marker.getElement();
          if (el instanceof HTMLElement) {
            el.style.cursor = "pointer";
          }
        });
      }

      layer.addLayer(marker);
      nodeCount++;
    }

    // Render global teleports (show destinations as stars)
    if (showGlobal) {
      for (const link of data.global) {
        if (link.toLevel !== floor) continue;
        if (!matchesCategory(link.name, category)) continue;
        if (filterType && !link.name.toLowerCase().includes(filterType.toLowerCase())) continue;

        const color = getTypeColor(link.name);
        // Center of destination tile (down 0.5, left 0.5 from +1 base)
        const destLatLng = L.latLng(link.toY, link.toX + 1);

        // Check if this global teleport is selected
        const isSelected = selectedTransport &&
          selectedTransport.link.id === link.id &&
          selectedTransport.coordinateType === "to";

        const hasId = !!link.id;

        const starIcon = L.divIcon({
          className: "global-teleport-icon",
          html: `<div style="
            font-size: ${isSelected ? 20 : 14}px;
            color: ${isSelected ? '#FF4444' : color};
            text-shadow: 0 0 2px black, 0 0 4px ${isSelected ? '#FF4444' : color};
            transform: translate(-50%, -50%);
            ${editMode && hasId ? 'cursor: pointer;' : ''}
          ">${isSelected ? '◉' : '★'}</div>`,
          iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
          iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
        });

        const marker = L.marker(destLatLng, {
          icon: starIcon,
          pane: "transportPane",
        });

        const editHint = editMode && hasId
          ? `<br><em style="color: #88ff88;">Click to adjust destination</em>`
          : editMode
          ? `<br><em style="color: #ff8888;">No database ID - not editable</em>`
          : "";

        const selectedHint = isSelected
          ? `<br><strong style="color: #ffff00;">SELECTED - Click map to move, Delete to remove</strong>`
          : "";

        marker.bindTooltip(`
          <strong>🌐 ${link.name}</strong><br>
          <em>Global teleport</em><br>
          Dest: (${link.toX}, ${link.toY}, F${link.toLevel})
          ${editHint}
          ${selectedHint}
        `, { sticky: true });

        // Add click handler in edit mode
        if (editMode && hasId) {
          marker.on("click", (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            handleTransportClick(link, "to");
          });
        }

        layer.addLayer(marker);
        nodeCount++;
      }
    }

    console.log(`%c🚂 Transport Viz: ${nodeCount} nodes, ${linkCount} links on floor ${floor}`, 'color: cyan');
  }, [enabled, loaded, map, floor, showGlobal, showPositionBased, filterType, displayMode, category, editMode, selectedTransport, handleTransportClick, refreshCounter, refreshKey]);

  useEffect(() => {
    renderTransports();
  }, [renderTransports]);

  useEffect(() => {
    if (!enabled && layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map]);

  return null;
};

export const TransportVisualizationLayer = React.memo(TransportVisualizationLayerComponent);
