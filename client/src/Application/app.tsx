import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import {
  parseWikiImageUrl,
  processImageBlobToWebp,
} from "Map Classes/Map Components/imageUtils";
import "leaflet/dist/leaflet.css";
import "./../Assets/CSS/index.css";
import "./../Assets/CSS/leafless.css";
import { latLng, LatLngBounds } from "leaflet";
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
import { TargetFlyToHandler } from "Map Classes/Map Components/TargetFlyToHandler";
import { MapUIOverlay } from "Map Classes/Map Components/MapUIOverlay";
import { CustomMapPanes } from "Map Classes/Map Components/CustomMapPanes";
import html2canvas from "html2canvas";
// ADD: Import the new CaptureHandler
// --- INTERFACES ---
interface ClipboardItem {
  type: "npc" | "object" | "npc-list" | "object-list" | "none";
  data: any | any[] | null;
}

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
const convertManualCoordToVisual = (coord: { lat: number; lng: number }) => {
  if (
    !coord ||
    typeof coord.lat !== "number" ||
    typeof coord.lng !== "number"
  ) {
    return undefined;
  }
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng + 0.5;
  return { lat: visualY, lng: visualX };
};

const convertSearchedObjectCoordToVisual = (coord: {
  lat: number;
  lng: number;
}) => {
  if (
    !coord ||
    typeof coord.lat !== "number" ||
    typeof coord.lng !== "number"
  ) {
    return undefined;
  }
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng - 0.5;
  return { lat: visualY, lng: visualX };
};

