// src/map/layers/CollisionDebugLayer.tsx
// Debug overlay to visualize collision data on the map
// Loads and renders collision files for the visible area

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  getCachedTileKeys,
  getCachedTileImageUrl,
  parseTileKey,
  getTileBounds,
  loadCollisionForDebug,
  getFilesForArea,
} from "../utils/pathfinding";

interface CollisionDebugLayerProps {
  floor: number;
  enabled: boolean;
  /** Refresh trigger - increment to force re-render of cached tiles */
  refreshKey?: number;
}

const CollisionDebugLayerComponent: React.FC<CollisionDebugLayerProps> = ({
  floor,
  enabled,
  refreshKey = 0,
}) => {
  const map = useMap();
  const overlaysRef = useRef<Map<string, L.ImageOverlay>>(new Map());
  // Use ref instead of state for loading files to avoid infinite re-render loop
  const loadingFilesRef = useRef<Set<string>>(new Set());
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  // Listen for collision data changes to refresh immediately
  useEffect(() => {
    const handleCollisionDataChanged = () => {
      // Clear all current overlays so they get re-rendered with new data
      for (const overlay of overlaysRef.current.values()) {
        map.removeLayer(overlay);
      }
      overlaysRef.current.clear();
      // Trigger re-render
      setInternalRefreshKey(k => k + 1);
    };

    window.addEventListener('collisionDataChanged', handleCollisionDataChanged);
    return () => {
      window.removeEventListener('collisionDataChanged', handleCollisionDataChanged);
    };
  }, [map]);

  // Load collision files for visible area
  const loadVisibleArea = useCallback(async () => {
    if (!enabled) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Get file coordinates for visible area (lat=y, lng=x)
    const files = getFilesForArea(
      Math.floor(sw.lng),
      Math.floor(sw.lat),
      Math.ceil(ne.lng),
      Math.ceil(ne.lat)
    );

    // Load files that aren't cached yet
    const toLoad = files.filter(f => {
      const key = `${f.x}-${f.y}-${floor}`;
      return !getCachedTileKeys().includes(key) && !loadingFilesRef.current.has(key);
    });

    if (toLoad.length > 0) {
      console.log(`CollisionDebug: Loading ${toLoad.length} collision files for visible area...`);

      // Mark as loading (using ref to avoid re-render loop)
      toLoad.forEach(f => loadingFilesRef.current.add(`${f.x}-${f.y}-${floor}`));

      try {
        // Load in parallel
        await Promise.all(
          toLoad.map(async f => {
            await loadCollisionForDebug(f.x, f.y, floor);
          })
        );
      } catch (err) {
        console.error('CollisionDebug: Failed to load collision files:', err);
      } finally {
        // Clear loading state
        toLoad.forEach(f => loadingFilesRef.current.delete(`${f.x}-${f.y}-${floor}`));
      }

      // Trigger re-render to show new overlays
      setInternalRefreshKey(k => k + 1);
    }
  }, [enabled, floor, map]);

  // Load on mount and when map moves
  useEffect(() => {
    if (!enabled) return;

    loadVisibleArea();

    const onMoveEnd = () => {
      loadVisibleArea();
    };

    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);

    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
    };
  }, [enabled, map, loadVisibleArea]);

  // Render overlays for cached tiles
  useEffect(() => {
    // Clean up all overlays when disabled
    if (!enabled) {
      for (const overlay of overlaysRef.current.values()) {
        map.removeLayer(overlay);
      }
      overlaysRef.current.clear();
      return;
    }

    // Get all cached tile keys for the current floor
    const cachedKeys = getCachedTileKeys().filter(key => {
      const parsed = parseTileKey(key);
      return parsed && parsed.floor === floor;
    });

    // Track which keys we've processed this render
    const currentKeys = new Set<string>();

    // Add/update overlays for cached tiles
    for (const key of cachedKeys) {
      currentKeys.add(key);

      // Skip if overlay already exists
      if (overlaysRef.current.has(key)) {
        continue;
      }

      const parsed = parseTileKey(key);
      if (!parsed) continue;

      // Get cached blob URL (rendered collision image)
      const imageUrl = getCachedTileImageUrl(key);
      if (!imageUrl) {
        console.warn(`CollisionDebug: No image URL for ${key}`);
        continue;
      }

      const bounds = getTileBounds(parsed.x, parsed.y);

      // Debug: log tile placement
      console.log(`CollisionDebug: Placing tile ${key} (file ${parsed.x},${parsed.y}) at bounds:`, bounds);

      // Create image overlay
      const overlay = L.imageOverlay(imageUrl, bounds, {
        opacity: 0.5,
        interactive: false,
        className: "collision-debug-tile",
      });

      overlay.addTo(map);
      overlaysRef.current.set(key, overlay);
    }

    // Remove overlays for tiles that are no longer cached or wrong floor
    for (const [key, overlay] of overlaysRef.current.entries()) {
      if (!currentKeys.has(key)) {
        map.removeLayer(overlay);
        overlaysRef.current.delete(key);
      }
    }

    // Log stats
    console.log(`CollisionDebug: showing ${overlaysRef.current.size} cached tiles for floor ${floor}`);
  }, [map, floor, enabled, refreshKey, internalRefreshKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const overlay of overlaysRef.current.values()) {
        map.removeLayer(overlay);
      }
      overlaysRef.current.clear();
    };
  }, [map]);

  return null;
};

export const CollisionDebugLayer = React.memo(CollisionDebugLayerComponent);

// Hook to trigger collision debug refresh after path generation
export function useCollisionDebugRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { refreshKey, triggerRefresh };
}
