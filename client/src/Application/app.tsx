import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngBounds } from "leaflet";
import "./../Assets/CSS/leafless.css";
import "./../Assets/CSS/index.css";
import "./../Assets/Images/runescapeCursor.png";
import GridLayer from "./../Map Classes/Map Components/GridLayerComponent";
import HighlightLayer from "./../Map Classes/Map Components/TileHighlighting";
import {
  bounds,
  gameMapOptions,
  MapDragHandler,
  HandleFloorIncreaseDecrease,
} from "./../Map Classes/MapFunctions";
import axios from "axios";

const App: React.FC = () => {
  const [floor, setFloor] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [, setX] = useState(0);
  const [, setY] = useState(0);
  const bound: LatLngBounds = bounds();
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const layers = [
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
      updateWhenZooming: false,
      updateInterval: 100,
    },
  ];
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data from MapBuddy backend
  const fetchData = async () => {
    try {
      const response = await axios.get(
        "http://localhost:42069/api/messagesenttomapbuddy"
      );
      setData(response.data); // Update the state with new data
    } catch (err: any) {
      setError("Error fetching processed data");
      console.error("Error:", err);
    }
  };

  // Polling the backend every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(fetchData, 5000); // 5000ms = 5 seconds
    console.log(data);
    // Clean up interval when component unmounts
    return () => clearInterval(intervalId);
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
        zoom={2}
        center={[3288, 3023]}
        crs={gameMapOptions().crs}
      >
        <div className="cursor-coordinates-box">
          <div className="coordinate-row">
            <span>Zoom: {zoom}</span>
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

        <MapDragHandler setX={setX} setY={setY} setZoom={setZoom} />
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
        <GridLayer />
        <HighlightLayer
          onCursorMove={(x, y) => {
            setCursorX(x - 0.5);
            setCursorY(y + 0.5);
          }}
        />
      </MapContainer>
    </div>
  );
};

export default App;
