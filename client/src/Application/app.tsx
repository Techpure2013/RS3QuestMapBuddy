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
import StepSnapHandler from "Map Classes/Map Components/StepSnapHandler";
import { SelectionHighlightLayer } from "./../Map Classes/Map Components/SelectionHighlightLayer";
import type { SelectionGeometry } from "./../Map Classes/Map Components/SelectionHighlightLayer";

interface QuestData {
  questName: string;
  questSteps: any[];
}
type FileSystemFileHandle = any;

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
  const [selectedObjectColor, setSelectedObjectColor] = useState("#00FF00");
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
  const [objectNumberLabel, setObjectNumberLabel] = useState("");
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null
  );
  const [stepDescriptionEdit, setStepDescriptionEdit] =
    useState<boolean>(false);

  // --- DERIVED VALUES ---
  const selectionGeometry = useMemo<SelectionGeometry>(() => {
    if (!questJson) return { type: "none" };
    const step = questJson.questSteps[selectedStep];
    if (!step) return { type: "none" };

    if (targetType === "npc") {
      return { type: "npc", npcArray: step.highlights?.npc || [] };
    } else if (targetType === "object") {
      return { type: "object", objectArray: step.highlights?.object || [] };
    }
    return { type: "none" };
  }, [questJson, selectedStep, targetType]);

  const targetNameValue = useMemo(() => {
    if (!questJson) return "";
    const target =
      questJson.questSteps[selectedStep]?.highlights[targetType]?.[targetIndex];
    if (!target) return "";
    return targetType === "npc" ? target.npcName || "" : target.name || "";
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
  // ✅ THIS IS THE SINGLE SOURCE OF TRUTH FOR STEP CHANGES
  useEffect(() => {
    if (!questJson) return;
    const step = questJson.questSteps[selectedStep];
    if (!step) return;

    const hasValidNpcs =
      step.highlights?.npc?.some(
        (npc: any) => npc.npcLocation?.lat !== 0 || npc.npcLocation?.lng !== 0
      ) || false;
    const hasValidObjects =
      step.highlights?.object?.some((obj: any) =>
        obj.objectLocation?.some((loc: any) => loc.lat !== 0 || loc.lng !== 0)
      ) || false;

    if (hasValidNpcs) {
      setTargetType("npc");
      setTargetIndex(0);
    } else if (hasValidObjects) {
      setTargetType("object");
      setTargetIndex(0);
    } else {
      // No valid highlights in this step
      setTargetIndex(0); // Default to index 0, can be empty
    }
  }, [questJson, selectedStep]);

  useEffect(() => {
    if (targetType === "object") {
      setCaptureMode("multi-point");
    } else {
      setCaptureMode("single");
    }
  }, [targetType]);

  // --- HANDLERS ---
  const handleSubmitToGitHub = async () => {
    if (!questJson) {
      alert("No quest data loaded to submit.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to submit this quest as a Pull Request to GitHub?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch("http://localhost:42069/api/submit-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userID: UserID || "anonymous-user",
          questJson: questJson,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(
          `Successfully created Pull Request! You can view it here: ${data.prUrl}`
        );
        window.open(data.prUrl, "_blank"); // Open the PR in a new tab
      } else {
        throw new Error(data.error || "An unknown error occurred.");
      }
    } catch (err: any) {
      console.error("Failed to submit PR:", err);
      alert(`Error: Could not create Pull Request.\n\n${err.message}`);
    }
  };
  const updateQuestState = (newQuestState: QuestData) => {
    setQuestJson(newQuestState);
    setJsonString(JSON.stringify(newQuestState, null, 2));
  };
  const handleDeleteStep = () => {
    if (!questJson || questJson.questSteps.length <= 1) {
      alert("Cannot delete the last remaining step.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete Step ${
          selectedStep + 1
        }? This cannot be undone.`
      )
    ) {
      const nextState = produce(questJson, (draft) => {
        // Remove one element at the current selectedStep index
        draft.questSteps.splice(selectedStep, 1);
      });

      updateQuestState(nextState);

      // Adjust the selectedStep index if we deleted the last item in the array
      if (selectedStep >= nextState.questSteps.length) {
        setSelectedStep(nextState.questSteps.length - 1);
      }
    }
  };
  const handleSetRadiusMode = () => setCaptureMode("radius");
  const handleJsonTextChange = (text: string) => {
    setJsonString(text);
    try {
      const parsed = JSON.parse(text);
      setQuestJson(parsed);
    } catch (error) {
      /* ignore invalid json */
    }
  };
  const handleStepDescriptionView = () =>
    setStepDescriptionEdit((prev) => !prev);

  const handleStepIncrement = () => {
    if (!questJson) return;
    const newStepIndex = Math.min(
      selectedStep + 1,
      questJson.questSteps.length - 1
    );
    if (newStepIndex !== selectedStep) {
      const newStepData = questJson.questSteps[newStepIndex];
      setFloor(newStepData.floor ?? 0); // ✅ Sync floor view to new step's data
      setSelectedStep(newStepIndex);
    }
  };

  const handleStepDecrement = () => {
    if (!questJson) return;
    const newStepIndex = Math.max(selectedStep - 1, 0);
    if (newStepIndex !== selectedStep) {
      const newStepData = questJson.questSteps[newStepIndex];
      setFloor(newStepData.floor ?? 0); // ✅ Sync floor view to new step's data
      setSelectedStep(newStepIndex);
    }
  };

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
      const step = draft.questSteps[selectedStep];
      if (!step.highlights) step.highlights = {};
      if (!step.highlights[targetType]) step.highlights[targetType] = [];
      if (!step.highlights[targetType][targetIndex]) {
        if (targetType === "npc") {
          step.highlights.npc[targetIndex] = {
            npcName: "",
            npcLocation: { lat: 0, lng: 0 },
            wanderRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          };
        } else {
          step.highlights.object[targetIndex] = {
            name: "",
            objectLocation: [],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          };
        }
      }
      const target = step.highlights[targetType][targetIndex];
      if (targetType === "npc") target.npcName = newName;
      else target.name = newName;
    });
    updateQuestState(nextState);
  };

  const handleAddNpc = () => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step.highlights) step.highlights = {};
      if (!step.highlights.npc) step.highlights.npc = [];
      step.highlights.npc.push({
        npcName: "New NPC",
        npcLocation: { lat: 0, lng: 0 },
        wanderRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
      setTargetIndex(step.highlights.npc.length - 1);
      setTargetType("npc");
    });
    updateQuestState(nextState);
  };

  const handleResetNpcLocation = () => {
    if (!questJson || targetType !== "npc") return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.npc?.[targetIndex];
      if (target) {
        target.npcLocation = { lat: 0, lng: 0 };
      }
    });
    updateQuestState(nextState);
  };

  const handleWanderRadiusCapture = () => {
    setCaptureMode("wanderRadius");
  };

  const handleApplyRadius = () => {
    if (!questJson || targetType !== "npc") return;

    const target =
      questJson.questSteps[selectedStep].highlights.npc[targetIndex];
    const center = target?.npcLocation;

    if (!center || (center.lat === 0 && center.lng === 0)) {
      alert("No center point set for this NPC. Please set a location first.");
      return;
    }

    const radius = wanderRadiusInput;
    const nextState = produce(questJson, (draft) => {
      const draftTarget =
        draft.questSteps[selectedStep].highlights.npc[targetIndex];
      draftTarget.wanderRadius = {
        bottomLeft: { lat: center.lat - radius, lng: center.lng - radius },
        topRight: { lat: center.lat + radius, lng: center.lng + radius },
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

  const handleClearObjectLocations = () => {
    if (!questJson || targetType !== "object") return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep].highlights.object[targetIndex];
      if (target) {
        target.objectLocation = [];
      }
    });
    updateQuestState(nextState);
  };
  const handleFloorChange = (newFloor: number) => {
    if (HandleFloorIncreaseDecrease(newFloor)) {
      setFloor(newFloor);
      if (!questJson) return;
      const nextState = produce(questJson, (draft) => {
        const step = draft.questSteps[selectedStep];
        if (step) {
          step.floor = newFloor;
        }
      });
      updateQuestState(nextState);
    }
  };
  const handleFloorIncrement = () => handleFloorChange(floor + 1);
  const handleFloorDecrement = () => handleFloorChange(floor - 1);
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
        }
      } else if (data.type === "multi-point") {
        if (targetType === "object") {
          highlightTarget.objectLocation = data.payload;
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
  // --- FILE HANDLERS ---
  const handleFileLoadFromInput = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        handleJsonTextChange(text);
        setFileHandle(null);
        alert(
          "File loaded. Use 'Save As...' to save changes, as this file cannot be overwritten directly."
        );
      }
    };
    reader.readAsText(file);
  };

  const handleLoadFile = async () => {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        handleJsonTextChange(text);
        setFileHandle(handle);
      } catch (err) {
        console.error("User cancelled the file open dialog.");
      }
    } else {
      document.getElementById("json-file-loader")?.click();
    }
  };

  const handleSaveFile = async () => {
    if (!fileHandle) {
      alert(
        "No file is open to save to. Please use 'Save As...' or load a file first."
      );
      return;
    }
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      alert(`Saved changes to ${fileHandle.name}`);
    } catch (err) {
      console.error("Error saving file:", err);
      alert("Failed to save file. Please try using 'Save As...'.");
    }
  };

  const handleSaveAsFile = () => {
    if (!questJson) return;
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = questJson.questName
      ? `${questJson.questName.replace(/\s+/g, "_")}.json`
      : "quest_data.json";
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // --- MAP COMPONENTS ---
  const snapToTileCoordinate = (latlng: L.LatLng) => {
    const visualCenterX = Math.floor(latlng.lng - 0.5) + 0.5;
    const visualCenterY = Math.floor(latlng.lat + 0.5) - 0.5;
    const storedLng = visualCenterX - 0.5;
    const storedLat = visualCenterY + 0.5;
    return { lat: storedLat, lng: storedLng };
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const snappedCoord = snapToTileCoordinate(e.latlng);

        switch (captureMode) {
          case "single":
            handleDataCaptured({ type: "single", payload: snappedCoord });
            break;
          case "multi-point":
            if (targetType === "object") {
              const currentLocations =
                questJson?.questSteps[selectedStep]?.highlights.object[
                  targetIndex
                ]?.objectLocation || [];
              const isDuplicate = currentLocations.some(
                (loc: { lat: number; lng: number }) =>
                  loc.lat === snappedCoord.lat && loc.lng === snappedCoord.lng
              );

              if (isDuplicate) {
                return;
              }
              const newPoint = {
                ...snappedCoord,
                color: selectedObjectColor,
                numberLabel: objectNumberLabel,
              };
              const newLocations = [...currentLocations, newPoint];
              handleDataCaptured({
                type: "multi-point",
                payload: newLocations,
              });
            }
            break;
          case "radius":
            if (!firstCorner) {
              setFirstCorner(snappedCoord);
              return;
            }
            const minLat = Math.min(firstCorner.lat, snappedCoord.lat);
            const maxLat = Math.max(firstCorner.lat, snappedCoord.lat);
            const minLng = Math.min(firstCorner.lng, snappedCoord.lng);
            const maxLng = Math.max(firstCorner.lng, snappedCoord.lng);

            const radiusPayload = {
              bottomLeft: { lat: minLat, lng: minLng },
              topRight: { lat: maxLat, lng: maxLng },
            };
            handleDataCaptured({ type: "radius", payload: radiusPayload });
            setFirstCorner(null);
            setCaptureMode(targetType === "object" ? "multi-point" : "single");
            break;
          case "wanderRadius":
            const radius = wanderRadiusInput;
            handleDataCaptured({
              type: "wanderRadius",
              payload: {
                center: snappedCoord,
                wanderRadius: {
                  bottomLeft: {
                    lat: snappedCoord.lat - radius,
                    lng: snappedCoord.lng - radius,
                  },
                  topRight: {
                    lat: snappedCoord.lat + radius,
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
        keepBuffer: 8,
      },
      {
        name: "Walls",
        url: `https://runeapps.org/s3/map4/live/walls-${floor}/{z}/{x}-{y}.svg`,
        tileSize: 512,
        maxNativeZoom: 3,
        minNativeZoom: 3,
        updateWhenIdle: true,
        minZoom: -4,
        opacity: 0.6,
        className: "map-walls",
        updateInterval: 50,
        keepBuffer: 8,
      },
      {
        name: "Collision",
        url: `https://runeapps.org/s3/map4/live/collision-${floor}/{z}/{x}-{y}.png`,
        tileSize: 512,
        maxNativeZoom: 3,
        minNativeZoom: 3,
        updateWhenIdle: true,
        minZoom: -4,
        opacity: 0.6,
        className: "map-collision",
        updateInterval: 100,
        keepBuffer: 8,
      },
    ],
    [floor]
  );

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <EditorPanel
        onSubmitToGitHub={handleSubmitToGitHub}
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
        selectedStep={selectedStep}
        onStepChange={setSelectedStep}
        onStepIncrement={handleStepIncrement}
        onStepDecrement={handleStepDecrement}
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
        onClearObjectLocations={handleClearObjectLocations}
        selectedObjectColor={selectedObjectColor}
        onSelectedObjectColorChange={setSelectedObjectColor}
        onSetRadiusMode={handleSetRadiusMode}
        onResetNpcLocation={handleResetNpcLocation}
        objectNumberLabel={objectNumberLabel}
        onObjectNumberLabelChange={setObjectNumberLabel}
        onFileLoadFromInput={handleFileLoadFromInput}
        onLoadFile={handleLoadFile}
        onSaveFile={handleSaveFile}
        onSaveAsFile={handleSaveAsFile}
        selectEditDescription={stepDescriptionEdit}
        onSelectEditStepDescription={handleStepDescriptionView}
        onAddNpc={handleAddNpc}
        onDeleteStep={handleDeleteStep}
        onFloorDecrement={handleFloorDecrement}
        onFloorIncrement={handleFloorIncrement}
      />
      <MapContainer
        crs={gameMapOptions().crs}
        bounds={bound}
        id="map"
        zoom={zoom}
        maxBounds={gameMapOptions().maxBounds}
        zoomSnap={gameMapOptions().zoomSnap}
        zoomControl={false}
        dragging={true}
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
          <div className="floorButtonContainer">
            <button
              className="floor-button floor-button--up"
              onClick={handleFloorIncrement}
            >
              ↑
            </button>
            <div className="floor-display">Floor {floor}</div>
            <button
              className="floor-button floor-button--down"
              onClick={handleFloorDecrement}
            >
              ↓
            </button>
          </div>
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
        <StepSnapHandler questJson={questJson} selectedStep={selectedStep} />
        <SelectionHighlightLayer geometry={selectionGeometry} />
        <GridLayer />
        <HighlightLayer onCursorMove={handleCursorMove} />
      </MapContainer>
    </div>
  );
};

export default App;
