import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import {
  parseWikiImageUrl,
  resizeImageBlob,
} from "Map Classes/Map Components/imageUtils";
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
import StepSnapHandler from "./../Map Classes/Map Components/StepSnapHandler";
import { SelectionHighlightLayer } from "./../Map Classes/Map Components/SelectionHighlightLayer";
import type { SelectionGeometry } from "./../Map Classes/Map Components/SelectionHighlightLayer";
import { IconGridDots, IconSettings } from "@tabler/icons-react";
import { NpcSearch } from "./../Map Classes/Map Components/NpcSearch";
import type { Npc } from "./../Map Classes/Map Components/NpcSearch";
import NpcFlyToHandler from "./../Map Classes/Map Components/NpcFlyToHandler";
import { MapAreaSearch } from "./../Map Classes/Map Components/MapAreaSearch";
import MapAreaFlyToHandler from "./../Map Classes/Map Components/MapAreaFlyToHandler";
import { ObjectSearch } from "./../Map Classes/Map Components/ObjectSearch";
import type { MapObject } from "./../Map Classes/Map Components/ObjectSearch";
import ObjectFlyToHandler from "./../Map Classes/Map Components/ObjectFlyToHandler";
import SelectedObjectFlyToHandler from "./../Map Classes/Map Components/SelectedObjectFlyToHandler";

// --- INTERFACES ---
interface QuestData {
  questName: string;
  questSteps: any[];
}

interface QuestImageData {
  step: number;
  src: string;
  height: number;
  width: number;
  stepDescription: string;
}

interface QuestImageFile {
  name: string;
  images: QuestImageData[];
}

