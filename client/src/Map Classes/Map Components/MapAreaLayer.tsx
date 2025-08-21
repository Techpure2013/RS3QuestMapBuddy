import React, { useState, useEffect } from "react";
import { useMap, Rectangle, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import allMapAreasData from "./../Map Data/combinedMapData.json";

interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
}

const allMapAreas: MapArea[] = allMapAreasData as MapArea[];

const DETAIL_VISIBILITY_ZOOM = 0;
const REGION_WIDTH_THRESHOLD = 1000;

// --- STYLES ---
const activePathOptions = {
  color: "#00FFFF",
  weight: 3,
  fillOpacity: 0,
  opacity: 1.0,
};
const subtleLocationOptions = {
  color: "#00FFFF",
  weight: 1,
  fillOpacity: 0,
  opacity: 0.3,
};
const subtleRegionOptions = { ...subtleLocationOptions, dashArray: "5, 10" };

const convertStoredToVisual = (coord: { lat: number; lng: number }) => {
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng + 0.5;
  return { lat: visualY, lng: visualX };
};

const MapAreaLayer: React.FC = () => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [hoveredAreaId, setHoveredAreaId] = useState<number | null>(null);
  const [activeRegion, setActiveRegion] = useState<MapArea | null>(null);

  useEffect(() => {
    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoomend", updateZoom);
    return () => {
      map.off("zoomend", updateZoom);
    };
  }, [map]);

  const validMapAreas = allMapAreas.filter(
    (area) =>
      area.name &&
      area.name !== "Loading..." &&
      area.bounds[0][0] !== 0 &&
      area.bounds[0][0] < area.bounds[1][0]
  );

  return (
    <>
      {validMapAreas.map((area) => {
        const bottomLeft = { lat: area.bounds[0][1], lng: area.bounds[0][0] };
        const topRight = { lat: area.bounds[1][1], lng: area.bounds[1][0] };

        const snappedCenter = {
          lat: Math.floor((bottomLeft.lat + topRight.lat) / 2) + 0.5,
          lng: Math.floor((bottomLeft.lng + topRight.lng) / 2) + 0.5,
        };

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

        const markerPosition: L.LatLngTuple = [
          convertStoredToVisual(snappedCenter).lat,
          convertStoredToVisual(snappedCenter).lng,
        ];

        const areaWidth = topRight.lng - bottomLeft.lng;
        const isRegion = areaWidth > REGION_WIDTH_THRESHOLD;
        const isHovered = hoveredAreaId === area.mapId;

        let isContained = false;
        if (activeRegion && !isRegion) {
          const locCenter = area.center;
          const regionBounds = activeRegion.bounds;
          isContained =
            locCenter[0] >= regionBounds[0][0] &&
            locCenter[0] <= regionBounds[1][0] &&
            locCenter[1] >= regionBounds[0][1] &&
            locCenter[1] <= regionBounds[1][1];
        }

        // --- FIX #1: The component is now always visible unless contained ---
        const isVisible = !isContained;

        let pathOptions = subtleLocationOptions;
        if (isHovered) {
          pathOptions = activePathOptions;
        } else if (isRegion) {
          pathOptions = subtleRegionOptions;
        }

        // --- FIX #2: The text label is the only thing that depends on zoom level ---
        const showMarkerLabel = isHovered && zoom >= DETAIL_VISIBILITY_ZOOM;

        return isVisible ? (
          <Rectangle
            key={`${area.name}-${area.mapId}`}
            bounds={visualBounds}
            pathOptions={pathOptions}
            eventHandlers={{
              mouseover: () => {
                setHoveredAreaId(area.mapId);
                if (isRegion) setActiveRegion(area);
              },
              mouseout: () => {
                setHoveredAreaId(null);
                if (isRegion) setActiveRegion(null);
              },
            }}
          >
            {/* The tooltip appears on hover at any zoom */}
            {isHovered && <Tooltip sticky>{area.name}</Tooltip>}

            {/* The main label only appears when hovered AND zoomed in */}
            {showMarkerLabel && (
              <Marker
                position={markerPosition}
                icon={L.divIcon({
                  className: "map-area-label",
                  html: `<div>${area.name}</div>`,
                  iconAnchor: [0, 0],
                })}
              />
            )}
          </Rectangle>
        ) : null;
      })}
    </>
  );
};

export default MapAreaLayer;