const convertSearchedNPCCoordToVisual = (coord: {
  lat: number;
  lng: number;
}) => {
  if (
    !coord ||
    typeof coord.lat !== "number" ||
    typeof coord.lng !== "number"
  ) {
    return undefined;
  }
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng + 0.5;
  return { lat: visualY, lng: visualX };
};
const MAP_OPTIONS = gameMapOptions();
const MAP_BOUNDS: LatLngBounds = bounds();
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
  const [clipboard, setClipboard] = useState<ClipboardItem>({
    type: "none",
    data: null,
  });
  const [selectedObjectFromSearch, setSelectedObjectFromSearch] =
    useState<MapObject | null>(null);
  const [highlightedObject, setHighlightedObject] = useState<MapObject | null>(
    null
  );
  const [selectedArea, setSelectedArea] = useState<MapArea | null>(null);
  const [highlightedNpc, setHighlightedNpc] = useState<Npc | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [selectedObjectColor, setSelectedObjectColor] = useState("#00FF00");
  const [floor, setFloor] = useState(level ? parseInt(level, 10) : 0);
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

  // --- Replace the selectionGeometry useMemo hook ---
  const selectionGeometry = useMemo<SelectionGeometry>(() => {
    if (!questJson?.questSteps?.[selectedStep]) return { type: "none" };
    const step = questJson.questSteps[selectedStep];

    // This data is ALWAYS hand-placed, so we use the manual conversion.
    if (targetType === "npc") {
      const convertedNpcs = (step.highlights?.npc || [])
        .map((npc: any) => {
          const visualLocation = convertManualCoordToVisual(npc.npcLocation);
          if (!visualLocation) return null;
          return { ...npc, npcLocation: visualLocation };
        })
        .filter(Boolean);
      return { type: "npc", npcArray: convertedNpcs };
    } else if (targetType === "object") {
      const convertedObjects = (step.highlights?.object || []).map(
        (obj: any) => {
          const validLocations = (obj.objectLocation || [])
            .map((loc: any) => {
              const conversionFn = loc.isSearched
                ? convertSearchedObjectCoordToVisual
                : convertManualCoordToVisual;
              const visualCoords = conversionFn(loc);
              if (!visualCoords) {
                return null; // Mark for removal
              }
              return {
                ...loc,
                lat: visualCoords.lat,
                lng: visualCoords.lng,
              };
            })
            .filter(Boolean); // Remove null entries
          return {
            ...obj,
            objectLocation: validLocations,
          };
        }
      );
      return { type: "object", objectArray: convertedObjects };
    }
    return { type: "none" };
  }, [questJson, selectedStep, targetType]);

  const highlightGeometry = useMemo<SelectionGeometry>(() => {
    // This data is ALWAYS from a search, so we use the searched conversion.
    if (selectedObjectFromSearch) {
      return {
        type: "object",
        objectArray: [
          {
            name: selectedObjectFromSearch.name,
            objectLocation: [
              convertSearchedObjectCoordToVisual(selectedObjectFromSearch),
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
            npcLocation: convertSearchedNPCCoordToVisual(highlightedNpc),
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
                ...convertSearchedObjectCoordToVisual(highlightedObject),
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
  }, [selectedStep]);

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
  const handleCopyTargetList = () => {
    if (!questJson) return;
    const listToCopy =
      questJson.questSteps[selectedStep]?.highlights?.[targetType];

    if (listToCopy && listToCopy.length > 0) {
      // Deep copy the entire array
      const copiedData = JSON.parse(JSON.stringify(listToCopy));
      setClipboard({
        type: `${targetType}-list`, // e.g., "npc-list"
        data: copiedData,
      });
      console.log(`Copied ${copiedData.length} ${targetType}s to clipboard.`);
    } else {
      console.log(`There are no ${targetType}s in this step to copy.`);
    }
  };
  const handlePasteTargetList = () => {
    if (!clipboard.type.endsWith("-list")) {
      console.log("Clipboard does not contain a list.");
      return;
    }

    // Extract base type ("npc" or "object") from clipboard type ("npc-list")
    const clipboardBaseType = clipboard.type.replace("-list", "");

    const nextState = produce(questJson, (draft) => {
      if (draft) {
        // Replace the entire array for the corresponding type in the current step
        draft.questSteps[selectedStep].highlights[clipboardBaseType] =
          clipboard.data;
      }
    });
    updateQuestState(nextState);
    console.log(`Pasted ${clipboard.data.length} ${clipboardBaseType}s.`);
  };
  const handleCopyTarget = () => {
    if (!questJson) return;
    const itemToCopy =
      questJson.questSteps[selectedStep]?.highlights?.[targetType]?.[
        targetIndex
      ];

    if (itemToCopy) {
      // Use JSON stringify/parse for a deep copy to prevent reference issues
      const copiedData = JSON.parse(JSON.stringify(itemToCopy));
      setClipboard({
        type: targetType,
        data: copiedData,
      });
      console.log(
        `Copied ${targetType}: ${copiedData.name || copiedData.npcName}`
      );
    }
  };
  const handlePasteTarget = () => {
    if (clipboard.type === "none" || clipboard.type !== targetType) {
      console.log(
        `Cannot paste. Clipboard is empty or type mismatch (Clipboard: ${clipboard.type}, Target: ${targetType})`
      );
      return;
    }

    const nextState = produce(questJson, (draft) => {
      if (draft) {
        draft.questSteps[selectedStep].highlights[targetType][targetIndex] =
          clipboard.data;
      }
    });
    updateQuestState(nextState);
  };
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
    console.log(
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
      console.log("Please load a quest first.");
      return;
    }
    if (!imageDirectoryHandle) {
      console.log("Please select an image save directory first.");
      return;
    }
    try {
      // CHANGE: Call the new function that conditionally resizes and converts to WebP.
      const {
        blob: processedBlob,
        width,
        height,
      } = await processImageBlobToWebp(imageBlob);

      const stepDescription =
        questJson.questSteps[selectedStep]?.stepDescription;
      if (!stepDescription) {
        console.log("Current step has no description to link the image to.");
        return;
      }

      const currentStepNumber = selectedStep + 1;
      let newImageIndex = 1;

      const questImages = questImageList.find(
        (q) => q.name === questJson.questName
      );

      if (questImages) {
        const imagesForThisStep = questImages.images.filter(
          (img) => img.step === currentStepNumber
        );

        if (imagesForThisStep.length > 0) {
          const maxSuffix = Math.max(
            0,
            ...imagesForThisStep.map((img) => {
              // Look for either .webp or .png to be safe
              const match = img.src.match(/_(\d+)\.(webp|png)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
          );
          newImageIndex = maxSuffix + 1;
        }
      }

      // CHANGE: Ensure the file is saved with the .webp extension.
      const fileName = `${questJson.questName
        .normalize("NFKC")
        .replace(" ", "")
        .replace(" ", "")
        .replace(" ", "")
        .replace(" ", "")
        .replace(" ", "")
        .replace(":", "")}_step_${currentStepNumber}_${newImageIndex}.webp`;

      try {
        const fileHandle = await imageDirectoryHandle.getFileHandle(fileName, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(processedBlob);
        await writable.close();
      } catch (err) {
        console.error(
          "Direct image save failed, falling back to download:",
          err
        );
        downloadBlob(processedBlob, fileName);
      }

      const imagePath = `${fileName}`;
      const nextState = produce(questImageList, (draft: QuestImageFile[]) => {
        let questEntry = draft.find((q) => q.name === questJson.questName);
        const newImageObject: QuestImageData = {
          step: currentStepNumber,
          src: imagePath,
          height,
          width,
          stepDescription,
        };

        if (questEntry) {
          questEntry.images.push(newImageObject);
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
      console.log(`Failed to process image. See console for details.`);
    }
  };

  const handleObjectHighlight = (obj: MapObject | null) => {
    setHighlightedObject(obj);
  };

  const handleObjectSearchSelect = (chosenObject: MapObject) => {
    handleFloorChange(chosenObject.floor);

    if (!questJson || targetType !== "object") {
      alert("Please select 'Object' as the target type first to edit.");
      return;
    }
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      if (target) {
        target.name = chosenObject.name;
        target.objectLocation = [
          {
            lat: chosenObject.lat,
            lng: chosenObject.lng,
            color: "#FFFFFF",
            numberLabel: "",
            isSearched: true,
          },
        ];
        draft.questSteps[selectedStep].floor = chosenObject.floor;
      }
    });
    updateQuestState(nextState);

    setHighlightedObject(null);
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
      console.log(
        `Failed to add step image from URL. See console for details.`
      );
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
      console.log(`Image directory set to: ${handle.name}`);
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
        objectLocation: [],
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

    if (!center || (center.lat === 0 && center.lng === 0)) {
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

  const handleDeleteObjectLocation = (locationIndexToDelete: number) => {
    if (!questJson || targetType !== "object") return;
    const nextState = produce(questJson, (draft) => {
      const target =
        draft.questSteps[selectedStep]?.highlights.object?.[targetIndex];
      if (target?.objectLocation) {
        target.objectLocation.splice(locationIndexToDelete, 1);
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
      console.log(`Saved changes to ${fileHandle.name}`);
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

  const MapClickHandler = ({ disabled }: { disabled: boolean }) => {
    useMapEvents({
      click: (e) => {
        if (disabled) {
          return;
        }
        const snappedCoord = snapToTileCoordinate(e.latlng);
        if (isObjectAreaSearch) {
          console.log("Area search click detected at:", snappedCoord);
          const searchRadius = 10;
          const bounds = {
            minLng: snappedCoord.lng - searchRadius,
            maxLng: snappedCoord.lng + searchRadius,
            minLat: snappedCoord.lat - searchRadius,
            maxLat: snappedCoord.lat + searchRadius,
          };

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

          const promises = Array.from(chunksToFetch).map((chunkId) =>
            fetch(`/Objects_By_Chunks/${chunkId}.json`).then((res) =>
              res.ok ? res.json() : Promise.resolve([])
            )
          );

          Promise.all(promises).then((results) => {
            const allObjectsInChunks = results.flat();
            const finalResults = allObjectsInChunks.filter(
              (obj: MapObject) =>
                obj.lng >= bounds.minLng &&
                obj.lng <= bounds.maxLng &&
                obj.lat >= bounds.minLat &&
                obj.lat <= bounds.maxLat
            );
            setAreaSearchResults(finalResults);
          });

          setIsObjectAreaSearch(false);
          return; // <-- This is the most important part!
        }
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
                isSearched: false,
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
              // Optional: Add a temporary marker here to show the first corner
              return;
            }

            // We now have two STORED center coordinates: `firstCorner` and `snappedCoord`.
            // We must convert them to the VISUAL boundaries of the tiles they represent.

            // First corner tile's visual boundaries (lng + 1 for visual space)
            const firstVisualBL = {
              lat: firstCorner.lat,
              lng: firstCorner.lng,
            };
            const firstVisualTR = {
              lat: firstCorner.lat,
              lng: firstCorner.lng,
            };

            // Second corner tile's visual boundaries
            const secondVisualBL = {
              lat: snappedCoord.lat,
              lng: snappedCoord.lng,
            };
            const secondVisualTR = {
              lat: snappedCoord.lat,
              lng: snappedCoord.lng,
            };

            // Now, find the min/max of these VISUAL boundaries to create the final box.
            const finalMinLat = Math.min(firstVisualBL.lat, secondVisualBL.lat);
            const finalMaxLat = Math.max(firstVisualTR.lat, secondVisualTR.lat);
            const finalMinLng = Math.min(firstVisualBL.lng, secondVisualBL.lng);
            const finalMaxLng = Math.max(firstVisualTR.lng, secondVisualTR.lng);

            const radiusPayload = {
              bottomLeft: { lat: finalMinLat, lng: finalMinLng },
              topRight: { lat: finalMaxLat, lng: finalMaxLng },
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
        keepBuffer: 100,
        updateWhenIdle: true,
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
        keepBuffer: 100,
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
        keepBuffer: 100,
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
        onDeleteObjectLocation={handleDeleteObjectLocation}
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
        clipboard={clipboard}
        onCopyTarget={handleCopyTarget}
        onPasteTarget={handlePasteTarget}
        // ADD: Pass the new list handlers to the panel
        onCopyTargetList={handleCopyTargetList}
        onPasteTargetList={handlePasteTargetList}
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
        crs={MAP_OPTIONS.crs}
        bounds={MAP_BOUNDS}
        id="map"
        zoom={z ? parseInt(z, 10) : MAP_OPTIONS.minZoom}
        maxBounds={MAP_OPTIONS.maxBounds}
        zoomSnap={MAP_OPTIONS.zoomSnap}
        zoomControl={false}
        dragging={true}
        center={[3288, 3023]}
      >
        <MapClickHandler disabled={false} />

        {showGrids && <ChunkGridLayer />}
        <GridLayer />
        <CustomMapPanes />
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
              bounds={MAP_BOUNDS}
            />
          ))}
        </>
        <MapAreaFlyToHandler selectedArea={selectedArea} />
        <StepSnapHandler
          questJson={questJson}
          selectedStep={selectedStep}
          targetIndex={targetIndex}
          targetType={targetType}
          onFloorChange={handleFloorChange}
        />
        <TargetFlyToHandler
          questJson={questJson}
          selectedStep={selectedStep}
          targetType={targetType}
          targetIndex={targetIndex}
          floor={floor} // <-- PASS THE PROP HERE
          onFloorChange={handleFloorChange}
        />
        <NpcFlyToHandler
          highlightedNpc={highlightedNpc}
          onFloorChange={handleFloorChange}
        />
        <ObjectFlyToHandler highlightedObject={highlightedObject} />
        <SelectedObjectFlyToHandler selectedObject={selectedObjectFromSearch} />
        <SelectionHighlightLayer
          geometry={selectionGeometry}
          pane="selectionPane"
        />
        <SelectionHighlightLayer
          geometry={highlightGeometry}
          pane="highlightPane"
        />
        <MapUIOverlay />
      </MapContainer>
    </div>
  );
};

export default App;