interface ChatheadOverrides {
  [key: string]: string;
}
interface MapArea {
  mapId: number;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  name: string;
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
  const [selectedObjectFromSearch, setSelectedObjectFromSearch] =
    useState<MapObject | null>(null);
  const [highlightedObject, setHighlightedObject] = useState<MapObject | null>(
    null
  );
  const [selectedArea, setSelectedArea] = useState<MapArea | null>(null);
  const [highlightedNpc, setHighlightedNpc] = useState<Npc | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
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
  const [chatheadOverrides, setChatheadOverrides] = useState<ChatheadOverrides>(
    {}
  );
  const [isAlt1Environment, setIsAlt1Environment] = useState(false);
  const [questImageList, setQuestImageList] = useState<QuestImageFile[]>([]);
  const [chatheadOverridesString, setChatheadOverridesString] = useState("");
  const [questImageListString, setQuestImageListString] = useState("");
  const [chatheadOverridesFileHandle, setChatheadOverridesFileHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [questImageListFileHandle, setQuestImageListFileHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [imageDirectoryHandle, setImageDirectoryHandle] = useState<any | null>(
    null
  );
  const [showGrids, setShowGrids] = useState(true);
  // --- NEW: State for area search mode ---
  const [isObjectAreaSearch, setIsObjectAreaSearch] = useState(false);
  const [areaSearchResults, setAreaSearchResults] = useState<MapObject[]>([]);

  // --- DERIVED VALUES ---
  const selectionGeometry = useMemo<SelectionGeometry>(() => {
    if (!questJson?.questSteps?.[selectedStep]) return { type: "none" };
    const step = questJson.questSteps[selectedStep];
    if (targetType === "npc") {
      return { type: "npc", npcArray: step.highlights?.npc || [] };
    } else if (targetType === "object") {
      return { type: "object", objectArray: step.highlights?.object || [] };
    }
    return { type: "none" };
  }, [questJson, selectedStep, targetType]);

  const highlightGeometry = useMemo<SelectionGeometry>(() => {
    if (selectedObjectFromSearch) {
      return {
        type: "object",
        objectArray: [
          {
            name: selectedObjectFromSearch.name,
            objectLocation: [
              {
                lat: selectedObjectFromSearch.lat,
                lng: selectedObjectFromSearch.lng,
                isSelected: true,
              },
            ],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }
    if (highlightedNpc) {
      return {
        type: "npc",
        npcArray: [
          {
            npcName: highlightedNpc.name,
            npcLocation: { lat: highlightedNpc.lat, lng: highlightedNpc.lng },
            wanderRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }
    if (highlightedObject) {
      return {
        type: "object",
        objectArray: [
          {
            name: highlightedObject.name,
            objectLocation: [
              {
                lat: highlightedObject.lat,
                lng: highlightedObject.lng,
                color: "#00FFFF",
              },
            ],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }
    return { type: "none" };
  }, [selectedObjectFromSearch, highlightedNpc, highlightedObject]);

  const targetNameValue = useMemo(() => {
    if (!questJson?.questSteps?.[selectedStep]) return "";
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

  const currentTargetObjectData = useMemo(() => {
    if (!questJson?.questSteps?.[selectedStep]) {
      return { color: selectedObjectColor, numberLabel: objectNumberLabel };
    }
    if (targetType === "object") {
      const target =
        questJson.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      return {
        color: target?.color || selectedObjectColor,
        numberLabel: target?.numberLabel || "",
      };
    }
    return { color: selectedObjectColor, numberLabel: objectNumberLabel };
  }, [
    questJson,
    selectedStep,
    targetIndex,
    targetType,
    selectedObjectColor,
    objectNumberLabel,
  ]);

  // --- EFFECTS ---
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
      setTargetIndex(0);
    }
  }, [selectedStep, questJson]);

  useEffect(() => {
    if (window.alt1) {
      setIsAlt1Environment(true);
    }
  }, []);

  useEffect(() => {
    if (!questJson) return;
    const step = questJson.questSteps[selectedStep];
    if (!step) return;
    const arr = step.highlights?.[targetType] || [];
    if (targetIndex >= arr.length) {
      setTargetIndex(Math.max(0, arr.length - 1));
    }
  }, [questJson, selectedStep, targetType, targetIndex]);

  useEffect(() => {
    if (targetType === "object") {
      setCaptureMode("multi-point");
    } else {
      setCaptureMode("single");
    }
  }, [targetType]);

  // --- HANDLERS ---
  const toggleShowGrids = () => setShowGrids((prev) => !prev);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(
      `Direct save failed. Downloading ${fileName} instead. Please save it to the correct location.`
    );
  };

  const saveContentToFileHandle = async (
    handle: FileSystemFileHandle | null,
    content: string,
    fileName: string
  ) => {
    const blob = new Blob([content], { type: "application/json" });
    if (!handle) {
      downloadBlob(blob, fileName);
      return;
    }
    try {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (err) {
      console.error("Direct save failed, falling back to download:", err);
      downloadBlob(blob, fileName);
    }
  };

  const handleSaveChatheadOverrides = () => {
    saveContentToFileHandle(
      chatheadOverridesFileHandle,
      chatheadOverridesString,
      "chatheadOverrides.json"
    );
  };

  const handleSaveQuestImageList = () => {
    saveContentToFileHandle(
      questImageListFileHandle,
      questImageListString,
      "QuestImageList.json"
    );
  };

  const handleSaveChatheadOverridesAs = () => {
    const blob = new Blob([chatheadOverridesString], {
      type: "application/json",
    });
    downloadBlob(blob, "chatheadOverrides.json");
  };

  const handleSaveQuestImageListAs = () => {
    const blob = new Blob([questImageListString], {
      type: "application/json",
    });
    downloadBlob(blob, "QuestImageList.json");
  };

  const processAndSaveImage = async (imageBlob: Blob) => {
    if (!questJson) {
      alert("Please load a quest first.");
      return;
    }
    if (!imageDirectoryHandle) {
      alert("Please select an image save directory first.");
      return;
    }
    try {
      const {
        blob: resizedBlob,
        width,
        height,
      } = await resizeImageBlob(imageBlob, 512);
      const stepDescription =
        questJson.questSteps[selectedStep]?.stepDescription;
      if (!stepDescription) {
        alert("Current step has no description to link the image to.");
        return;
      }
      const fileName = `${questJson.questName}_step_${selectedStep + 1}.webp`;
      try {
        const fileHandle = await imageDirectoryHandle.getFileHandle(fileName, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(resizedBlob);
        await writable.close();
      } catch (err) {
        console.error(
          "Direct image save failed, falling back to download:",
          err
        );
        downloadBlob(resizedBlob, fileName);
      }
      const imagePath = `${fileName}`;
      const nextState = produce(questImageList, (draft: QuestImageFile[]) => {
        let questEntry = draft.find((q) => q.name === questJson.questName);
        const newImageObject: QuestImageData = {
          step: selectedStep + 1,
          src: imagePath,
          height,
          width,
          stepDescription,
        };
        if (questEntry) {
          const existingImageIndex = questEntry.images.findIndex(
            (img) => img.stepDescription === stepDescription
          );
          if (existingImageIndex > -1) {
            questEntry.images[existingImageIndex] = newImageObject;
          } else {
            questEntry.images.push(newImageObject);
          }
        } else {
          draft.push({
            name: questJson.questName,
            images: [newImageObject],
          });
        }
      });
      setQuestImageList(nextState);
      const newString = JSON.stringify(nextState, null, 2);
      setQuestImageListString(newString);
      saveContentToFileHandle(
        questImageListFileHandle,
        newString,
        "QuestImageList.json"
      );
    } catch (error) {
      console.error("Failed to process and save image:", error);
      alert(`Failed to process image. See console for details.`);
    }
  };

  const handleObjectHighlight = (obj: MapObject | null) => {
    setHighlightedObject(obj);
  };

  const handleObjectSearchSelect = (chosenObject: MapObject) => {
    setSelectedObjectFromSearch(chosenObject);
    if (!questJson || targetType !== "object") {
      alert("Please select 'Object' as the target type first to edit.");
      return;
    }
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      if (target) {
        target.name = chosenObject.name;
        if (!target.objectLocation || target.objectLocation.length === 0) {
          target.objectLocation = [];
        }
        target.objectLocation[0] = {
          lat: chosenObject.lat,
          lng: chosenObject.lng,
        };
        draft.questSteps[selectedStep].floor = chosenObject.floor;
      }
    });
    updateQuestState(nextState);
  };

  const handleImagePaste = async (pastedBlob: Blob) => {
    await processAndSaveImage(pastedBlob);
  };

  const handleAddStepImage = async (url: string) => {
    if (!url) return;
    try {
      const response = await fetch(parseWikiImageUrl(url));
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const imageBlob = await response.blob();
      await processAndSaveImage(imageBlob);
    } catch (error) {
      console.error("Failed to add step image from URL:", error);
      alert(`Failed to add step image from URL. See console for details.`);
    }
  };

  const handleLoadChatheadOverrides = async () => {
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
      setChatheadOverrides(JSON.parse(text));
      setChatheadOverridesString(text);
      setChatheadOverridesFileHandle(handle);
    } catch (err) {
      console.error("Error loading chathead overrides:", err);
    }
  };

  const handleAddChatheadOverride = (name: string, url: string) => {
    if (!name || !url) return;
    const nextState = produce(chatheadOverrides, (draft) => {
      draft[name] = url;
    });
    setChatheadOverrides(nextState);
    const newString = JSON.stringify(nextState, null, 2);
    setChatheadOverridesString(newString);
    saveContentToFileHandle(
      chatheadOverridesFileHandle,
      newString,
      "chatheadOverrides.json"
    );
  };

  const handleLoadQuestImageList = async () => {
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
      setQuestImageList(JSON.parse(text));
      setQuestImageListString(text);
      setQuestImageListFileHandle(handle);
    } catch (err) {
      console.error("Error loading quest image list:", err);
    }
  };

  const handleSelectImageDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setImageDirectoryHandle(handle);
      alert(`Image directory set to: ${handle.name}`);
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const handleDeleteNpc = () => {
    if (!questJson || targetType !== "npc") return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step?.highlights?.npc) return;
      step.highlights.npc.splice(targetIndex, 1);
      if (targetIndex >= step.highlights.npc.length) {
        setTargetIndex(Math.max(0, step.highlights.npc.length - 1));
      }
    });
    updateQuestState(nextState);
  };

  const handleDeleteObject = () => {
    if (!questJson || targetType !== "object") return;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step?.highlights?.object) return;
      step.highlights.object.splice(targetIndex, 1);
      if (targetIndex >= step.highlights.object.length) {
        setTargetIndex(Math.max(0, step.highlights.object.length - 1));
      }
    });
    updateQuestState(nextState);
  };

  const handleSelectedObjectColorChange = (newColor: string) => {
    setSelectedObjectColor(newColor);
    if (questJson && targetType === "object") {
      const nextState = produce(questJson, (draft) => {
        const target =
          draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
        if (target) {
          target.color = newColor;
        }
      });
      updateQuestState(nextState);
    }
  };

  const handleObjectNumberLabelChange = (newLabel: string) => {
    setObjectNumberLabel(newLabel);
    if (questJson && targetType === "object") {
      const nextState = produce(questJson, (draft) => {
        const target =
          draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
        if (target) {
          target.numberLabel = newLabel;
        }
      });
      updateQuestState(nextState);
    }
  };

  const handleFloorChange = useCallback(
    (newFloor: number) => {
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
    },
    [questJson, selectedStep]
  );

  const handleNpcSearchSelect = (chosenNpc: Npc) => {
    if (!questJson) return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.npc?.[targetIndex];
      if (target) {
        target.npcName = chosenNpc.name;
        target.npcLocation = { lat: chosenNpc.lat, lng: chosenNpc.lng };
        draft.questSteps[selectedStep].floor = chosenNpc.floor;
      }
    });
    updateQuestState(nextState);
    setHighlightedNpc(null);
  };

  const handleNpcHighlight = (npc: Npc | null) => {
    setHighlightedNpc(npc);
  };

  const handleNewQuest = () => {
    const newQuestTemplate: QuestData = {
      questName: "New Quest",
      questSteps: [
        {
          stepDescription: "This is the first step of your new quest.",
          itemsNeeded: [],
          itemsRecommended: [],
          additionalStepInformation: [],
          highlights: {
            npc: [
              {
                npcName: "",
                npcLocation: { lat: 0, lng: 0 },
                wanderRadius: {
                  bottomLeft: { lat: 0, lng: 0 },
                  topRight: { lat: 0, lng: 0 },
                },
              },
            ],
            object: [
              {
                name: "",
                objectLocation: [],
                objectRadius: {
                  bottomLeft: { lat: 0, lng: 0 },
                  topRight: { lat: 0, lng: 0 },
                },
              },
            ],
          },
          floor: 0,
        },
      ],
    };
    updateQuestState(newQuestTemplate);
    setSelectedStep(0);
    setTargetIndex(0);
    setTargetType("npc");
    setFileHandle(null);
  };

  const handleAddObject = () => {
    if (!questJson) return;
    let newIndex = 0;
    const nextState = produce(questJson, (draft) => {
      const step = draft.questSteps[selectedStep];
      if (!step.highlights) step.highlights = {};
      if (!step.highlights.object) step.highlights.object = [];
      step.highlights.object.push({
        name: "New Object",
        objectLocation: [{ lat: 0, lng: 0 }],
        objectRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
      newIndex = step.highlights.object.length - 1;
    });
    updateQuestState(nextState);
    setTargetType("object");
    setTargetIndex(newIndex);
  };

  const handleAddStep = () => {
    if (!questJson) return;
    const newStepObject = {
      stepDescription: "New step description...",
      itemsNeeded: [],
      itemsRecommended: [],
      additionalStepInformation: [],
      highlights: {
        npc: [
          {
            npcName: "",
            npcLocation: { lat: 0, lng: 0 },
            wanderRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
        object: [
          {
            name: "",
            objectLocation: [{ lat: 0, lng: 0 }],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      },
      floor: floor,
    };
    const nextState = produce(questJson, (draft) => {
      draft.questSteps.splice(selectedStep + 1, 0, newStepObject);
    });
    updateQuestState(nextState);
    setSelectedStep(selectedStep + 1);
  };

  const handleSubmitToGitHub = async () => {
    if (!questJson) return;
    try {
      const response = await fetch("http://localhost:42069/api/submit-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userID: UserID || "anonymous-user",
          questJson: questJson,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        window.open(data.prUrl, "_blank");
      } else {
        throw new Error(data.error || "An unknown error occurred.");
      }
    } catch (err: any) {
      console.error("Failed to submit PR:", err);
    }
  };

  const updateQuestState = (newQuestState: QuestData) => {
    setQuestJson(newQuestState);
    setJsonString(JSON.stringify(newQuestState, null, 2));
  };

  const handleDeleteStep = () => {
    if (!questJson || questJson.questSteps.length <= 1) return;
    const nextState = produce(questJson, (draft) => {
      draft.questSteps.splice(selectedStep, 1);
    });
    updateQuestState(nextState);
    if (selectedStep >= nextState.questSteps.length) {
      setSelectedStep(nextState.questSteps.length - 1);
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

  const handleAreaSelect = (area: MapArea) => {
    setSelectedArea(area);
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
      setFloor(newStepData.floor ?? 0);
      setSelectedStep(newStepIndex);
    }
  };

  const handleStepDecrement = () => {
    if (!questJson) return;
    const newStepIndex = Math.max(selectedStep - 1, 0);
    if (newStepIndex !== selectedStep) {
      const newStepData = questJson.questSteps[newStepIndex];
      setFloor(newStepData.floor ?? 0);
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
      const target =
        draft.questSteps[selectedStep].highlights[targetType][targetIndex];
      if (!target) return;
      if (targetType === "npc") {
        target.npcName = newName;
      } else {
        target.name = newName;
      }
    });
    updateQuestState(nextState);
  };

  const handleAddNpc = () => {
    if (!questJson) return;
    let newIndex = 0;
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
      newIndex = step.highlights.npc.length - 1;
    });
    updateQuestState(nextState);
    setTargetType("npc");
    setTargetIndex(newIndex);
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
    if (!center || (center.lat === 0 && center.lng === 0)) return;
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
          highlightTarget.color = selectedObjectColor;
          highlightTarget.numberLabel = objectNumberLabel;
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
      handleSaveAsFile();
      return;
    }
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      alert(`Saved changes to ${fileHandle.name}`);
    } catch (err) {
      console.error(
        "File System Access API failed, falling back to download:",
        err
      );
      handleSaveAsFile();
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
              if (isDuplicate) return;
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

        // --- NEW: Handle Object Area Search ---
        if (isObjectAreaSearch) {
          console.log("Area search click detected at:", snappedCoord);
          const searchRadius = 10; // 10 tiles in each direction
          const bounds = {
            minLng: snappedCoord.lng - searchRadius,
            maxLng: snappedCoord.lng + searchRadius,
            minLat: snappedCoord.lat - searchRadius,
            maxLat: snappedCoord.lat + searchRadius,
          };

          // BROAD PHASE: Calculate which chunks the search area overlaps with
          const chunksToFetch = new Set<string>();
          const chunkSize = 64;
          const startChunkX = Math.floor(bounds.minLng / chunkSize);
          const endChunkX = Math.floor(bounds.maxLng / chunkSize);
          const startChunkY = Math.floor(bounds.minLat / chunkSize);
          const endChunkY = Math.floor(bounds.maxLat / chunkSize);

          for (let x = startChunkX; x <= endChunkX; x++) {
            for (let y = startChunkY; y <= endChunkY; y++) {
              chunksToFetch.add(`chunk_${x}_${y}`);
            }
          }

          // Fetch all required chunk files concurrently
          const promises = Array.from(chunksToFetch).map((chunkId) =>
            fetch(`/Objects_By_Chunks/${chunkId}.json`).then((res) =>
              // Gracefully handle chunks with no objects (404)
              res.ok ? res.json() : Promise.resolve([])
            )
          );

          Promise.all(promises).then((results) => {
            const allObjectsInChunks = results.flat();

            // NARROW PHASE: Filter objects to be within the precise bounds
            const finalResults = allObjectsInChunks.filter(
              (obj: MapObject) =>
                obj.lng >= bounds.minLng &&
                obj.lng <= bounds.maxLng &&
                obj.lat >= bounds.minLat &&
                obj.lat <= bounds.maxLat
            );

            console.log(`Found ${finalResults.length} objects in the area.`);
            setAreaSearchResults(finalResults);
          });

          // Deactivate area search mode after the click
          setIsObjectAreaSearch(false);
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
        questJson={questJson}
        isOpen={isPanelOpen}
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
        onClearObjectLocations={handleClearObjectLocations}
        selectedObjectColor={currentTargetObjectData.color}
        onSelectedObjectColorChange={handleSelectedObjectColorChange}
        objectNumberLabel={currentTargetObjectData.numberLabel}
        onObjectNumberLabelChange={handleObjectNumberLabelChange}
        onSetRadiusMode={handleSetRadiusMode}
        onResetNpcLocation={handleResetNpcLocation}
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
        onAddStep={handleAddStep}
        onNewQuest={handleNewQuest}
        onAddObject={handleAddObject}
        onDeleteNpc={handleDeleteNpc}
        onDeleteObject={handleDeleteObject}
        onAddChatheadOverride={handleAddChatheadOverride}
        onAddStepImage={handleAddStepImage}
        onLoadChatheadOverrides={handleLoadChatheadOverrides}
        onSaveChatheadOverrides={handleSaveChatheadOverrides}
        onLoadQuestImageList={handleLoadQuestImageList}
        onSaveQuestImageList={handleSaveQuestImageList}
        onSelectImageDirectory={handleSelectImageDirectory}
        imageDirectoryName={imageDirectoryHandle?.name || ""}
        onImagePaste={handleImagePaste}
        onSaveChatheadOverridesAs={handleSaveChatheadOverridesAs}
        onSaveQuestImageListAs={handleSaveQuestImageListAs}
        isAlt1Environment={isAlt1Environment}
      >
        <div className="panel-section">
          <NpcSearch
            onNpcSelect={handleNpcSearchSelect}
            onNpcHighlight={handleNpcHighlight}
          />
        </div>
        <div className="panel-section">
          <ObjectSearch
            onObjectSelect={handleObjectSearchSelect}
            onObjectHighlight={handleObjectHighlight}
            isAreaSearchActive={isObjectAreaSearch}
            onToggleAreaSearch={setIsObjectAreaSearch}
            areaSearchResults={areaSearchResults}
            onClearAreaSearchResults={() => setAreaSearchResults([])}
          />
        </div>
        <div className="panel-section">
          <MapAreaSearch onAreaSelect={handleAreaSelect} />
        </div>
      </EditorPanel>
      <button
        className={`panel-toggle-button ${isPanelOpen ? "is-open" : ""}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        title={isPanelOpen ? "Collapse Panel" : "Expand Panel"}
      >
        {isPanelOpen ? "‹" : "›"}
      </button>
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
        {showGrids && <ChunkGridLayer />}
        <GridLayer />
        <div className="cursor-coordinates-box">
          <div className="coordinate-row">
            <span>Zoom: {Math.round(zoom)}</span>
            <span>X: {cursorX}</span>
            <span>Y: {cursorY}</span>
            <span>
              <IconSettings />
            </span>
          </div>
        </div>
        <div className="grid-toggle-container">
          <button
            className="floor-button"
            onClick={toggleShowGrids}
            title="Toggle Grids"
          >
            <IconGridDots size={20} />
          </button>
        </div>
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
        <MapAreaFlyToHandler selectedArea={selectedArea} />
        <StepSnapHandler
          questJson={questJson}
          selectedStep={selectedStep}
          targetIndex={targetIndex}
          targetType={targetType}
        />
        <NpcFlyToHandler
          highlightedNpc={highlightedNpc}
          onFloorChange={handleFloorChange}
        />
        <ObjectFlyToHandler
          highlightedObject={highlightedObject}
          onFloorChange={handleFloorChange}
        />
        <SelectedObjectFlyToHandler
          selectedObject={selectedObjectFromSearch}
          onFloorChange={handleFloorChange}
        />
        <SelectionHighlightLayer
          geometry={
            selectedObjectFromSearch || highlightedNpc || highlightedObject
              ? highlightGeometry
              : selectionGeometry
          }
        />
        <HighlightLayer onCursorMove={handleCursorMove} />
      </MapContainer>
    </div>
  );
};

export default App;
