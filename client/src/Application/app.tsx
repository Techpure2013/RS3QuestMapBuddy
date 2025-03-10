import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./../Assets/CSS/index.css";
import "./../Assets/CSS/leafless.css";
import { LatLngBounds } from "leaflet";
import {
  bounds,
  gameMapOptions,
  HandleFloorIncreaseDecrease,
} from "./../Map Classes/MapFunctions";
import GridLayer from "./../Map Classes/Map Components/GridLayerComponent";
import HighlightLayer from "./../Map Classes/Map Components/TileHighlighting";
import { useParams } from "react-router-dom";
import { useSocket } from "./../Entrance/Entrance Components/SocketProvider";
import ChunkGridLayer from "Map Classes/Map Components/ChunkGrid";
//import QuestJSON from "../Map Classes/Quest Directories/A Fairy Tale II Cure a Queen/A_Fairy_Tale_II_Cure_a_Queen.json";
import StaticHighlightLayer from "Map Classes/Map Components/staticHighlighter";
const App: React.FC = () => {
  const { UserID, QuestName, level, z, x, y } = useParams<{
    UserID: string;
    QuestName: string;
    level: string;
    z: string;
    x: string;
    y: string;
  }>();
  let socket = useSocket();
  // Parse the URL parameters into numbers (if applicable)
  const initialFloor = level ? parseInt(level, 10) : 0;
  const initialZoom = z ? parseInt(z, 10) : 2;
  const initialCursorX = x ? parseInt(x, 10) : 3288;
  const initialCursorY = y ? parseInt(y, 10) : 3023;

  const [floor, setFloor] = useState(initialFloor);
  const [zoom, setZoom] = useState(initialZoom); // Make zoom state dynamic
  const [cursorX, setCursorX] = useState(initialCursorX);
  const [cursorY, setCursorY] = useState(initialCursorY);

  const bound: LatLngBounds = bounds();
  useEffect(() => {
    console.log("URL Parameters:", { UserID, QuestName, level, z, x, y });
  }, [UserID, QuestName, level, z, x, y]);

  const layers = useMemo(
    () => [
      {
        name: "Topdown",
        url: `https://runeapps.org/s3/map4/live/topdown-${floor}/{z}/{x}-{y}.webp`,
        tileSize: 512,
        maxNativeZoom: 5,
        minZoom: -4,
        opacity: 0.8,
        className: "map-topdown",
        updateWhenZooming: false,
        updateInterval: 100,
      },
      {
        name: "Walls",
        url: `https://runeapps.org/s3/map4/live/walls-${floor}/{z}/{x}-{y}.svg`,
        tileSize: 512,
        maxNativeZoom: 3,
        minNativeZoom: 3,
        minZoom: -4,
        opacity: 0.6,
        className: "map-walls",
        updateWhenZooming: true,
        updateInterval: 50,
      },
    ],
    [floor]
  );

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        const jsonOutput = {
          lat: Math.round(lat),
          lng: Math.round(lng) - 1,
        };

        // Send the coordinates to the backend via Socket.IO
        socket.emit("send-coordinates", jsonOutput);

        console.log("Coordinates sent to the server:", jsonOutput);
      },
    });
    return null;
  };

  const ZoomHandler = () => {
    const map = useMapEvents({
      zoom: () => {
        setZoom(map.getZoom()); // Update zoom state when zoom changes
      },
    });
    return null;
  };

  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorX((prevX) => (prevX !== x - 0.5 ? x - 0.5 : prevX));
    setCursorY((prevY) => (prevY !== y + 0.5 ? y + 0.5 : prevY));
  }, []);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer
        attributionControl={false}
        bounds={bound}
        id="map"
        dragging={true}
        maxBounds={gameMapOptions().maxBounds}
        zoomSnap={gameMapOptions().zoomSnap}
        zoomControl={false}
        scrollWheelZoom={true}
        zoom={zoom}
        center={[3288, 3023]}
        crs={gameMapOptions().crs}
      >
        <MapClickHandler />
        <ZoomHandler />
        <ChunkGridLayer />
        <div className="cursor-coordinates-box">
          <div className="coordinate-row">
            <span>Zoom: {Math.round(zoom)}</span>
            <span>X: {cursorX}</span>
            <span>Y: {cursorY}</span>
          </div>
        </div>
        <div className="floorButtonContainer">
          <button
            className="floor-button floor-button--up"
            onClick={() => {
              if (HandleFloorIncreaseDecrease(floor + 1)) {
                setFloor((prev) => prev + 1);
              }
            }}
            aria-label="Floor up"
          >
            ↑
          </button>
          <div className="floor-display">Floor {floor}</div>
          <button
            className="floor-button floor-button--down"
            onClick={() => {
              if (HandleFloorIncreaseDecrease(floor - 1)) {
                setFloor((prev) => Math.max(0, prev - 1));
              }
            }}
            aria-label="Floor down"
          >
            ↓
          </button>
        </div>
        <>
          {layers.map((layer) => (
            <TileLayer
              key={layer.name}
              url={layer.url}
              tileSize={layer.tileSize}
              maxNativeZoom={layer.maxNativeZoom}
              minZoom={layer.minZoom}
              opacity={layer.opacity}
              className={layer.className}
              updateWhenZooming={layer.updateWhenZooming}
              updateInterval={layer.updateInterval}
              noWrap={true}
              bounds={bound}
            />
          ))}
        </>
        <GridLayer />
        <HighlightLayer onCursorMove={handleCursorMove} />
      </MapContainer>
    </div>
  );
};

export default App;
