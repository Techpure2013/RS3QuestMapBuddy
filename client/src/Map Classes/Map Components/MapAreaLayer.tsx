// src/Map Classes/Map Components/MapAreaLayer.tsx

import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import allMapAreasData from "./../Map Data/combinedMapData.json";

interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}

const allMapAreas: MapArea[] = allMapAreasData as MapArea[];

// The zoom level at which labels will appear.
const LABEL_VISIBILITY_ZOOM_THRESHOLD = 0;

// This helper function remains the same.
const convertStoredToVisual = (coord: { lat: number; lng: number }) => {
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng + 0.5;
  return { lat: visualY, lng: visualX };
};

const MapAreaLayer: React.FC = () => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Initialize the layer group on the map once.
    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }

    const redrawLabels = () => {
      // Clear previous labels before redrawing
      layerRef.current?.clearLayers();

      const currentZoom = map.getZoom();

      // Only show labels if zoom threshold is met
      if (currentZoom < LABEL_VISIBILITY_ZOOM_THRESHOLD) {
        return;
      }

      // This is the magic number. It counteracts the map's scaling.
      // At zoom 0, scale is 1. At zoom 1, map doubles, so we halve the text size.
      const scaleFactor = 1 / Math.pow(2, currentZoom);

      const validMapAreas = allMapAreas.filter(
        (area) =>
          area.name &&
          area.name !== "Loading..." &&
          area.bounds[0][0] !== 0 &&
          area.bounds[0][0] < area.bounds[1][0]
      );

      validMapAreas.forEach((area) => {
        const bottomLeft = { lat: area.bounds[0][1], lng: area.bounds[0][0] };
        const topRight = { lat: area.bounds[1][1], lng: area.bounds[1][0] };

        // We still calculate the visual bounds to get width, height, and center.
        const visualBounds = L.latLngBounds(
          [
            convertStoredToVisual(bottomLeft).lat + 1,
            convertStoredToVisual(bottomLeft).lng,
          ],
          [
            convertStoredToVisual(topRight).lat,
            convertStoredToVisual(topRight).lng + 1,
          ]
        );

        const center = visualBounds.getCenter();
        const width = visualBounds.getEast() - visualBounds.getWest();
        const height = visualBounds.getNorth() - visualBounds.getSouth();

        // Create the custom HTML icon. Its container will scale with the map.
        const labelIcon = L.divIcon({
          className: "map-label-icon", // Base class, transparent background
          iconSize: [width, height], // The icon's size in MAP UNITS
          html: `
            <div class="map-label-container">
              <span class="map-label-text" style="transform: scale(${scaleFactor});">
                ${area.name}
              </span>
            </div>
          `,
        });

        // Add a marker using this icon to the layer group
        L.marker(center, { icon: labelIcon, interactive: false }).addTo(
          layerRef.current!
        );
      });
    };

    // Initial draw
    redrawLabels();

    // Redraw whenever the map zoom changes
    map.on("zoomend", redrawLabels);

    // Cleanup function to remove the layer and event listeners
    return () => {
      map.off("zoomend", redrawLabels);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]); // This effect runs only once on component mount.

  return null; // This component renders nothing itself.
};

export default MapAreaLayer;
