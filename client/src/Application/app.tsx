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
import { EditorPanel } from "./../Map Classes/Map Components/DeveloperControls";
import { produce } from "immer";

import { SelectionHighlightLayer } from "./../Map Classes/Map Components/SelectionHighlightLayer";
import type { SelectionGeometry } from "./../Map Classes/Map Components/SelectionHighlightLayer";
interface QuestData {
  questName: string;
  questSteps: any[];
}

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

  // --- STATE ---
  const [floor, setFloor] = useState(level ? parseInt(level, 10) : 0);
  const [zoom, setZoom] = useState(z ? parseInt(z, 10) : 2);
  const [cursorX, setCursorX] = useState(x ? parseInt(x, 10) : 3288);
  const [cursorY, setCursorY] = useState(y ? parseInt(y, 10) : 3023);
  const [questJson, setQuestJson] = useState<QuestData | null>(null);
  const [jsonString, setJsonString] = useState("");
  const [selectedStep, setSelectedStep] = useState(0);
  const [targetType, setTargetType] = useState<"npc" | "object">("npc");
  const [targetIndex, setTargetIndex] = useState(0);
  const [captureMode, setCaptureMode] = useState("single");
  const [firstCorner, setFirstCorner] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [wanderRadiusInput, setWanderRadiusInput] = useState(5);
  const selectionGeometry = useMemo<SelectionGeometry>(() => {
    if (!questJson) return { type: "none" };
    const target =
      questJson.questSteps[selectedStep]?.highlights[targetType]?.[targetIndex];
    if (!target) return { type: "none" };

    if (targetType === "npc") {
      return {
        type: "npc",
        location: target.npcLocation,
        radius: target.wanderRadius,
      };
    } else {
      // targetType is 'object'
      return {
        type: "object",
        locationArray: target.objectLocation,
        radius: target.objectRadius,
      };
    }
  }, [questJson, selectedStep, targetType, targetIndex]);
  // --- DERIVED VALUES ---
  const targetNameValue = useMemo(() => {
    if (!questJson) return "";
    const target =
      questJson.questSteps[selectedStep]?.highlights[targetType]?.[targetIndex];
    return target
      ? targetType === "npc"
        ? target.npcName || ""
        : target.name || ""
      : "";
  }, [questJson, selectedStep, targetType, targetIndex]);

  const stepDescriptionValue =
    questJson?.questSteps[selectedStep]?.stepDescription || "";

  const itemsNeededValue =
    questJson?.questSteps[selectedStep]?.itemsNeeded?.join("\n") || "";

  const itemsRecommendedValue =
    questJson?.questSteps[selectedStep]?.itemsRecommended?.join("\n") || "";

  const additionalInfoValue =
    questJson?.questSteps[selectedStep]?.additionalStepInformation?.join(
      "\n"
    ) || "";

  // --- EFFECTS ---
  useEffect(() => {
    setTargetIndex(0);
  }, [selectedStep]);

  // --- HANDLERS ---
  const updateQuestState = (newQuestState: QuestData) => {
    setQuestJson(newQuestState);
    setJsonString(JSON.stringify(newQuestState, null, 2));
  };

  const handleJsonTextChange = (text: string) => {
    setJsonString(text);
    try {
      const parsed = JSON.parse(text);
      setQuestJson(parsed);
    } catch (error) {
      // Do nothing
    }
  };

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) handleJsonTextChange(text);
    };
    reader.readAsText(file);
  };

  const handleStepIncrement = () => {
    if (questJson && selectedStep < questJson.questSteps.length - 1) {
      setSelectedStep((prev) => prev + 1);
    }
  };

  const handleStepDecrement = () => {
    if (selectedStep > 0) {
      setSelectedStep((prev) => prev - 1);
    }
  };

  // FIX 1: Create the dedicated handler for the stepDescription string.
  const handleStepDescriptionChange = (newDescription: string) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      draft.questSteps[selectedStep].stepDescription = newDescription;
    });
    updateQuestState(nextState);
  };

  const handleGenericArrayChange = (
    field: "itemsNeeded" | "itemsRecommended" | "additionalStepInformation",
    value: string
  ) => {
    if (!questJson) return;
    const itemsArray = value.split("\n");
    const nextState = produce(questJson, (draft) => {
      draft.questSteps[selectedStep][field] = itemsArray;
    });
    updateQuestState(nextState);
  };

  const handleTargetNameChange = (newName: string) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep].highlights[targetType][targetIndex];
      if (target) {
        if (targetType === "npc") target.npcName = newName;
        else target.name = newName;
      }
    });
    updateQuestState(nextState);
  };

  const handleWanderRadiusCapture = () => {
    if (targetType !== "npc") {
      alert("Wander Radius can only be applied to NPCs.");
      return;
    }
    setCaptureMode("wanderRadius");
    alert(
      `Wander Radius mode activated. Click the NPC's center point on the map.`
    );
  };

  const handleApplyRadius = () => {
    if (!questJson) return;
    const target =
      questJson.questSteps[selectedStep].highlights[targetType][targetIndex];
    const center = target?.npcLocation;

    if (!center || (center.lat === 0 && center.lng === 0)) {
      alert("No center point set for this NPC. Please set a location first.");
      return;
    }

    const radius = wanderRadiusInput;
    const nextState = produce(questJson, (draft) => {
      const draftTarget =
        draft.questSteps[selectedStep].highlights[targetType][targetIndex];
      // Assemble the object according to the unusual schema
      draftTarget.wanderRadius = {
        bottomLeft: {
          lat: center.lat - (radius - 1),
          lng: center.lng - (radius + 1),
        },
        topRight: {
          lat: center.lat + (radius - 1),
          lng: center.lng + (radius + 1),
        },
      };
    });
    updateQuestState(nextState);
  };
  const handleResetRadius = () => {
    if (!questJson) return;

    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep].highlights[targetType][targetIndex];
      if (!target) return;

      const emptyRadius = {
        bottomLeft: { lat: 0, lng: 0 },
        topRight: { lat: 0, lng: 0 },
      };

      if (targetType === "npc") {
        target.wanderRadius = emptyRadius;
      } else {
        target.objectRadius = emptyRadius;
      }
    });
    updateQuestState(nextState);
  };
  const handleDataCaptured = (data: any) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step) return;
      step.floor = floor;
      const highlightTarget = step.highlights[targetType][targetIndex];
      if (!highlightTarget) return;

      if (data.type === "single") {
        if (targetType === "npc") {
          highlightTarget.npcLocation = data.payload;
        } else {
          highlightTarget.objectLocation = [data.payload];
        }
      } else if (data.type === "radius") {
        const radiusKey =
          targetType === "npc" ? "wanderRadius" : "objectRadius";
        highlightTarget[radiusKey] = data.payload;
      } else if (data.type === "wanderRadius") {
        if (targetType === "npc") {
          highlightTarget.npcLocation = data.payload.center;
          highlightTarget.wanderRadius = data.payload.wanderRadius;
        }
      }
    });
    updateQuestState(nextState);
  };

  // --- MAP COMPONENTS ---
  const snapToTileCoordinate = (latlng: L.LatLng) => {
    const lat = Math.floor(latlng.lat + 0.5);
    const lng = Math.floor(latlng.lng - 0.5);
    return { lat, lng };
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const snappedCoord = snapToTileCoordinate(e.latlng);

        switch (captureMode) {
          case "single":
            handleDataCaptured({ type: "single", payload: snappedCoord });
            break;
          case "radius":
            if (!firstCorner) {
              setFirstCorner(snappedCoord);
              console.log("Corner 1 set. Click corner 2.");
              return;
            }
            // FIX 3: Update two-click radius with integer logic.
            const radiusPayload = {
              bottomLeft: {
                lat: Math.max(firstCorner.lat, snappedCoord.lat),
                lng: Math.min(firstCorner.lng, snappedCoord.lng),
              },
              topRight: {
                lat: Math.min(firstCorner.lat, snappedCoord.lat),
                lng: Math.max(firstCorner.lng, snappedCoord.lng),
              },
            };
            handleDataCaptured({ type: "radius", payload: radiusPayload });
            setFirstCorner(null);
            break;
          case "wanderRadius":
            const radius = wanderRadiusInput;
            // FIX 4: Update one-click wander radius with integer logic.
            handleDataCaptured({
              type: "wanderRadius",
              payload: {
                center: snappedCoord,
                wanderRadius: {
                  bottomLeft: {
                    lat: snappedCoord.lat + radius,
                    lng: snappedCoord.lng - radius,
                  },
                  topRight: {
                    lat: snappedCoord.lat - radius,
                    lng: snappedCoord.lng + radius,
                  },
                },
              },
            });
            setCaptureMode("single");
            break;
        }
      },
    });
    return null;
  };

  const ZoomHandler = () => {
    const map = useMapEvents({ zoom: () => setZoom(map.getZoom()) });
    return null;
  };

  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorX(x - 0.5);
    setCursorY(y + 0.5);
  }, []);

  const bound: LatLngBounds = bounds();
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
      {
        name: "Collision",
        url: `https://runeapps.org/s3/map4/live/collision-${floor}/{z}/{x}-{y}.svg`,
        tileSize: 512,
        maxNativeZoom: 3,
        minNativeZoom: 3,
        minZoom: -4,
        opacity: 0.6,
        className: "map-collision",
        updateWhenZooming: true,
        updateInterval: 50,
      },
    ],
    [floor]
  );

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <EditorPanel
        onResetRadius={handleResetRadius}
        itemsNeededValue={itemsNeededValue}
        onItemsNeededChange={(val) =>
          handleGenericArrayChange("itemsNeeded", val)
        }
        itemsRecommendedValue={itemsRecommendedValue}
        onItemsRecommendedChange={(val) =>
          handleGenericArrayChange("itemsRecommended", val)
        }
        additionalInfoValue={additionalInfoValue}
        onAdditionalInfoChange={(val) =>
          handleGenericArrayChange("additionalStepInformation", val)
        }
        wanderRadiusInput={wanderRadiusInput}
        onWanderRadiusInputChange={setWanderRadiusInput}
        onWanderRadiusCapture={handleWanderRadiusCapture}
        onApplyRadius={handleApplyRadius}
        jsonString={jsonString}
        onJsonChange={handleJsonTextChange}
        onFileLoad={handleFileLoad}
        selectedStep={selectedStep}
        onStepChange={setSelectedStep}
        onStepIncrement={handleStepIncrement}
        onStepDecrement={handleStepDecrement}
        // FIX 2: Pass the correct, dedicated handler to the prop.
        stepDescriptionValue={stepDescriptionValue}
        onStepDescriptionChange={handleStepDescriptionChange}
        targetNameValue={targetNameValue}
        onTargetNameChange={handleTargetNameChange}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        targetIndex={targetIndex}
        onTargetIndexChange={setTargetIndex}
        floor={floor}
        onFloorChange={setFloor}
      />
      <MapContainer
        {...gameMapOptions()}
        bounds={bound}
        id="map"
        zoom={zoom}
        center={[3288, 3023]}
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
              if (HandleFloorIncreaseDecrease(floor + 1)) setFloor(floor + 1);
            }}
          >
            ↑
          </button>
          <div className="floor-display">Floor {floor}</div>
          <button
            className="floor-button floor-button--down"
            onClick={() => {
              if (HandleFloorIncreaseDecrease(floor - 1))
                setFloor(Math.max(0, floor - 1));
            }}
          >
            ↓
          </button>
        </div>
        <>
          {layers.map((layer) => (
            <TileLayer
              key={layer.name}
              {...layer}
              noWrap={true}
              bounds={bound}
            />
          ))}
        </>
        <SelectionHighlightLayer geometry={selectionGeometry} />
        <GridLayer />
        <HighlightLayer onCursorMove={handleCursorMove} />
        <div className="capture-mode-panel">
          <button onClick={() => setCaptureMode("single")}>Single Point</button>
          <button onClick={() => setCaptureMode("radius")}>Radius</button>
          <p>Mode: {captureMode}</p>
          {firstCorner && <p>Corner 1 Set!</p>}
        </div>
      </MapContainer>
    </div>
  );
};

export default App;
