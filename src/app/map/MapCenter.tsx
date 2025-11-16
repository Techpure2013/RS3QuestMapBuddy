import React, { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { LatLngBounds } from "leaflet";
import InternalMapLayers from "./InternalMapLayers";
import GridLayer from "../../map/layers/GridLayerComponent";
import ChunkGridLayer from "../../map/layers/ChunkGrid";
import { CustomMapPanes } from "../../map/layers/CustomMapPanes";
import { IconGridDots } from "@tabler/icons-react";
import { bounds, gameMapOptions } from "../../map/utils/MapFunctions";
import { useEditorSelector } from "../../state/useEditorSelector";

const MAP_OPTIONS = gameMapOptions();
const MAP_BOUNDS: LatLngBounds = bounds();

const MapCenter: React.FC = () => {
  const z = undefined as number | undefined; // if you want to read from route, pass as prop
  const ui = useEditorSelector((s) => s.ui);
  const selection = useEditorSelector((s) => s.selection);

  const showGrids = ui.showGrids;
  const floor = selection.floor;

  const layers = useMemo(
    () =>
      [
        {
          name: "Topdown",
          url: `https://runeapps.org/s3/map4/live/topdown-${floor}/{z}/{x}-{y}.webp`,
          tileSize: 512,
          maxNativeZoom: 5,
          minZoom: -4,
          opacity: 0.8,
          className: "map-topdown",
          updateWhenZooming: false as const,
          updateInterval: 100,
          keepBuffer: 100,
          updateWhenIdle: true as const,
        },
        {
          name: "Walls",
          url: `https://runeapps.org/s3/map4/live/walls-${floor}/{z}/{x}-{y}.svg`,
          tileSize: 512,
          maxNativeZoom: 3,
          minNativeZoom: 3,
          updateWhenIdle: true as const,
          minZoom: -4,
          opacity: 0.6,
          className: "map-walls",
          updateInterval: 50,
          keepBuffer: 100,
        },
        {
          name: "Collision",
          url: `https://runeapps.org/s3/map4/live/collision-${floor}/{z}/{x}-{y}.png`,
          tileSize: 512,
          maxNativeZoom: 3,
          minNativeZoom: 3,
          updateWhenIdle: true as const,
          minZoom: -4,
          opacity: 0.6,
          className: "map-collision",
          updateInterval: 100,
          keepBuffer: 100,
        },
      ] as const,
    [floor]
  );

  return (
    <MapContainer
      crs={MAP_OPTIONS.crs}
      bounds={MAP_BOUNDS}
      id="map"
      zoom={z ?? MAP_OPTIONS.minZoom}
      maxBounds={MAP_OPTIONS.maxBounds}
      zoomSnap={MAP_OPTIONS.zoomSnap}
      zoomControl={false}
      dragging={true}
      center={[3288, 3023]}
    >
      <div className="grid-toggle-container">
        <button className="floor-button" title="Toggle Grids">
          <IconGridDots size={20} />
        </button>
      </div>

      <CustomMapPanes />

      {layers.map((layer) => (
        <TileLayer
          key={layer.name}
          url={layer.url}
          tileSize={layer.tileSize}
          maxNativeZoom={layer.maxNativeZoom as number}
          minZoom={layer.minZoom as number}
          opacity={layer.opacity as number}
          className={layer.className}
          updateInterval={layer.updateInterval}
          noWrap={true}
          bounds={MAP_BOUNDS}
        />
      ))}

      {/* Optional visualization layers */}
      {showGrids && <ChunkGridLayer />}
      <GridLayer />

      {/* All handlers and overlays */}
      <InternalMapLayers />
    </MapContainer>
  );
};

export default MapCenter;
